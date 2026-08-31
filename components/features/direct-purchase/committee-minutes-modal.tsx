"use client";

import { useState, useEffect } from "react";
import { X, CheckCircle2, XCircle, Users, Send, FileText, CheckCheck, Clock, ShieldCheck, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { DirectPurchaseRequest, INTAKE_METHOD_OPTIONS, COMMITTEE_ROLE_OPTIONS, COMMITTEE_ROLE_LABELS, isSecretaryRole } from "@/lib/direct-purchase-types";
import { useDirectPurchase } from "@/hooks/useDirectPurchase";
import { useCurrentProfile } from "@/hooks/useCurrentProfile";
import { ModernDropdown } from "@/components/ui/modern-dropdown";
import { SaudiRiyalIcon } from "@/components/SaudiRiyalIcon";

interface CommitteeMinutesModalProps {
  request: DirectPurchaseRequest;
  isOpen: boolean;
  onClose: () => void;
}

export function CommitteeMinutesModal({ request, isOpen, onClose }: CommitteeMinutesModalProps) {
  const { committee, updateRequest, isUpdating } = useDirectPurchase();
  const { profile, isAdmin } = useCurrentProfile();

  // Secretary form state
  const [intakeMethod, setIntakeMethod] = useState(request.intake_method || "qayyem_system");
  const [budgetAmount, setBudgetAmount] = useState(request.budget_amount ? String(request.budget_amount) : String(request.estimated_cost));
  const [recommendation, setRecommendation] = useState<"approved" | "rejected">(request.committee_recommendation || "approved");
  const [recommendationReasons, setRecommendationReasons] = useState(request.committee_recommendation_reasons || "");

  // Attendees list: map from committee members master list or existing attendees
  const [attendees, setAttendees] = useState<Array<{ name: string; email: string; role: string; has_approved?: boolean; approval_date?: string; declaration?: string; notes?: string }>>(() => {
    if (request.committee_attendees && request.committee_attendees.length > 0) {
      return request.committee_attendees;
    }
    // Default from master committee list
    return committee.map((m) => ({
      name: m.name,
      email: m.email,
      role: m.role,
      has_approved: false,
    }));
  });

  // Member acknowledgment state
  const [memberNotes, setMemberNotes] = useState("");
  const [memberAgreed, setMemberAgreed] = useState(false);

  // Auto-generated overview text. Both this and the state below must stay
  // above the `if (!isOpen) return null` guard — a hook after an early return
  // changes the hook count between renders and crashes React on open.
  const defaultOverview = `قامت إدارة المشتريات باستلام النسخة الإلكترونية من العرض الفني والمالي من مدير المشروع / ${request.requester_name} عن طريق (${intakeMethod === "email" ? "البريد الإلكتروني" : "نظام قيّم"}) وذلك برغبة بتوجهه عن طريق الشراء المباشر بتاريخ ${new Date(request.created_at).toLocaleDateString("ar-SA")}.`;

  const [overviewText, setOverviewText] = useState(request.committee_overview || defaultOverview);

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

  const userEmail = profile?.email || "";
  const myAttendeeIndex = attendees.findIndex((a) => a.email.toLowerCase() === userEmail.toLowerCase());
  // The secretary, their deputy, or an admin may prepare the minutes — checked
  // against both this request's attendee list and the master committee list.
  const isSecretaryOrAdmin =
    isAdmin ||
    request.committee_attendees?.some(
      (a) => a.email.toLowerCase() === userEmail.toLowerCase() && isSecretaryRole(a.role)
    ) ||
    committee.some((m) => m.email.toLowerCase() === userEmail.toLowerCase() && isSecretaryRole(m.role));
  const isPendingApproval = request.status === "pending_committee_approval";
  const myAttendeeRecord = myAttendeeIndex !== -1 ? attendees[myAttendeeIndex] : null;
  const hasMemberApproved = !!myAttendeeRecord?.has_approved;

  // Toggle attendee presence
  const toggleAttendee = (email: string, name: string, defaultRole: string) => {
    if (attendees.some((a) => a.email === email)) {
      setAttendees(attendees.filter((a) => a.email !== email));
    } else {
      setAttendees([...attendees, { name, email, role: defaultRole, has_approved: false }]);
    }
  };

  // Change session role of an attendee
  const handleRoleChange = (email: string, newRole: string) => {
    setAttendees(attendees.map((a) => (a.email === email ? { ...a, role: newRole } : a)));
  };

  // Secretary submits minutes to committee members
  const handleSecretarySubmit = async () => {
    if (!recommendationReasons.trim()) {
      toast.error("يرجى كتابة أسباب ومسوغات توصية اللجنة");
      return;
    }

    if (attendees.length === 0) {
      toast.error("يرجى تحديد الحضور في اجتماع اللجنة");
      return;
    }

    try {
      await updateRequest({
        id: request.id,
        updates: {
          intake_method: intakeMethod,
          budget_amount: parseFloat(budgetAmount) || request.estimated_cost,
          committee_overview: overviewText.trim(),
          committee_recommendation: recommendation,
          committee_recommendation_reasons: recommendationReasons.trim(),
          committee_attendees: attendees,
          committee_submitted_at: new Date().toISOString(),
          status: "pending_committee_approval",
        },
      });

      toast.success("تم إرسال محضر اللجنة بنجاح إلى جميع الأعضاء الحاضرين للإقرار");
      onClose();
    } catch (err) {
      // handled
    }
  };

  // Member approves / acknowledges the minutes
  const handleMemberApproval = async () => {
    if (!memberAgreed) {
      toast.error("يرجى تفعيل الإقرار على محضر اجتماع اللجنة للمتابعة");
      return;
    }

    const updatedAttendees = attendees.map((a, idx) => {
      if (idx === myAttendeeIndex) {
        return {
          ...a,
          has_approved: true,
          approval_date: new Date().toISOString(),
          declaration: `أقر أنا ${a.name} (${COMMITTEE_ROLE_LABELS[a.role] || a.role}) بصفتي عضواً باجتماع لجنة الشراء المباشر بالموافقة والإقرار على محضر الاجتماع وتوصياته.`,
          notes: memberNotes.trim() || undefined,
        };
      }
      return a;
    });

    // Check if all attendees have approved
    const allDone = updatedAttendees.every((a) => a.has_approved);
    const finalStatus = allDone
      ? request.committee_recommendation === "approved"
        ? "approved"
        : "rejected"
      : "pending_committee_approval";

    try {
      await updateRequest({
        id: request.id,
        updates: {
          committee_attendees: updatedAttendees,
          committee_completed_at: allDone ? new Date().toISOString() : undefined,
          status: finalStatus,
        },
      });

      if (allDone) {
        toast.success("اكتملت إقرارات جميع أعضاء اللجنة وتم اعتماد المحضر والطلب نهائياً!");
      } else {
        toast.success("تم توثيق إقرارك على محضر اللجنة بنجاح");
      }

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
              <Users size={20} />
            </div>
            <div>
              <h2 className="text-lg font-black text-[#0D4435]">محضر اجتماع لجنة الشراء المباشر</h2>
              <p className="text-xs font-bold text-gray-500">{request.request_number} — {request.request_title}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-8 space-y-6">

          {/* Request Header Summary */}
          <div className="bg-[#0D4435]/5 p-5 rounded-2xl border border-[#0D4435]/10 grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
            <div>
              <p className="font-bold text-gray-500">رقم الطلب:</p>
              <p className="font-black text-[#0D4435] mt-0.5">{request.request_number}</p>
            </div>
            <div>
              <p className="font-bold text-gray-500">عنوان طلب الشراء:</p>
              <p className="font-black text-gray-800 mt-0.5">{request.request_title}</p>
            </div>
            <div>
              <p className="font-bold text-gray-500">المورد المقترح:</p>
              <p className="font-black text-gray-800 mt-0.5">{request.vendor_name}</p>
            </div>
            <div>
              <p className="font-bold text-gray-500">التكلفة التقديرية:</p>
              <p className="font-black text-[#0D4435] mt-0.5 flex items-center gap-1">
                <span>{Number(request.estimated_cost).toLocaleString()}</span>
                <SaudiRiyalIcon size={14} className="text-[#C5A059]" />
              </p>
            </div>
          </div>

          {/* Secretary Editable / View Section */}
          <div className="space-y-4 bg-gray-50/50 p-6 rounded-2xl border border-gray-100">
            <h3 className="text-sm font-black text-gray-900 flex items-center gap-2">
              <FileText size={16} className="text-[#C5A059]" /> تفاصيل وبيانات المحضر
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-gray-700 block mb-1.5">طريقة استلام الطلب *</label>
                <div className={isPendingApproval && !isSecretaryOrAdmin ? "opacity-60 pointer-events-none" : ""}>
                  <ModernDropdown
                    value={intakeMethod}
                    options={INTAKE_METHOD_OPTIONS}
                    onChange={(val) => {
                      setIntakeMethod(val);
                      setOverviewText(`قامت إدارة المشتريات باستلام النسخة الإلكترونية من العرض الفني والمالي من مدير المشروع / ${request.requester_name} عن طريق (${val === "email" ? "البريد الإلكتروني" : "نظام قيّم"}) وذلك برغبة بتوجهه عن طريق الشراء المباشر بتاريخ ${new Date(request.created_at).toLocaleDateString("ar-SA")}.`);
                    }}
                    placeholder="اختر طريقة الاستلام"
                    className="w-full"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-bold text-gray-700 block mb-1.5">قيمة المبلغ المرصود (المعتمد) *</label>
                <div className="relative">
                  <input
                    type="text"
                    inputMode="decimal"
                    value={budgetAmount}
                    onChange={(e) => setBudgetAmount(e.target.value)}
                    disabled={isPendingApproval && !isSecretaryOrAdmin}
                    placeholder="مثال: 50000 أو 63155,32"
                    className="w-full h-11 pr-4 pl-16 bg-white border border-gray-200 rounded-xl text-sm font-bold text-gray-900 outline-none focus:border-[#0D4435] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                  <div className="absolute left-2.5 top-2 px-2.5 py-1 bg-[#C5A059]/10 border border-[#C5A059]/25 rounded-lg flex items-center justify-center pointer-events-none select-none">
                    <SaudiRiyalIcon size={18} className="text-[#C5A059]" />
                  </div>
                </div>
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-gray-700 block mb-1.5">نبذة عن الطلب (ديباجة المحضر)</label>
              <textarea
                rows={3}
                value={overviewText}
                onChange={(e) => setOverviewText(e.target.value)}
                disabled={isPendingApproval && !isSecretaryOrAdmin}
                className="w-full p-3 bg-white border border-gray-200 rounded-xl text-xs font-bold text-gray-900 outline-none focus:border-[#0D4435] resize-none"
              />
            </div>

            {/* Display Requester Justifications */}
            <div className="bg-white p-4 rounded-xl border border-gray-200 space-y-2">
              <p className="text-xs font-black text-[#0D4435]">مبررات المشروع المقدمة من صاحب الطلب:</p>
              <p className="text-xs font-bold text-gray-700 leading-relaxed bg-gray-50 p-3 rounded-lg border border-gray-100">
                {request.justification_reason}
              </p>
              <p className="text-[11px] font-bold text-gray-500 mt-1">الأثر في حال عدم الموافقة: {request.impact_if_rejected}</p>
            </div>

            {/* Recommendation Decision */}
            <div className="space-y-3 pt-2">
              <label className="text-xs font-bold text-gray-700 block">توصية اللجنة *</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  disabled={isPendingApproval && !isSecretaryOrAdmin}
                  onClick={() => setRecommendation("approved")}
                  className={`py-3 px-4 rounded-xl border text-xs font-black flex items-center justify-center gap-2 transition-all ${recommendation === "approved"
                      ? "bg-emerald-50 border-emerald-500 text-emerald-800 shadow-sm"
                      : "bg-white border-gray-200 text-gray-600"
                    }`}
                >
                  <CheckCircle2 size={16} className={recommendation === "approved" ? "text-emerald-600" : ""} /> توصي اللجنة بالموافقة
                </button>
                <button
                  type="button"
                  disabled={isPendingApproval && !isSecretaryOrAdmin}
                  onClick={() => setRecommendation("rejected")}
                  className={`py-3 px-4 rounded-xl border text-xs font-black flex items-center justify-center gap-2 transition-all ${recommendation === "rejected"
                      ? "bg-red-50 border-red-500 text-red-800 shadow-sm"
                      : "bg-white border-gray-200 text-gray-600"
                    }`}
                >
                  <XCircle size={16} className={recommendation === "rejected" ? "text-red-600" : ""} /> توصي اللجنة بعدم الموافقة
                </button>
              </div>

              <div>
                <label className="text-xs font-bold text-gray-700 block mb-1.5">أسباب ومسوغات التوصية (تذكر كتابة من أمين اللجنة) *</label>
                <textarea
                  required
                  rows={3}
                  value={recommendationReasons}
                  onChange={(e) => setRecommendationReasons(e.target.value)}
                  disabled={isPendingApproval && !isSecretaryOrAdmin}
                  placeholder="بيان أسباب وتفاصيل توصية اللجنة بالموافقة أو عدم الموافقة..."
                  className="w-full p-3 bg-white border border-gray-200 rounded-xl text-xs font-bold text-gray-900 outline-none focus:border-[#0D4435] resize-none"
                />
              </div>
            </div>
          </div>

          {/* Attendees Selection and Status */}
          <div className="space-y-4 bg-gray-50/50 p-6 rounded-2xl border border-gray-100">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black text-gray-900 flex items-center gap-2">
                <Users size={16} className="text-[#C5A059]" /> أعضاء اللجنة والحضور المشاركون
              </h3>
              <span className="text-xs font-bold text-gray-400">تحديد الحضور وتعيين مناصب الجلسة</span>
            </div>

            {/* Master Committee Picker if Secretary editing */}
            {(!isPendingApproval || isSecretaryOrAdmin) && committee.length > 0 && (
              <div className="bg-white p-3.5 rounded-xl border border-gray-200 space-y-2">
                <p className="text-[11px] font-black text-gray-500">اختر من قائمة أعضاء اللجنة الدائمين:</p>
                <div className="flex flex-wrap gap-2">
                  {committee.map((m) => {
                    const isSelected = attendees.some((a) => a.email === m.email);
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => toggleAttendee(m.email, m.name, m.role)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${isSelected
                            ? "bg-[#0D4435] text-white border-[#0D4435] shadow-sm"
                            : "bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100"
                          }`}
                      >
                        {isSelected ? "✓ " : "+ "} {m.name} ({COMMITTEE_ROLE_LABELS[m.role] || m.role})
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Attendees Table / Cards */}
            <div className="space-y-2">
              {attendees.map((att) => (
                <div key={att.email} className="bg-white p-4 rounded-xl border border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black text-gray-900">{att.name}</span>
                      <span className="text-[11px] font-bold text-gray-400" dir="ltr">{att.email}</span>
                    </div>
                    {att.has_approved ? (
                      <p className="text-[11px] font-bold text-emerald-600 flex items-center gap-1 mt-1">
                        <CheckCheck size={13} /> تم الإقرار بتاريخ {new Date(att.approval_date || "").toLocaleDateString("ar-SA")}
                      </p>
                    ) : (
                      <p className="text-[11px] font-bold text-amber-600 flex items-center gap-1 mt-1">
                        <Clock size={13} /> بانتظار الإقرار الإلكتروني
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-3">
                    {/* Session Role Dropdown */}
                    {(!isPendingApproval || isSecretaryOrAdmin) ? (
                      <ModernDropdown
                        value={att.role}
                        options={COMMITTEE_ROLE_OPTIONS}
                        onChange={(newRole) => handleRoleChange(att.email, newRole)}
                        placeholder="اختر المنصب"
                        className="w-40"
                      />
                    ) : (
                      <span className="text-xs font-black px-3 py-1 bg-gray-100 rounded-lg text-gray-700">
                        {COMMITTEE_ROLE_LABELS[att.role] || att.role}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Member Acknowledgment Section (shown when status is pending approval and user is an attendee who hasn't approved yet) */}
          {isPendingApproval && myAttendeeRecord && !hasMemberApproved && (
            <div className="bg-emerald-50/70 p-6 rounded-2xl border border-emerald-200 space-y-4">
              <h3 className="text-sm font-black text-emerald-900 flex items-center gap-2">
                <ShieldCheck size={18} className="text-emerald-700" /> إقرار عضو اللجنة
              </h3>

              <div>
                <label className="text-xs font-bold text-emerald-900 block mb-1">ملاحظات العضو أو تحفظات (اختياري)</label>
                <input
                  type="text"
                  value={memberNotes}
                  onChange={(e) => setMemberNotes(e.target.value)}
                  placeholder="أي ملاحظات يود العضو تدوينها مع إقراره..."
                  className="w-full h-10 px-3 bg-white border border-emerald-300 rounded-xl text-xs font-bold text-gray-900 outline-none focus:border-emerald-600"
                />
              </div>

              <label className="flex items-start gap-3 p-3 bg-white/80 border border-emerald-200 rounded-xl cursor-pointer">
                <input
                  type="checkbox"
                  checked={memberAgreed}
                  onChange={(e) => setMemberAgreed(e.target.checked)}
                  className="mt-0.5 w-4 h-4 text-[#0D4435] rounded border-gray-300 focus:ring-[#0D4435]"
                />
                <span className="text-xs font-bold text-emerald-900 leading-relaxed">
                  أقر أنا <span className="font-black underline">{myAttendeeRecord.name}</span> بصفتي ({COMMITTEE_ROLE_LABELS[myAttendeeRecord.role] || myAttendeeRecord.role}) باجتماع اللجنة بصحة ما ورد في محضر الاجتماع وتوصياته والموافقة عليها إلكترونياً.
                </span>
              </label>

              <button
                type="button"
                disabled={isUpdating}
                onClick={handleMemberApproval}
                className="w-full h-11 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl font-black text-xs flex items-center justify-center gap-2 transition-all shadow-md active:scale-95 disabled:opacity-50"
              >
                <CheckCircle2 size={16} /> {isUpdating ? "جارِ التوثيق..." : "اعتماد وتوثيق إقرار العضو على المحضر"}
              </button>
            </div>
          )}

        </div>

        {/* Footer Actions */}
        <div className="px-8 py-5 border-t border-gray-100 bg-gray-50/50 flex items-center justify-between gap-3">
          <button type="button" onClick={onClose} className="h-10 px-5 bg-white border border-gray-200 hover:bg-gray-100 text-gray-700 rounded-xl font-bold text-xs">
            إغلاق
          </button>

          {(!isPendingApproval || isSecretaryOrAdmin) && (
            <button
              type="button"
              disabled={isUpdating}
              onClick={handleSecretarySubmit}
              className="h-10 px-6 bg-[#0D4435] hover:bg-[#0a3529] text-white rounded-xl font-black text-xs flex items-center gap-2 transition-all shadow-md active:scale-95 disabled:opacity-50"
            >
              <Send size={14} /> {isUpdating ? "جارِ الإرسال..." : isPendingApproval ? "تحديث المحضر وإرسال تنبيه للأعضاء" : "إرسال المحضر لإقرار أعضاء اللجنة"}
            </button>
          )}
        </div>

      </div>
    </div>
  );
}
