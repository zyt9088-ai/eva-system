"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase/client";
import { useCurrentProfile } from "@/hooks/useCurrentProfile";
import { DirectPurchaseRequest, CommitteeMember } from "@/lib/direct-purchase-types";
import { toast } from "sonner";

export function useDirectPurchase() {
  const queryClient = useQueryClient();
  const { profile, isAdmin } = useCurrentProfile();

  // 1. Fetch Committee Members
  const { data: committee = [], isLoading: isCommitteeLoading } = useQuery<CommitteeMember[]>({
    queryKey: ["direct-purchase-committee"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("direct_purchase_committee")
        .select("*")
        .order("created_at", { ascending: true });
      if (error) {
        console.warn("Could not fetch committee:", error.message);
        return [];
      }
      return data || [];
    },
  });

  // 2. Fetch Direct Purchase Requests
  const { data: requests = [], isLoading: isRequestsLoading } = useQuery<DirectPurchaseRequest[]>({
    queryKey: ["direct-purchase-requests"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("direct_purchase_requests")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) {
        console.warn("Could not fetch direct purchase requests:", error.message);
        return [];
      }
      return (data || []) as DirectPurchaseRequest[];
    },
  });

  // 3. Create Request Mutation
  const createRequestMutation = useMutation({
    mutationFn: async (newReq: Partial<DirectPurchaseRequest>) => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      const year = new Date().getFullYear();
      const randomSuffix = Math.floor(1000 + Math.random() * 9000);
      const requestNumber = `DP-${year}-${randomSuffix}`;

      const finalRequesterEmail = profile?.email || user?.email || "";
      const finalRequesterName =
        profile?.fullName ||
        user?.user_metadata?.full_name ||
        user?.user_metadata?.name ||
        finalRequesterEmail.split("@")[0] ||
        "موظف";

      const payload = {
        ...newReq,
        request_number: requestNumber,
        created_by: profile?.id || user?.id || null,
        requester_name: finalRequesterName,
        requester_email: finalRequesterEmail,
        status: "pending_dept_manager",
      };

      const { data, error } = await supabase
        .from("direct_purchase_requests")
        .insert(payload)
        .select()
        .single();

      if (error) {
        console.error("Supabase insert error:", error);
        throw error;
      }
      return data;
    },
    onSuccess: (createdData: any) => {
      queryClient.invalidateQueries({ queryKey: ["direct-purchase-requests"] });
      toast.success("تم إرسال مبرر الشراء المباشر بنجاح وتحويله لمدير الإدارة للاعتماد");

      if (createdData?.id) {
        fetch("/api/notify-direct-purchase", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ requestId: createdData.id, action: "created" }),
        }).catch((err) => console.warn("Failed to trigger email notification:", err));
      }
    },
    onError: (error: any) => {
      console.error("Create request error:", error);
      const errorMsg = error?.message || error?.details || error?.hint || JSON.stringify(error);
      if (errorMsg.includes("relation") || errorMsg.includes("does not exist")) {
        toast.error("جدول قاعدة البيانات غير موجود. يرجى تشغيل ملف migration في Supabase SQL Editor.");
      } else {
        toast.error("حدث خطأ أثناء إنشاء الطلب: " + errorMsg);
      }
    },
  });

  // 4. Update Request Mutation
  const updateRequestMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<DirectPurchaseRequest> }) => {
      const { data, error } = await supabase
        .from("direct_purchase_requests")
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["direct-purchase-requests"] });
      toast.success("تم تحديث حالة الطلب بنجاح");
    },
    onError: (error: any) => {
      console.error("Update request error:", error);
      toast.error("حدث خطأ أثناء تحديث الطلب: " + (error?.message || ""));
    },
  });

  // 5. Delete Request Mutation (Admin only)
  const deleteRequestMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("direct_purchase_requests").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["direct-purchase-requests"] });
      toast.success("تم حذف الطلب بنجاح");
    },
    onError: (error: any) => {
      console.error("Delete request error:", error);
      toast.error("حدث خطأ أثناء حذف الطلب");
    },
  });

  // 6. Committee Mutations
  const addCommitteeMemberMutation = useMutation({
    mutationFn: async (member: { name: string; email: string; role: string }) => {
      const { error } = await supabase.from("direct_purchase_committee").insert(member);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["direct-purchase-committee"] });
      toast.success("تمت إضافة عضو اللجنة بنجاح");
    },
    onError: (error: any) => {
      console.error("Add committee member error:", error);
      if (error?.code === "23505") {
        toast.error("هذا العضو مسجل مسبقاً في اللجنة");
      } else if (error?.code === "23514" || error?.message?.includes("check constraint")) {
        toast.error("قاعدة البيانات تمنع المسميات المخصصة. يرجى تنفيذ أمر فك القيد في Supabase SQL Editor.");
      } else {
        toast.error("حدث خطأ أثناء إضافة العضو: " + (error?.message || ""));
      }
    },
  });

  const updateCommitteeMemberMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: { role: string } }) => {
      const { error } = await supabase.from("direct_purchase_committee").update(updates).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["direct-purchase-committee"] });
      toast.success("تم تحديث منصب عضو اللجنة بنجاح");
    },
    onError: (error: any) => {
      console.error("Update committee member error:", error);
      toast.error("حدث خطأ أثناء تعديل عضو اللجنة: " + (error?.message || ""));
    },
  });

  const deleteCommitteeMemberMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("direct_purchase_committee").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["direct-purchase-committee"] });
      toast.success("تم حذف عضو اللجنة بنجاح");
    },
    onError: () => {
      toast.error("حدث خطأ أثناء حذف عضو اللجنة");
    },
  });

  return {
    requests,
    committee,
    isLoading: isRequestsLoading || isCommitteeLoading,
    createRequest: createRequestMutation.mutateAsync,
    updateRequest: updateRequestMutation.mutateAsync,
    deleteRequest: deleteRequestMutation.mutateAsync,
    addCommitteeMember: addCommitteeMemberMutation.mutateAsync,
    updateCommitteeMember: updateCommitteeMemberMutation.mutateAsync,
    deleteCommitteeMember: deleteCommitteeMemberMutation.mutateAsync,
    isCreating: createRequestMutation.isPending,
    isUpdating: updateRequestMutation.isPending,
  };
}
