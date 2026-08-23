"use client";

import { useState, useEffect } from "react";
import { X, CheckCircle2, XCircle, RotateCcw, Ban, Send, Users, FileCheck2, AlertCircle, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { DirectPurchaseRequest, SPECIALIST_CHECKLIST_SECTIONS } from "@/lib/direct-purchase-types";
import { useDirectPurchase } from "@/hooks/useDirectPurchase";
import { useCurrentProfile } from "@/hooks/useCurrentProfile";
import { SaudiRiyalIcon } from "@/components/SaudiRiyalIcon";

interface SpecialistReviewModalProps {
  request: DirectPurchaseRequest;
  isOpen: boolean;
  onClose: () => void;
}

export function SpecialistReviewModal({ request, isOpen, onClose }: SpecialistReviewModalProps) {
  const { updateRequest, isUpdating } = useDirectPurchase();
  const { profile } = useCurrentProfile();

  // Checklist state: key -> { value: boolean | null, note: string }
  const [checklist, setChecklist] = useState<Record<string, { value: boolean | null; note: string }>>(() => {
    const initial: Record<string, { value: boolean | null; note: string }> = {};
    SPECIALIST_CHECKLIST_SECTIONS.forEach((section) => {
      section.items.forEach((item) => {
        const existing = request.specialist_checklist?.[item.key];
        initial[item.key] = {
          value: existing?.value !== undefined ? existing.value : null,
          note: existing?.note || "",
        };
      });
    });
    return initial;
  });

  const [isAgreed, setIsAgreed] = useState(false);
  const [generalNotes, setGeneralNotes] = useState(request.specialist_notes || "");

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

  const isHighValue = Number(request.estimated_cost) > 50000;

  const handleItemValueChange = (key: string, value: boolean) => {
    setChecklist((prev) => ({
      ...prev,
      [key]: {
        ...prev[key],
        value,
        note: value ? "" : prev[key]?.note || "",
      },
    }));
  };

  const handleItemNoteChange = (key: string, note: string) => {
    if (note.length > 250) return;
    setChecklist((prev) => ({
      ...prev,
      [key]: {
        ...prev[key],
        note,
      },
    }));
  };

  const validateChecklistComplete = () => {
    for (const section of SPECIALIST_CHECKLIST_SECTIONS) {
      for (const item of section.items) {
        const itemState = checklist[item.key];
        if (itemState?.value === null || itemState?.value === undefined) {
          toast.error(`يرجى تحديد الإجابة (نعم/لا) للبند: "${item.label}"`);
          return false;
        }
        if (itemState.value === false && (!itemState.note || !itemState.note.trim())) {
          toast.error(`يرجى كتابة سبب عدم الاستيفاء (بحد أقصى 250 حرف) للبند: "${item.label}"`);
          return false;
        }
      }
    }
    return true;
  };

  // Action: Complete
  const handleComplete = async () => {
    if (!validateChecklistComplete()) return;

    if (!isAgreed) {
      toast.error("يرجى تفعيل الإقرار بصحة نتائج المراجعة والمطابقة");
      return;
    }

    const nextStatus = isHighValue ? "pending_committee_secretary" : "pending_admin_approval";

    try {
      await updateRequest({
        id: request.id,
        updates: {
          specialist_checklist: checklist,
          specialist_declaration: `أقر أنا ${profile?.fullName || profile?.email} بصفتي أخصائي المشتريات بصحة واكتمال فحص ومطابقة بنود هذا الطلب ومرفقاته.`,
          specialist_review_date: new Date().toISOString(),
          specialist_action: "completed",
          specialist_notes: generalNotes.trim() || undefined,
          status: nextStatus,
        },
      });

      if (isHighValue) {
        toast.success("تم إكمال المراجعة وتحويل الطلب إلى أمين لجنة الشراء المباشر");
      } else {
        toast.success("تم إكمال المراجعة وتحويل الطلب إلى مدير المشتريات للاعتماد النهائي");
      }

      onClose();
    } catch (err) {
      // handled
    }
  };

  // Action: Refer to Committee (Manual)
  const handleReferToCommittee = async () => {
    if (!validateChecklistComplete()) return;

    try {
      await updateRequest({
        id: request.id,
        updates: {
          specialist_checklist: checklist,
          specialist_declaration: `أقر أنا ${profile?.fullName || profile?.email} بصفتي أخصائي المشتريات بإحالة الطلب للجنة الشراء المباشر للدراسة والتوصية.`,
          specialist_review_date: new Date().toISOString(),
          specialist_action: "referred_to_committee",
          specialist_notes: generalNotes.trim() || undefined,
          status: "pending_committee_secretary",
        },
      });

      toast.success("تمت إحالة الطلب إلى لجنة الشراء المباشر");
      onClose();
    } catch (err) {
      // handled
    }
  };

  // Action: Return to Requester
  const handleReturn = async () => {
    if (!generalNotes.trim()) {
      toast.error("يرجى كتابة ملاحظات وأسباب إعادة الطلب لصاحب الطلب");
      return;
    }

    try {
      await updateRequest({
        id: request.id,
        updates: {
          specialist_checklist: checklist,
          specialist_action: "returned",
          specialist_notes: generalNotes.trim(),
          status: "returned_to_requester",
        },
      });

      toast.warning("تمت إعادة الطلب لصاحب الطلب للتعديل والاستكمال");
      onClose();
    } catch (err) {
      // handled
    }
  };

  // Action: Close / Reject Request
  const handleClose = async () => {
    if (!generalNotes.trim()) {
      toast.error("يرجى كتابة أسباب إغلاق ورفض الطلب");
      return;
    }

    try {
      await updateRequest({
        id: request.id,
        updates: {
          specialist_checklist: checklist,
          specialist_action: "closed",
          specialist_notes: generalNotes.trim(),
          status: "closed_by_specialist",
        },
      });

      toast.error("تم إغلاق ورفض الطلب");
      onClose();
    } catch (err) {
      // handled
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto" dir="rtl">
      <div className="bg-white rounded-3xl max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-gray-100 overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-200">

        {/* Header */}
        <div className="px-8 py-5 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#0D4435]/10 rounded-xl flex items-center justify-center text-[#0D4435]">
              <FileCheck2 size={20} />
            </div>
            <div>
              <h2 className="text-lg font-black text-[#0D4435]">دراسة وتدقيق أخصائي المشتريات</h2>
              <p className="text-xs font-bold text-gray-500">{request.request_number} — {request.request_title}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-8 space-y-8">

          {/* Summary Box */}
          <div className="bg-gray-50 p-5 rounded-2xl border border-gray-100 grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
            <div>
              <p className="font-bold text-gray-400">صاحب الطلب:</p>
              <p className="font-black text-gray-800 mt-0.5">{request.requester_name}</p>
            </div>
            <div>
              <p className="font-bold text-gray-400">الإدارة الطالبة:</p>
              <p className="font-black text-gray-800 mt-0.5">{request.department}</p>
            </div>
            <div>
              <p className="font-bold text-gray-400">المورد المقترح:</p>
              <p className="font-black text-gray-800 mt-0.5">{request.vendor_name}</p>
            </div>
            <div>
              <p className="font-bold text-gray-400">التكلفة التقديرية:</p>
              <p className="font-black text-[#0D4435] mt-0.5 flex items-center gap-1">
                <span>{Number(request.estimated_cost).toLocaleString()}</span>
                <SaudiRiyalIcon size={14} className="text-[#C5A059]" />
              </p>
            </div>
          </div>

          {/* Checklist Sections */}
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black text-gray-900 flex items-center gap-2">
                <CheckCircle2 size={18} className="text-[#C5A059]" /> بنود التحقق والمطابقة النظامية (Checklist)
              </h3>
              <span className="text-xs font-bold text-gray-400">يجب فحص كافة البنود وتحديد (نعم / لا)</span>
            </div>

            {SPECIALIST_CHECKLIST_SECTIONS.map((section, sIdx) => (
              <div key={sIdx} className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
                <div className="bg-gray-50/80 px-5 py-3 border-b border-gray-200 font-black text-xs text-[#0D4435]">
                  {section.title}
                </div>
                <div className="divide-y divide-gray-100 p-2">
                  {section.items.map((item) => {
                    const itemState = checklist[item.key] || { value: null, note: "" };
                    const isNo = itemState.value === false;

                    return (
                      <div key={item.key} className="p-3.5 space-y-2.5 transition-colors hover:bg-gray-50/50 rounded-xl">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <span className="text-xs font-bold text-gray-800 flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#C5A059]"></span>
                            {item.label}
                          </span>
                          <div className="flex items-center gap-2 shrink-0">
                            <button
                              type="button"
                              onClick={() => handleItemValueChange(item.key, true)}
                              className={`px-4 py-1.5 rounded-lg text-xs font-black transition-all ${itemState.value === true
                                  ? "bg-emerald-600 text-white shadow-sm"
                                  : "bg-gray-100 text-gray-600 hover:bg-emerald-50 hover:text-emerald-700"
                                }`}
                            >
                              نعم
                            </button>
                            <button
                              type="button"
                              onClick={() => handleItemValueChange(item.key, false)}
                              className={`px-4 py-1.5 rounded-lg text-xs font-black transition-all ${itemState.value === false
                                  ? "bg-red-600 text-white shadow-sm"
                                  : "bg-gray-100 text-gray-600 hover:bg-red-50 hover:text-red-700"
                                }`}
                            >
                              لا
                            </button>
                          </div>
                        </div>

                        {/* Note box when 'No' is selected */}
                        {isNo && (
                          <div className="bg-red-50/50 p-3 rounded-xl border border-red-100 animate-in fade-in duration-150">
                            <div className="flex justify-between items-center mb-1">
                              <label className="text-[11px] font-black text-red-700 flex items-center gap-1">
                                <AlertCircle size={12} /> سبب عدم الاستيفاء أو الملاحظة * (إجباري)
                              </label>
                              <span className="text-[10px] font-bold text-red-400">{itemState.note.length} / 250 حرف</span>
                            </div>
                            <input
                              type="text"
                              required
                              maxLength={250}
                              value={itemState.note}
                              onChange={(e) => handleItemNoteChange(item.key, e.target.value)}
                              placeholder="اكتب الملاحظة وسبب عدم الاستيفاء..."
                              className="w-full h-9 px-3 bg-white border border-red-200 rounded-lg text-xs font-bold text-gray-900 outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500"
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* General Notes */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-700 block">ملاحظات عامة وتوجيهات الأخصائي</label>
            <textarea
              rows={3}
              value={generalNotes}
              onChange={(e) => setGeneralNotes(e.target.value)}
              placeholder="أي ملاحظات عامة حول التقرير أو التوصية أو أسباب الإرجاع/الإغلاق..."
              className="w-full p-3.5 bg-white border border-gray-200 rounded-2xl text-xs font-bold text-gray-900 outline-none focus:border-[#0D4435] focus:ring-1 focus:ring-[#0D4435] transition-all resize-none"
            />
          </div>

          {/* Specialist Declaration */}
          <label className="flex items-start gap-3 p-4 bg-[#0D4435]/5 border border-[#0D4435]/15 rounded-2xl cursor-pointer">
            <input
              type="checkbox"
              checked={isAgreed}
              onChange={(e) => setIsAgreed(e.target.checked)}
              className="mt-0.5 w-4 h-4 text-[#0D4435] rounded border-gray-300 focus:ring-[#0D4435]"
            />
            <div className="text-xs font-bold text-gray-800 leading-relaxed">
              <p className="font-black text-[#0D4435] mb-0.5">إقرار أخصائي المشتريات:</p>
              أقر أنا أخصائي المشتريات المكلف بصحة اكتمال فحص ومطابقة بنود هذا الطلب ومرفقاته وتوافقه مع لائحة الشراء المباشر المعتمدة بتاريخ {new Date().toLocaleDateString("ar-SA")}.
            </div>
          </label>

        </div>

        {/* Footer Actions */}
        <div className="px-8 py-5 border-t border-gray-100 bg-gray-50/50 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={isUpdating}
              onClick={handleReturn}
              className="h-10 px-4 bg-orange-50 hover:bg-orange-100 text-orange-700 border border-orange-200 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all active:scale-95"
            >
              <RotateCcw size={14} /> إرجاع للطلب
            </button>
            <button
              type="button"
              disabled={isUpdating}
              onClick={handleClose}
              className="h-10 px-4 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all active:scale-95"
            >
              <Ban size={14} /> إغلاق ورفض الطلب
            </button>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="h-10 px-5 bg-white border border-gray-200 hover:bg-gray-100 text-gray-700 rounded-xl font-bold text-xs transition-colors"
            >
              إلغاء
            </button>

            {!isHighValue && (
              <button
                type="button"
                disabled={isUpdating}
                onClick={handleReferToCommittee}
                className="h-10 px-5 bg-[#C5A059] hover:bg-[#b08d4b] text-white rounded-xl font-black text-xs flex items-center gap-1.5 transition-all shadow-sm active:scale-95"
              >
                <Users size={14} /> إحالة اختيارية للجنة
              </button>
            )}

            <button
              type="button"
              disabled={isUpdating}
              onClick={handleComplete}
              className="h-10 px-6 bg-[#0D4435] hover:bg-[#0a3529] text-white rounded-xl font-black text-xs flex items-center gap-1.5 transition-all shadow-md active:scale-95 disabled:opacity-50"
            >
              <Send size={14} /> {isUpdating ? "جارِ الحفظ..." : isHighValue ? "إكمال وإحالة للجنة (> 50 ألف)" : "إكمال وإرسال لمدير المشتريات"}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
