"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase/client";
import { toast } from "sonner";
import { mapEvaluationRow } from "@/lib/evaluation-utils";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { useCurrentProfile } from "@/hooks/useCurrentProfile";

export interface Evaluation {
  id?: string;
  prNumber: string;
  projectName: string;
  deadline: string;
  vendors: any[];
  type: string;
  evaluatedItems: string[];
  evfCriteria: any[];
  evaluators: any[];
  status: string;
  itemEvaluations?: any;
  createdAt?: string;
  date?: string;
}

const notifyEvaluators = (evaluationId: string) => {
  fetch("/api/notify-evaluators", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ evaluationId }),
  }).catch(() => {
    // Email delivery is best-effort — never block the evaluation save on it.
  });
};

const VENDOR_ATTACHMENTS_BUCKET = "vendor-attachments";

// Inserted one vendor at a time (not bulk) so each row's id is known
// immediately for the attachment upload. A vendor keeps its existing
// attachmentPath untouched when no new file is picked (the path lives
// independently of the vendor row's id, so it survives edit's
// delete+reinsert cycle); a newly picked File always wins.
async function insertVendorsWithAttachments(evalId: string, vendors: any[]) {
  for (const v of vendors || []) {
    const { data: vendorRow, error: vendorError } = await supabase
      .from("vendors")
      .insert({
        evaluation_id: evalId,
        name: v.name,
        attachment_name: v.attachmentName || null,
        attachment_path: v.attachmentFile ? null : v.attachmentPath || null,
      })
      .select()
      .single();
    if (vendorError) throw vendorError;

    if (v.attachmentFile) {
      const path = `${evalId}/${crypto.randomUUID()}.pdf`;
      const { error: uploadError } = await supabase.storage
        .from(VENDOR_ATTACHMENTS_BUCKET)
        .upload(path, v.attachmentFile, { contentType: "application/pdf" });
      if (uploadError) throw uploadError;

      const { error: pathError } = await supabase
        .from("vendors")
        .update({ attachment_path: path })
        .eq("id", vendorRow.id);
      if (pathError) throw pathError;
    }
  }
}

export function useEvaluations() {
  const queryClient = useQueryClient();
  const confirm = useConfirm();
  const { profile, isAdmin, isLoading: profileLoading } = useCurrentProfile();

  const { data: rawEvaluations = [], isLoading } = useQuery({
    queryKey: ["evaluations"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("evaluations")
        .select(`
          *,
          vendors (*),
          evaluators (*),
          evf_criteria (*),
          evaluated_items (*),
          vendor_scores (*)
        `)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching evaluations:", error);
        toast.error("فشل في جلب البيانات من قاعدة البيانات");
        return [];
      }

      return data.map(mapEvaluationRow);
    },
  });

  // RLS still lets a row through for a specialist who's merely listed as an
  // evaluator on someone else's request (needed for /my-tasks to work for
  // any role) — but that shouldn't clutter their own request-management
  // list here. Isolate by creator on top of RLS: admin sees everything,
  // specialist sees only what they created.
  const evaluations = !profile
    ? []
    : isAdmin
      ? rawEvaluations
      : rawEvaluations.filter((ev: any) => ev.createdBy === profile.id);

  // Lookup list for "created by" display + the admin-only creator filter.
  // RLS on `profiles` only lets a non-admin read their own row, so this
  // naturally comes back empty/self-only for specialists — harmless, since
  // only admins have a reason to see who created each request.
  const { data: creators = [] } = useQuery({
    queryKey: ["creators"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, email, full_name, role")
        .in("role", ["admin", "specialist"])
        .order("full_name");
      if (error) return [];
      return data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async (newEval: Evaluation) => {
      // Requests are now isolated by owner in RLS (specialists only see
      // their own), so the creator's id must be stamped on every insert.
      const {
        data: { user },
      } = await supabase.auth.getUser();

      // 1. Insert Evaluation
      const { data: evData, error: evError } = await supabase
        .from("evaluations")
        .insert({
          pr_number: newEval.prNumber,
          project_name: newEval.projectName,
          deadline: newEval.deadline,
          type: newEval.type,
          status: newEval.status || "قيد التجهيز",
          created_by: user?.id,
        })
        .select()
        .single();

      if (evError) throw evError;

      const evalId = evData.id;

      // 2. Insert Vendors (+ upload any attached PDFs)
      await insertVendorsWithAttachments(evalId, newEval.vendors);

      // 3. Insert Evaluators
      if (newEval.evaluators?.length > 0) {
        await supabase.from("evaluators").insert(
          newEval.evaluators.map((e) => ({
            evaluation_id: evalId,
            name: e.name,
            email: e.email,
            is_pm: e.isPM || false,
          }))
        );
      }

      // 4. Insert Criteria / Items
      if (newEval.type === "EVF" && newEval.evfCriteria?.length > 0) {
        await supabase.from("evf_criteria").insert(
          newEval.evfCriteria.map((c) => ({
            evaluation_id: evalId,
            title: c.title,
            weight: c.weight,
          }))
        );
      } else if (newEval.evaluatedItems?.length > 0) {
        await supabase.from("evaluated_items").insert(
          newEval.evaluatedItems.map((item) => ({
            evaluation_id: evalId,
            item_name: item,
          }))
        );
      }

      return evData;
    },
    onSuccess: (evData) => {
      queryClient.invalidateQueries({ queryKey: ["evaluations"] });
      toast.success("تم إنشاء طلب التقييم بنجاح في قاعدة البيانات");
      notifyEvaluators(evData.id);
    },
    onError: (error) => {
      console.error("Create error stringified:", JSON.stringify(error, null, 2), error);
      toast.error("حدث خطأ أثناء حفظ التقييم");
    },
  });

  const editMutation = useMutation({
    mutationFn: async (updatedEval: Evaluation) => {
      const evalId = updatedEval.id;
      if (!evalId) throw new Error("Missing evaluation id");

      // Editing a request always reactivates it for the evaluators: status
      // resets to "pending evaluation" and any previous submissions are
      // cleared, since the edited content invalidates prior evaluations.
      const { error: evError } = await supabase
        .from("evaluations")
        .update({
          pr_number: updatedEval.prNumber,
          project_name: updatedEval.projectName,
          deadline: updatedEval.deadline,
          status: "قيد التجهيز",
          item_evaluations: {},
        })
        .eq("id", evalId);
      if (evError) throw evError;

      // Vendors/evaluators/criteria/items are replaced wholesale to reflect
      // the edited lists (same shape the create flow inserts them in).
      await supabase.from("vendors").delete().eq("evaluation_id", evalId);
      await insertVendorsWithAttachments(evalId, updatedEval.vendors);

      await supabase.from("evaluators").delete().eq("evaluation_id", evalId);
      if (updatedEval.evaluators?.length > 0) {
        await supabase.from("evaluators").insert(
          updatedEval.evaluators.map((e) => ({
            evaluation_id: evalId,
            name: e.name,
            email: e.email,
            is_pm: e.isPM || false,
          }))
        );
      }

      if (updatedEval.type === "EVF") {
        await supabase.from("evf_criteria").delete().eq("evaluation_id", evalId);
        if (updatedEval.evfCriteria?.length > 0) {
          await supabase.from("evf_criteria").insert(
            updatedEval.evfCriteria.map((c) => ({
              evaluation_id: evalId,
              title: c.title,
              weight: c.weight,
            }))
          );
        }
      } else {
        await supabase.from("evaluated_items").delete().eq("evaluation_id", evalId);
        if (updatedEval.evaluatedItems?.length > 0) {
          await supabase.from("evaluated_items").insert(
            updatedEval.evaluatedItems.map((item) => ({
              evaluation_id: evalId,
              item_name: item,
            }))
          );
        }
      }
    },
    onSuccess: (_data, updatedEval) => {
      queryClient.invalidateQueries({ queryKey: ["evaluations"] });
      // We don't need a toast here because the page component handles it
      if (updatedEval.id) notifyEvaluators(updatedEval.id);
    },
    onError: (error) => {
      console.error("Edit error stringified:", JSON.stringify(error, null, 2), error);
      toast.error("حدث خطأ أثناء حفظ التقييم. تأكد من إضافة عمود item_evaluations في Supabase.");
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase
        .from("evaluations")
        .update({ status })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["evaluations"] });
      toast.success("تم تحديث حالة الطلب بنجاح");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("evaluations").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["evaluations"] });
      toast.success("تم حذف السجل بنجاح");
    },
  });

  // Manual "تذكير" trigger — reuses the same notify-evaluators endpoint the
  // create/edit flows call automatically, but only when the specialist
  // explicitly asks for it (used once evaluator email notifications are
  // fully activated).
  const remindMutation = useMutation({
    mutationFn: async (evaluationId: string) => {
      const res = await fetch("/api/notify-evaluators", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ evaluationId }),
      });
      if (!res.ok) throw new Error("remind failed");
    },
    onSuccess: () => toast.success("تم إرسال تذكير بالبريد للمقيّمين"),
    onError: () => toast.error("تعذّر إرسال التذكير — تأكد من إعداد البريد الإلكتروني"),
  });

  return {
    evaluations,
    creators,
    isLoaded: !isLoading && !profileLoading,
    saveEvaluation: (newEval: Evaluation, isEdit: boolean) => {
      if (isEdit) {
        editMutation.mutate(newEval);
      } else {
        createMutation.mutate(newEval);
      }
    },
    deleteEvaluation: async (id: string) => {
      const ok = await confirm({
        title: "حذف طلب التقييم",
        message: "هل أنت متأكد من حذف هذا السجل بشكل نهائي؟ سيتم حذف كل البيانات المرتبطة به.",
        confirmLabel: "حذف نهائي",
      });
      if (ok) deleteMutation.mutate(id);
    },
    updateStatus: (id: string, status: string) => {
      updateStatusMutation.mutate({ id, status });
    },
    remindEvaluator: (id: string) => {
      remindMutation.mutate(id);
    },
  };
}
