"use client";

import { useState, useEffect } from "react";
import { X, CheckCircle2, XCircle, ShieldCheck, RotateCcw, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { DirectPurchaseRequest } from "@/lib/direct-purchase-types";
import { useDirectPurchase } from "@/hooks/useDirectPurchase";
import { useCurrentProfile } from "@/hooks/useCurrentProfile";
import { SaudiRiyalIcon } from "@/components/SaudiRiyalIcon";

interface DeptManagerApprovalModalProps {
  request: DirectPurchaseRequest;
  isOpen: boolean;
  onClose: () => void;
  defaultAction?: "approve" | "return" | "reject";
}

export function DeptManagerApprovalModal({
  request,
  isOpen,
  onClose,
  defaultAction = "approve",
}: DeptManagerApprovalModalProps) {
  const { updateRequest, isUpdating } = useDirectPurchase();
  const { profile } = useCurrentProfile();
  const [isAgreed, setIsAgreed] = useState(false);
  const [notes, setNotes] = useState("");
  const [actionType, setActionType] = useState<"approve" | "return" | "reject">(defaultAction);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (actionType === "approve" && !isAgreed) {
      toast.error("يرجى الإقرار بصحة المبررات والموافقة للمتابعة");
      return;
    }

    if (actionType === "return" && !notes.trim()) {
      toast.error("يرجى توضيح ملاحظات وتوجيهات التعديل المطلوبة من صاحب الطلب");
      return;
    }

    if (actionType === "reject" && !notes.trim()) {
      toast.error("يرجى كتابة أسباب وتبريرات رفض الطلب");
      return;
    }

    try {
      if (actionType === "approve") {
        await updateRequest({
          id: request.id,
          updates: {
            dept_manager_approval_status: "approved",
            dept_manager_approval_date: new Date().toISOString(),
            dept_manager_declaration: `أقر أنا ${profile?.fullName || profile?.email} بصفتي مدير الإدارة الطالبة بصحة مبررات الشراء المباشر والموافقة على رفع الطلب للمشتريات.`,
            dept_manager_notes: notes.trim() || undefined,
            status: "pending_procurement_assign",
          },
        });
        toast.success("تم اعتماد وموافقة الطلب بنجاح وتحويله لإدارة المشتريات");

        fetch("/api/notify-direct-purchase", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ requestId: request.id, action: "dept_manager_approved" }),
        }).catch((err) => console.warn("Notification error:", err));

      } else if (actionType === "return") {
        await updateRequest({
          id: request.id,
          updates: {
            dept_manager_approval_status: "returned",
            dept_manager_approval_date: new Date().toISOString(),
            dept_manager_notes: notes.trim(),
            status: "returned_to_requester",
          },
        });
        toast.info("تم إرجاع الطلب لصاحب الطلب لإجراء التعديلات المطلوبة");

        fetch("/api/notify-direct-purchase", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ requestId: request.id, action: "dept_manager_returned" }),
        }).catch((err) => console.warn("Notification error:", err));

      } else if (actionType === "reject") {
        await updateRequest({
          id: request.id,
          updates: {
            dept_manager_approval_status: "rejected",
            dept_manager_approval_date: new Date().toISOString(),
            dept_manager_notes: notes.trim(),
            status: "dept_manager_rejected",
          },
        });
        toast.error("تم رفض الطلب وتوثيق تبريرات الرفض");

        fetch("/api/notify-direct-purchase", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ requestId: request.id, action: "dept_manager_rejected" }),
        }).catch((err) => console.warn("Notification error:", err));
      }

      onClose();
    } catch (err) {
      // handled
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto" dir="rtl">
      <div className="bg-white rounded-3xl max-w-xl w-full flex flex-col shadow-2xl border border-gray-100 overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-200">

        <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#0D4435]/10 rounded-xl flex items-center justify-center text-[#0D4435]">
              <ShieldCheck size={20} />
            </div>
            <div>
              <h2 className="text-lg font-black text-[#0D4435]">قرار مدير الإدارة الطالبة</h2>
              <p className="text-xs font-bold text-gray-500">{request.request_number} — {request.request_title}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-colors cursor-pointer">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 space-y-2 text-xs">
            <p className="font-bold text-gray-500">صاحب الطلب: <span className="font-black text-gray-800">{request.requester_name} ({request.department})</span></p>
            {request.pr_number && (
              <p className="font-bold text-gray-500">رقم طلب الشراء (PR): <span className="font-black text-[#0D4435] font-mono" dir="ltr">{request.pr_number}</span></p>
            )}
            <p className="font-bold text-gray-500 flex items-center gap-1">التكلفة التقديرية: <span className="font-black text-[#0D4435]">{Number(request.estimated_cost).toLocaleString()}</span> <SaudiRiyalIcon size={14} className="text-[#C5A059]" /></p>
            <p className="font-bold text-gray-500">المورد المقترح: <span className="font-black text-gray-800">{request.vendor_name}</span></p>
          </div>

          <div className="space-y-3">
            <label className="text-xs font-bold text-gray-700 block">حدد الإجراء المطلوب:</label>
            <div className="grid grid-cols-3 gap-2.5">
              <button
                type="button"
                onClick={() => setActionType("approve")}
                className={`py-3 px-3 rounded-xl border text-xs font-black flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  actionType === "approve"
                    ? "bg-emerald-50 border-emerald-500 text-emerald-800 shadow-sm ring-1 ring-emerald-500"
                    : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"
                }`}
              >
                <CheckCircle2 size={18} className={actionType === "approve" ? "text-emerald-600" : "text-gray-400"} />
                <span>موافقة واعتماد</span>
              </button>

              <button
                type="button"
                onClick={() => setActionType("return")}
                className={`py-3 px-3 rounded-xl border text-xs font-black flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  actionType === "return"
                    ? "bg-amber-50 border-amber-500 text-amber-800 shadow-sm ring-1 ring-amber-500"
                    : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"
                }`}
              >
                <RotateCcw size={18} className={actionType === "return" ? "text-amber-600" : "text-gray-400"} />
                <span>إرجاع للتعديل</span>
              </button>

              <button
                type="button"
                onClick={() => setActionType("reject")}
                className={`py-3 px-3 rounded-xl border text-xs font-black flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  actionType === "reject"
                    ? "bg-red-50 border-red-500 text-red-800 shadow-sm ring-1 ring-red-500"
                    : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"
                }`}
              >
                <XCircle size={18} className={actionType === "reject" ? "text-red-600" : "text-gray-400"} />
                <span>رفض الطلب</span>
              </button>
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-gray-700 block mb-1.5">
              {actionType === "approve"
                ? "ملاحظات إضافية (اختياري)"
                : actionType === "return"
                ? "توجيهات وملاحظات التعديل لصاحب الطلب *"
                : "أسباب وتبريرات الرفض *"}
            </label>
            <textarea
              required={actionType !== "approve"}
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={
                actionType === "approve"
                  ? "أي توجيهات أو ملاحظات لإدارة المشتريات..."
                  : actionType === "return"
                  ? "يرجى توضيح النقاط المطلوب تعديلها أو المستندات المطلوب إضافتها من الموظف..."
                  : "يرجى كتابة أسباب عدم الموافقة والمسوغات الإدارية للرفض..."
              }
              className="w-full p-3 bg-white border border-gray-200 rounded-xl text-xs font-bold text-gray-900 outline-none focus:border-[#0D4435] focus:ring-1 focus:ring-[#0D4435] transition-all resize-none"
            />
          </div>

          {actionType === "approve" && (
            <label className="flex items-start gap-3 p-3.5 bg-amber-50/70 border border-amber-200 rounded-xl cursor-pointer">
              <input
                type="checkbox"
                checked={isAgreed}
                onChange={(e) => setIsAgreed(e.target.checked)}
                className="mt-0.5 w-4 h-4 text-[#0D4435] rounded border-gray-300 focus:ring-[#0D4435]"
              />
              <span className="text-xs font-bold text-amber-900 leading-relaxed">
                أقر بصفتي مدير الإدارة الطالبة بصحة ونظامية مبررات الشراء المباشر المرفوعة أعلاه ومسؤولية الإدارة عنها.
              </span>
            </label>
          )}

          <div className="pt-3 border-t border-gray-100 flex items-center justify-end gap-3">
            <button type="button" onClick={onClose} className="h-10 px-5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-bold text-xs cursor-pointer">
              إلغاء
            </button>
            <button
              type="submit"
              disabled={isUpdating}
              className={`h-10 px-6 rounded-xl font-black text-xs text-white transition-all shadow-md active:scale-95 disabled:opacity-50 cursor-pointer ${
                actionType === "approve"
                  ? "bg-[#0D4435] hover:bg-[#0a3529]"
                  : actionType === "return"
                  ? "bg-amber-600 hover:bg-amber-700"
                  : "bg-red-600 hover:bg-red-700"
              }`}
            >
              {isUpdating
                ? "جارِ الحفظ..."
                : actionType === "approve"
                ? "اعتماد وإرسال للمشتريات"
                : actionType === "return"
                ? "إرجاع الطلب للموظف"
                : "تأكيد رفض الطلب"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
