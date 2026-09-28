"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase/client";
import { toast } from "sonner";
import { mapEvaluationRow } from "@/lib/evaluation-utils";
import { cleanPastedText } from "@/lib/text-utils";
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

// Email delivery is best-effort — it never blocks the evaluation save — but a
// failure has to be visible. Resend answers a rejected send with `{ error }`
// rather than throwing, so silently ignoring the response used to leave the
// evaluators uninformed with nobody aware of it.
const notifyEvaluators = async (evaluationId: string) => {
  try {
    const res = await fetch("/api/notify-evaluators", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ evaluationId }),
    });
    const body = await res.json().catch(() => ({}));

    if (!res.ok || body?.success === false) {
      const failedAddresses = (body?.failures || [])
        .map((f: { email: string }) => f.email)
        .join("، ");
      console.warn("Evaluator notification problem:", body);
      toast.warning(
        failedAddresses
          ? `تعذّر إرسال الإشعار إلى: ${failedAddresses}`
          : body?.error || "تعذّر إرسال الإشعار للمقيّمين — راجع إعدادات البريد"
      );
      return;
    }

    if (body?.sent > 0) {
      toast.success(`تم إرسال إشعار التقييم إلى ${body.sent} مقيّم`);
    }
  } catch (err) {
    console.warn("Failed to trigger evaluator notification:", err);
    toast.warning("تعذّر الاتصال بخدمة البريد لإرسال إشعار المقيّمين");
  }
};

const VENDOR_ATTACHMENTS_BUCKET = "vendor-attachments";

// Inserted one vendor at a time (not bulk) so each row's id is known
// immediately for the attachment upload. A vendor keeps its existing
// attachmentPath untouched when no new file is picked (the path lives
// independently of the vendor row's id, so it survives edit's
// delete+reinsert cycle); a newly picked File always wins.
async function insertVendorsWithAttachments(evalId: string, vendors: any[]) {
  const attachmentFailures: Array<{ vendor: string; reason: string }> = [];

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

    if (!v.attachmentFile) continue;

    // storage-js drops the `contentType` option for a Blob body and lets the
    // bucket read the mime type off the multipart part instead, so the file is
    // re-wrapped under a fixed ASCII name: it pins application/pdf (the only
    // type the bucket allows) and keeps a non-Latin original filename out of
    // the multipart Content-Disposition header. The name shown to users lives
    // in attachment_name, so nothing is lost. Mirrors the same re-wrap in
    // lib/supabase/upload-with-progress.ts.
    const path = `${evalId}/${crypto.randomUUID()}.pdf`;
    const upload = new File([v.attachmentFile], "attachment.pdf", {
      type: "application/pdf",
    });

    const { error: uploadError } = await supabase.storage
      .from(VENDOR_ATTACHMENTS_BUCKET)
      .upload(path, upload);

    // A rejected PDF must not abandon the rest of the save. Throwing here used
    // to strand the evaluation with its evaluators uninserted and no
    // notification sent, while the vendor still showed the file name with no
    // openable path behind it. Collect the failure and carry on instead.
    if (uploadError) {
      console.error("Vendor attachment upload failed", { vendor: v.name, uploadError });
      attachmentFailures.push({
        vendor: v.name || "مورد بدون اسم",
        reason: uploadError.message || "سبب غير معروف",
      });
      continue;
    }

    const { error: pathError } = await supabase
      .from("vendors")
      .update({ attachment_path: path })
      .eq("id", vendorRow.id);

    if (pathError) {
      console.error("Vendor attachment path update failed", { vendor: v.name, pathError });
      attachmentFailures.push({
        vendor: v.name || "مورد بدون اسم",
        reason: pathError.message || "تعذّر ربط المرفق بالمورد",
      });
    }
  }

  return attachmentFailures;
}

/** Surfaces the real reason a PDF didn't make it, named per vendor. */
function reportAttachmentFailures(failures: Array<{ vendor: string; reason: string }>) {
  if (failures.length === 0) return;
  toast.error(
    `تعذّر رفع مرفق ${failures.length === 1 ? "المورد" : "الموردين"}: ${failures
      .map((f) => `${f.vendor} (${f.reason})`)
      .join("، ")}`,
    { duration: 10000 }
  );
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
          pr_number: cleanPastedText(newEval.prNumber),
          project_name: cleanPastedText(newEval.projectName),
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
      const attachmentFailures = await insertVendorsWithAttachments(evalId, newEval.vendors);

      // 3. Insert Evaluators — the error must be checked: an unnoticed failure
      // here saves the request with nobody assigned to it, so no notification
      // goes out and the task never appears in anyone's /my-tasks.
      if (newEval.evaluators?.length > 0) {
        const { error: evaluatorsError } = await supabase.from("evaluators").insert(
          newEval.evaluators.map((e) => ({
            evaluation_id: evalId,
            name: e.name,
            email: e.email,
            is_pm: e.isPM || false,
          }))
        );
        if (evaluatorsError) throw evaluatorsError;
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

      return { evData, attachmentFailures };
    },
    onSuccess: ({ evData, attachmentFailures }) => {
      queryClient.invalidateQueries({ queryKey: ["evaluations"] });
      toast.success("تم إنشاء طلب التقييم بنجاح في قاعدة البيانات");
      reportAttachmentFailures(attachmentFailures);
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
          pr_number: cleanPastedText(updatedEval.prNumber),
          project_name: cleanPastedText(updatedEval.projectName),
          deadline: updatedEval.deadline,
          status: "قيد التجهيز",
          item_evaluations: {},
        })
        .eq("id", evalId);
      if (evError) throw evError;

      // Vendors/evaluators/criteria/items are replaced wholesale to reflect
      // the edited lists (same shape the create flow inserts them in).
      await supabase.from("vendors").delete().eq("evaluation_id", evalId);
      const attachmentFailures = await insertVendorsWithAttachments(evalId, updatedEval.vendors);

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

      return { attachmentFailures };
    },
    onSuccess: ({ attachmentFailures }, updatedEval) => {
      queryClient.invalidateQueries({ queryKey: ["evaluations"] });
      // We don't need a toast here because the page component handles it
      reportAttachmentFailures(attachmentFailures);
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
      const body = await res.json().catch(() => ({}));

      // A 200 here doesn't mean the mail went out — the body carries the real
      // per-recipient outcome.
      if (!res.ok || body?.success === false) {
        const failedAddresses = (body?.failures || [])
          .map((f: { email: string }) => f.email)
          .join("، ");
        throw new Error(
          failedAddresses
            ? `تعذّر الإرسال إلى: ${failedAddresses}`
            : body?.error || "تعذّر إرسال التذكير"
        );
      }
      return body as { sent: number };
    },
    onSuccess: (body) => toast.success(`تم إرسال تذكير بالبريد إلى ${body?.sent ?? 0} مقيّم`),
    onError: (error: Error) =>
      toast.error(error?.message || "تعذّر إرسال التذكير — تأكد من إعداد البريد الإلكتروني"),
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
