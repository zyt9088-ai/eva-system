"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase/client";
import { toast } from "sonner";
import { mapEvaluationRow } from "@/lib/evaluation-utils";

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

export function useEvaluations() {
  const queryClient = useQueryClient();

  const { data: evaluations = [], isLoading } = useQuery({
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

  const createMutation = useMutation({
    mutationFn: async (newEval: Evaluation) => {
      // 1. Insert Evaluation
      const { data: evData, error: evError } = await supabase
        .from("evaluations")
        .insert({
          pr_number: newEval.prNumber,
          project_name: newEval.projectName,
          deadline: newEval.deadline,
          type: newEval.type,
          status: newEval.status || "قيد التجهيز",
        })
        .select()
        .single();

      if (evError) throw evError;

      const evalId = evData.id;

      // 2. Insert Vendors
      if (newEval.vendors?.length > 0) {
        await supabase.from("vendors").insert(
          newEval.vendors.map((v) => ({
            evaluation_id: evalId,
            name: v.name,
            attachment_name: v.attachmentName,
          }))
        );
      }

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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["evaluations"] });
      toast.success("تم إنشاء طلب التقييم بنجاح في قاعدة البيانات");
    },
    onError: (error) => {
      console.error("Create error stringified:", JSON.stringify(error, null, 2), error);
      toast.error("حدث خطأ أثناء حفظ التقييم");
    },
  });

  const editMutation = useMutation({
    mutationFn: async (updatedEval: Evaluation) => {
      const { error } = await supabase
        .from("evaluations")
        .update({
          status: updatedEval.status,
          item_evaluations: updatedEval.itemEvaluations,
        })
        .eq("id", updatedEval.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["evaluations"] });
      // We don't need a toast here because the page component handles it
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

  return {
    evaluations,
    isLoaded: !isLoading,
    saveEvaluation: (newEval: Evaluation, isEdit: boolean) => {
      if (isEdit) {
        editMutation.mutate(newEval);
      } else {
        createMutation.mutate(newEval);
      }
    },
    deleteEvaluation: (id: string) => {
      if (window.confirm("هل أنت متأكد من حذف هذا السجل بشكل نهائي؟ (سيتم حذف كل البيانات المرتبطة به)")) {
        deleteMutation.mutate(id);
      }
    },
    updateStatus: (id: string, status: string) => {
      updateStatusMutation.mutate({ id, status });
    },
  };
}
