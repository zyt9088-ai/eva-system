"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase/client";
import { useCurrentProfile } from "@/hooks/useCurrentProfile";
import { DirectPurchaseRequest, CommitteeMember } from "@/lib/direct-purchase-types";
import { uploadFileWithProgress } from "@/lib/supabase/upload-with-progress";
import { notifyDirectPurchase } from "@/lib/direct-purchase-notify";
import { toast } from "sonner";

const DIRECT_PURCHASE_ATTACHMENTS_BUCKET = "direct-purchase-attachments";

/** Called with the file's index in the passed `attachmentFiles` array, 0–100. */
export type AttachmentProgressHandler = (fileIndex: number, percent: number) => void;


// Supporting PDFs live in storage, not in the row: `attachments` only keeps
// [{ name, size, path }]. The path is "{request_id}/{uuid}.pdf", so the RLS
// policies on storage.objects can resolve the owning request from the key.
async function uploadAttachments(
  requestId: string,
  files: File[],
  onProgress?: AttachmentProgressHandler
) {
  const uploaded: Array<{ name: string; size: number; path: string }> = [];
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const path = `${requestId}/${crypto.randomUUID()}.pdf`;
    onProgress?.(i, 0);
    await uploadFileWithProgress(DIRECT_PURCHASE_ATTACHMENTS_BUCKET, path, file, (percent) =>
      onProgress?.(i, percent)
    );
    uploaded.push({ name: file.name, size: file.size, path });
  }
  return uploaded;
}

// Files dropped while editing are removed from storage too, so the bucket
// doesn't accumulate orphans. Best-effort — never fail a save over it.
async function removeAttachments(paths: string[]) {
  if (paths.length === 0) return;
  try {
    await supabase.storage.from(DIRECT_PURCHASE_ATTACHMENTS_BUCKET).remove(paths);
  } catch (err) {
    console.warn("Could not remove dropped attachments:", err);
  }
}

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
    mutationFn: async ({
      attachmentFiles = [],
      onUploadProgress,
      ...newReq
    }: Partial<DirectPurchaseRequest> & {
      attachmentFiles?: File[];
      onUploadProgress?: AttachmentProgressHandler;
    }) => {
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

      // The row has to exist first: its id is the storage folder the RLS
      // policies read the ownership from. A failed upload must not undo the
      // request itself — the row is already saved, and the approver still has
      // to be told about it — so the failure is reported and the flow carries
      // on without the attachments.
      if (attachmentFiles.length > 0) {
        try {
          const uploaded = await uploadAttachments(data.id, attachmentFiles, onUploadProgress);
          const { data: withAttachments, error: attachError } = await supabase
            .from("direct_purchase_requests")
            .update({ attachments: uploaded })
            .eq("id", data.id)
            .select()
            .single();
          if (attachError) throw attachError;
          return withAttachments;
        } catch (uploadError: unknown) {
          console.error("Attachment upload failed:", uploadError);
          toast.error("تم حفظ الطلب، لكن تعذّر رفع المرفقات — عدّل الطلب وأعد إرفاقها");
        }
      }

      return data;
    },
    onSuccess: (createdData: any) => {
      queryClient.invalidateQueries({ queryKey: ["direct-purchase-requests"] });
      toast.success("تم إرسال مبرر الشراء المباشر بنجاح وتحويله لمدير الإدارة للاعتماد");

      if (createdData?.id) {
        // Still fire-and-forget — a mail problem must never fail the save —
        // but a rejected send is now reported instead of vanishing, otherwise
        // the manager simply never hears about the request and nobody knows.
        notifyDirectPurchase(createdData.id, "created");
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
    mutationFn: async ({
      id,
      updates,
      attachmentFiles = [],
      removedPaths = [],
      onUploadProgress,
    }: {
      id: string;
      updates: Partial<DirectPurchaseRequest>;
      attachmentFiles?: File[];
      removedPaths?: string[];
      onUploadProgress?: AttachmentProgressHandler;
    }) => {
      // `updates.attachments` carries the kept ones; newly picked files are
      // uploaded here and appended so the caller never deals with storage.
      const finalUpdates = { ...updates };
      if (attachmentFiles.length > 0) {
        // As on create: a storage failure shouldn't throw away the rest of the
        // edit the user just made — save it, and say the files didn't go up.
        try {
          const uploaded = await uploadAttachments(id, attachmentFiles, onUploadProgress);
          finalUpdates.attachments = [...(updates.attachments || []), ...uploaded];
        } catch (uploadError: unknown) {
          console.error("Attachment upload failed:", uploadError);
          toast.error("تم حفظ التعديلات، لكن تعذّر رفع المرفقات الجديدة");
        }
      }

      const { data, error } = await supabase
        .from("direct_purchase_requests")
        .update({
          ...finalUpdates,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;

      await removeAttachments(removedPaths);
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

  // Nudges whoever the request is currently waiting on — the API resolves the
  // recipient from the request's status.
  const remindMutation = useMutation({
    mutationFn: async (requestId: string) => {
      const res = await fetch("/api/notify-direct-purchase", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestId, action: "reminder" }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body?.error || "remind failed");
      if (body?.success === false) throw new Error(body?.message || "لا يوجد مستلم للتذكير");
    },
    onSuccess: () => toast.success("تم إرسال تذكير بالبريد للمسؤول عن المرحلة الحالية"),
    onError: (error: Error) =>
      toast.error(error?.message || "تعذّر إرسال التذكير — تأكد من إعداد البريد الإلكتروني"),
  });

  return {
    requests,
    committee,
    isLoading: isRequestsLoading || isCommitteeLoading,
    createRequest: createRequestMutation.mutateAsync,
    updateRequest: updateRequestMutation.mutateAsync,
    deleteRequest: deleteRequestMutation.mutateAsync,
    remindRequest: (id: string) => remindMutation.mutate(id),
    addCommitteeMember: addCommitteeMemberMutation.mutateAsync,
    updateCommitteeMember: updateCommitteeMemberMutation.mutateAsync,
    deleteCommitteeMember: deleteCommitteeMemberMutation.mutateAsync,
    isCreating: createRequestMutation.isPending,
    isUpdating: updateRequestMutation.isPending,
  };
}
