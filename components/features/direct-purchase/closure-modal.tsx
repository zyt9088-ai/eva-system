"use client";

import { useState, useEffect } from "react";
import { X, Lock, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { DirectPurchaseRequest, EXECUTIVE_ROLE_LABELS } from "@/lib/direct-purchase-types";
import { useDirectPurchase } from "@/hooks/useDirectPurchase";
import { useCurrentProfile } from "@/hooks/useCurrentProfile";
import { notifyDirectPurchase } from "@/lib/direct-purchase-notify";

interface ClosureModalProps {
  request: DirectPurchaseRequest;
  isOpen: boolean;
  onClose: () => void;
}

/**
 * The last step on every route: once the executive director has signed,
 * مدير المشتريات confirms the file is complete and closes the request.
 */
export function ClosureModal({ request, isOpen, onClose }: ClosureModalProps) {
  const { updateRequest, isUpdating } = useDirectPurchase();
  const { profile } = useCurrentProfile();
  const [notes, setNotes] = useState("");
  const [confirmed, setConfirmed] = useState(false);

  useEffect(() => {
    document.body.style.overflow = isOpen ? "hidden" : "unset";
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const executiveRoleLabel = request.executive_approver_role
    ? EXECUTIVE_ROLE_LABELS[request.executive_approver_role] || request.executive_approver_role
    : "المدير العام التنفيذي";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!confirmed) {
      toast.error("يرجى تأكيد اكتمال الطلب قبل الإقفال");
      return;
    }

    try {
      await updateRequest({
        id: request.id,
        updates: {
          closed_by_name: profile?.fullName || profile?.email || "مدير المشتريات",
          closed_by_email: profile?.email,
          closure_date: new Date().toISOString(),
          closure_notes: notes.trim() || undefined,
          status: "approved",
        },
      });

      toast.success("تم إقفال الطلب — اكتمل مسار الشراء المباشر");
      notifyDirectPurchase(request.id, "request_closed");
      onClose();
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
            <div className="w-10 h-10 bg-teal-100 rounded-xl flex items-center justify-center text-teal-700">
              <Lock size={20} />
            </div>
            <div>
              <h2 className="text-lg font-black text-[#0D4435]">إقفال الطلب</h2>
              <p className="text-xs font-bold text-gray-500">{request.request_number}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex gap-2.5">
            <CheckCircle2 size={16} className="shrink-0 mt-0.5 text-emerald-600" />
            <div className="text-[11px] font-bold text-emerald-900 leading-relaxed">
              اعتمد <span className="font-black">{request.executive_approver_name}</span> ({executiveRoleLabel})
              هذا الطلب
              {request.executive_approval_date && (
                <>
                  {" "}
                  بتاريخ{" "}
                  {new Date(request.executive_approval_date).toLocaleDateString("ar-SA")}
                </>
              )}
              . الإقفال يُنهي مسار الطلب ويثبّته في التقرير النهائي.
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-gray-700 block mb-1.5">
              ملاحظات الإقفال (اختياري)
            </label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="أي ملاحظة ختامية تُدوَّن في التقرير النهائي..."
              className="w-full p-3 bg-white border border-gray-200 rounded-xl text-xs font-bold text-gray-900 outline-none focus:border-[#0D4435] resize-none"
            />
          </div>

          <label className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-2xl p-4 cursor-pointer">
            <input
              type="checkbox"
              checked={confirmed}
              onChange={(e) => setConfirmed(e.target.checked)}
              className="mt-0.5 w-4 h-4 accent-[#0D4435] shrink-0"
            />
            <span className="text-[11px] font-bold text-amber-900 leading-relaxed">
              أؤكد اكتمال إجراءات الطلب ومستنداته، وأُقفله بصفتي مدير المشتريات.
            </span>
          </label>

          <div className="pt-3 border-t border-gray-100 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="h-10 px-5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-bold text-xs"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={isUpdating || !confirmed}
              className="h-10 px-6 rounded-xl font-black text-xs text-white bg-teal-700 hover:bg-teal-800 transition-all shadow-md active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isUpdating ? "جارِ الإقفال..." : "تأكيد الإقفال"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
