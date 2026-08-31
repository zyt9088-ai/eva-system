"use client";

import { supabase } from "@/lib/supabase/client";
import { toast } from "sonner";

export const DIRECT_PURCHASE_ATTACHMENTS_BUCKET = "direct-purchase-attachments";

// Attachments live in a private bucket, so they're opened through a short-lived
// signed URL rather than a public link.
export const openDirectPurchaseAttachment = async (path: string) => {
  const { data, error } = await supabase.storage
    .from(DIRECT_PURCHASE_ATTACHMENTS_BUCKET)
    .createSignedUrl(path, 60);
  if (error || !data?.signedUrl) {
    toast.error("تعذّر فتح المرفق — تأكد من تسجيل دخولك بحساب مصرّح له");
    return;
  }
  window.open(data.signedUrl, "_blank");
};
