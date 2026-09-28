"use client";

import { useState, useEffect } from "react";
import { X, CheckCircle2, XCircle, ShieldCheck, FileText } from "lucide-react";
import { toast } from "sonner";
import {
  DirectPurchaseRequest,
  EXECUTIVE_ROLE_LABELS,
  ExecutiveApprover,
} from "@/lib/direct-purchase-types";
import { useDirectPurchase } from "@/hooks/useDirectPurchase";
import { notifyDirectPurchase } from "@/lib/direct-purchase-notify";
import { SaudiRiyalIcon } from "@/components/SaudiRiyalIcon";

interface ExecutiveApprovalModalProps {
  request: DirectPurchaseRequest;
  /** The roster row of the person signing — settles their recorded capacity. */
  approver: ExecutiveApprover;
  isOpen: boolean;
  onClose: () => void;
}

export function ExecutiveApprovalModal({
  request,
  approver,
  isOpen,
  onClose,
}: ExecutiveApprovalModalProps) {
  const { updateRequest, isUpdating } = useDirectPurchase();
  const [actionType, setActionType] = useState<"approve" | "reject">("approve");
  const [notes, setNotes] = useState("");
  const [declared, setDeclared] = useState(false);

  useEffect(() => {
    document.body.style.overflow = isOpen ? "hidden" : "unset";
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const roleLabel = EXECUTIVE_ROLE_LABELS[approver.role] || approver.role;
  const wentToCommittee = !!request.committee_completed_at;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!declared) {
      toast.error("يرجى تفعيل الإقرار قبل توقيع الاعتماد");
      return;
    }
    if (actionType === "reject" && !notes.trim()) {
      toast.error("يرجى كتابة أسباب عدم الاعتماد");
      return;
    }

    const declaration =
      actionType === "approve"
        ? `أقر أنا ${approver.name} بصفتي ${roleLabel} بالاطلاع على كامل ملف طلب الشراء المباشر رقم ${request.request_number} ومرفقاته وإجراءات دراسته، وأعتمده.`
        : `أقر أنا ${approver.name} بصفتي ${roleLabel} بالاطلاع على كامل ملف طلب الشراء المباشر رقم ${request.request_number}، وقررت عدم اعتماده للأسباب المدوّنة أدناه.`;

    try {
      await updateRequest({
        id: request.id,
        updates: {
          executive_approver_name: approver.name,
          executive_approver_email: approver.email,
          executive_approver_role: approver.role,
          executive_decision: actionType === "approve" ? "approved" : "rejected",
          executive_approval_date: new Date().toISOString(),
          executive_declaration: declaration,
          executive_notes: notes.trim() || undefined,
          // Approval doesn't end the request: مدير المشتريات closes it once the
          // file is complete. A rejection ends it here.
          status: actionType === "approve" ? "pending_closure" : "rejected",
        },
      });

      if (actionType === "approve") {
        toast.success("تم توقيع الاعتماد — أُحيل الطلب إلى مدير المشتريات للإقفال");
        notifyDirectPurchase(request.id, "executive_approved");
      } else {
        toast.error("تم رفض الطلب وإشعار الجهات المعنية");
        notifyDirectPurchase(request.id, "executive_rejected");
      }

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
            <div className="w-10 h-10 bg-[#0D4435]/10 rounded-xl flex items-center justify-center text-[#0D4435]">
              <ShieldCheck size={20} />
            </div>
            <div>
              <h2 className="text-lg font-black text-[#0D4435]">اعتماد المدير العام التنفيذي</h2>
              <p className="text-xs font-bold text-gray-500">
                {request.request_number} — بصفتك {roleLabel}
              </p>
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
          <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 space-y-1.5 text-xs">
            <p className="font-bold text-gray-500">
              عنوان الطلب:{" "}
              <span className="font-black text-gray-800 break-words">{request.request_title}</span>
            </p>
            {request.pr_number && (
              <p className="font-bold text-gray-500">
                رقم طلب الشراء (PR):{" "}
                <span className="font-black text-[#0D4435] font-mono" dir="ltr">
                  {request.pr_number}
                </span>
              </p>
            )}
            <p className="font-bold text-gray-500">
              الإدارة الطالبة: <span className="font-black text-gray-800">{request.department}</span>
            </p>
            <p className="font-bold text-gray-500">
              المورد المقترح: <span className="font-black text-gray-800">{request.vendor_name}</span>
            </p>
            <p className="font-bold text-gray-500 flex items-center gap-1">
              التكلفة التقديرية:{" "}
              <span className="font-black text-[#0D4435]">
                {Number(request.estimated_cost).toLocaleString()}
              </span>{" "}
              <SaudiRiyalIcon size={14} className="text-[#C5A059]" />
            </p>
          </div>

          <div className="bg-[#0D4435]/5 border border-[#0D4435]/15 rounded-2xl p-4 text-xs font-bold text-[#0D4435] leading-relaxed flex gap-2.5">
            <FileText size={16} className="shrink-0 mt-0.5 text-[#C5A059]" />
            <span>
              {wentToCommittee
                ? "دُرس هذا الطلب من لجنة الشراء المباشر وأقرّه أعضاؤها. راجع المحضر وتدقيق أخصائي المشتريات في صفحة الطلب قبل التوقيع."
                : "لم يُحَل هذا الطلب للجنة لأن تكلفته دون حد الخمسين ألف ريال. راجع تدقيق أخصائي المشتريات ومرفقات الطلب قبل التوقيع."}
            </span>
          </div>

          <div className="space-y-3">
            <label className="text-xs font-bold text-gray-700 block">قرار الاعتماد:</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setActionType("approve")}
                className={`py-3 px-4 rounded-xl border text-xs font-black flex items-center justify-center gap-2 transition-all ${
                  actionType === "approve"
                    ? "bg-emerald-50 border-emerald-500 text-emerald-800 shadow-sm"
                    : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"
                }`}
              >
                <CheckCircle2 size={16} className={actionType === "approve" ? "text-emerald-600" : ""} />{" "}
                اعتماد الطلب
              </button>
              <button
                type="button"
                onClick={() => setActionType("reject")}
                className={`py-3 px-4 rounded-xl border text-xs font-black flex items-center justify-center gap-2 transition-all ${
                  actionType === "reject"
                    ? "bg-red-50 border-red-500 text-red-800 shadow-sm"
                    : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"
                }`}
              >
                <XCircle size={16} className={actionType === "reject" ? "text-red-600" : ""} /> عدم
                الاعتماد / رفض
              </button>
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-gray-700 block mb-1.5">
              {actionType === "reject" ? "أسباب عدم الاعتماد *" : "ملاحظات وتوجيهات (اختياري)"}
            </label>
            <textarea
              required={actionType === "reject"}
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="أي ملاحظات أو توجيهات تُدوَّن في التقرير النهائي..."
              className="w-full p-3 bg-white border border-gray-200 rounded-xl text-xs font-bold text-gray-900 outline-none focus:border-[#0D4435] resize-none"
            />
          </div>

          <label className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-2xl p-4 cursor-pointer">
            <input
              type="checkbox"
              checked={declared}
              onChange={(e) => setDeclared(e.target.checked)}
              className="mt-0.5 w-4 h-4 accent-[#0D4435] shrink-0"
            />
            <span className="text-[11px] font-bold text-amber-900 leading-relaxed">
              أقر بأنني اطّلعت على كامل ملف الطلب ومرفقاته وإجراءات دراسته، وأن هذا التوقيع يُعد
              اعتماداً نظامياً يُدوَّن باسمي وصفتي في التقرير النهائي.
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
              disabled={isUpdating || !declared}
              className={`h-10 px-6 rounded-xl font-black text-xs text-white transition-all shadow-md active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed ${
                actionType === "approve" ? "bg-[#0D4435] hover:bg-[#0a3529]" : "bg-red-600 hover:bg-red-700"
              }`}
            >
              {isUpdating ? "جارِ الحفظ..." : actionType === "approve" ? "توقيع الاعتماد" : "تأكيد الرفض"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
