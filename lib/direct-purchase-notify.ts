"use client";

import { toast } from "sonner";

// Notifications never block a save, but a failure has to be visible: Resend
// answers a rejected send with `{ error }` rather than throwing, so without
// this a request moves stage, no mail goes out, and nothing says so.
export async function notifyDirectPurchase(requestId: string, action: string) {
  try {
    const res = await fetch("/api/notify-direct-purchase", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ requestId, action }),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok || body?.success === false) {
      console.warn("Direct purchase notification was not delivered:", body);
      toast.warning(body?.message || "تم حفظ الإجراء، لكن تعذّر إرسال إشعار البريد — راجع إعدادات البريد");
    }
  } catch (err) {
    console.warn("Failed to trigger email notification:", err);
    toast.warning("تم حفظ الإجراء، لكن تعذّر الاتصال بخدمة البريد لإرسال الإشعار");
  }
}
