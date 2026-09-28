"use client";

import { useState, useEffect } from "react";
import { X, RotateCcw, MessageSquare } from "lucide-react";
import { toast } from "sonner";
import { DirectPurchaseRequest } from "@/lib/direct-purchase-types";
import { useDirectPurchase } from "@/hooks/useDirectPurchase";
import { useCurrentProfile } from "@/hooks/useCurrentProfile";
import { notifyDirectPurchase } from "@/lib/direct-purchase-notify";

export type OversightMode = "return" | "note";

interface AdminOversightModalProps {
  request: DirectPurchaseRequest;
  mode: OversightMode;
  isOpen: boolean;
  onClose: () => void;
}

/**
 * مدير المشتريات keeps oversight over a request at every stage — including after
 * the executive director has signed it. This covers the two actions that aren't
 * tied to a stage: sending the file back to the requester, and recording a
 * note that shows up in the printed report.
 */
export function AdminOversightModal({ request, mode, isOpen, onClose }: AdminOversightModalProps) {
  const { updateRequest, isUpdating } = useDirectPurchase();
  const { profile } = useCurrentProfile();
  const [notes, setNotes] = useState("");

  useEffect(() => {
    document.body.style.overflow = isOpen ? "hidden" : "unset";
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  // The component stays mounted between openings, so the draft is cleared on
  // the way out — otherwise a cancelled return would reappear inside a note.
  const close = () => {
    setNotes("");
    onClose();
  };

  const isReturn = mode === "return";
  const signature = profile?.fullName || profile?.email || "مدير المشتريات";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!notes.trim()) {
      toast.error(isReturn ? "يرجى كتابة سبب الإرجاع" : "يرجى كتابة الملاحظة");
      return;
    }

    const stamp = new Date().toLocaleDateString("ar-SA");
    const entry = `[${stamp} — ${signature}] ${notes.trim()}`;
    // Notes accumulate rather than overwrite: the printed report should show the
    // whole oversight trail, not only the last remark.
    const merged = request.admin_notes ? `${request.admin_notes}\n${entry}` : entry;

    try {
      await updateRequest({
        id: request.id,
        updates: isReturn
          ? {
              admin_notes: merged,
              status: "returned_to_requester",
            }
          : { admin_notes: merged },
      });

      if (isReturn) {
        toast.success("تم إرجاع الطلب لصاحبه للتعديل وإشعاره بالبريد");
        notifyDirectPurchase(request.id, "returned_by_admin");
      } else {
        toast.success("تم تدوين الملاحظة في ملف الطلب");
      }

      close();
    } catch {
      // surfaced by the mutation's own error handler
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto"
      dir="rtl"
    >
      <div className="bg-white rounded-3xl max-w-lg w-full flex flex-col shadow-2xl border border-gray-100 overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-200">
        <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                isReturn ? "bg-amber-100 text-amber-700" : "bg-[#0D4435]/10 text-[#0D4435]"
              }`}
            >
              {isReturn ? <RotateCcw size={20} /> : <MessageSquare size={20} />}
            </div>
            <div>
              <h2 className="text-lg font-black text-[#0D4435]">
                {isReturn ? "إرجاع الطلب للتعديل" : "تدوين ملاحظة على الطلب"}
              </h2>
              <p className="text-xs font-bold text-gray-500">{request.request_number}</p>
            </div>
          </div>
          <button
            onClick={close}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {isReturn && !!request.executive_approval_date && (
            <div className="bg-red-50 border border-red-200 rounded-2xl p-4 text-[11px] font-bold text-red-800 leading-relaxed">
              هذا الطلب موقَّع من المدير العام التنفيذي. إرجاعه يعيده إلى صاحب الطلب ويُلغي
              موضعه في المسار — سيحتاج إلى استكمال الإجراءات من جديد.
            </div>
          )}

          <div>
            <label className="text-xs font-bold text-gray-700 block mb-1.5">
              {isReturn ? "سبب الإرجاع والتوجيهات المطلوبة *" : "نص الملاحظة *"}
            </label>
            <textarea
              required
              rows={4}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={
                isReturn
                  ? "وضّح لصاحب الطلب ما المطلوب تعديله..."
                  : "ملاحظة تُدوَّن باسمك وتاريخها في التقرير النهائي..."
              }
              className="w-full p-3 bg-white border border-gray-200 rounded-xl text-xs font-bold text-gray-900 outline-none focus:border-[#0D4435] resize-none"
            />
            <p className="mt-1.5 text-[11px] font-bold text-gray-400">
              تُدوَّن باسم: {signature}
            </p>
          </div>

          <div className="pt-3 border-t border-gray-100 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={close}
              className="h-10 px-5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-bold text-xs"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={isUpdating}
              className={`h-10 px-6 rounded-xl font-black text-xs text-white transition-all shadow-md active:scale-95 disabled:opacity-50 ${
                isReturn ? "bg-amber-600 hover:bg-amber-700" : "bg-[#0D4435] hover:bg-[#0a3529]"
              }`}
            >
              {isUpdating ? "جارِ الحفظ..." : isReturn ? "تأكيد الإرجاع" : "حفظ الملاحظة"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
