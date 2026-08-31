"use client";

import { useState, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight, Printer, FileText, Users, ShieldCheck, CheckCircle2, XCircle,
  CheckCheck, Clock, Paperclip, User, FileCheck2, Send, AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";
import { AppHeader } from "@/components/layout/app-header";
import { LoadingScreen } from "@/components/ui/loading-screen";
import { ModernDropdown } from "@/components/ui/modern-dropdown";
import { Tooltip } from "@/components/ui/tooltip";
import { useCurrentProfile } from "@/hooks/useCurrentProfile";
import { useDirectPurchase } from "@/hooks/useDirectPurchase";
import {
  INTAKE_METHOD_OPTIONS, COMMITTEE_ROLE_OPTIONS, COMMITTEE_ROLE_LABELS,
  SPECIALIST_CHECKLIST_SECTIONS, getReasonLabels, isSecretaryRole, DirectPurchaseRequest,
} from "@/lib/direct-purchase-types";
import { openDirectPurchaseAttachment } from "@/lib/direct-purchase-attachments";
import { notifyDirectPurchase } from "@/lib/direct-purchase-notify";
import { SaudiRiyalIcon } from "@/components/SaudiRiyalIcon";
import { formatDateTime } from "@/lib/formatters";

type Attendee = {
  name: string;
  email: string;
  role: string;
  has_approved?: boolean;
  approval_date?: string;
  declaration?: string;
  notes?: string;
};

// Section wrapper shared by every block of the minutes, so the whole sheet
// reads as one numbered document rather than a stack of cards.
const Section = ({
  index,
  title,
  icon: Icon,
  children,
}: {
  index: number;
  title: string;
  icon: React.ElementType;
  children: React.ReactNode;
}) => (
  <section className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
    <header className="px-6 py-4 border-b border-gray-100 bg-gray-50/70 flex items-center gap-3">
      <span className="w-7 h-7 rounded-lg bg-[#0D4435] text-white text-xs font-black flex items-center justify-center shrink-0">
        {index}
      </span>
      <Icon size={16} className="text-[#C5A059] shrink-0" />
      <h2 className="text-sm font-black text-gray-900">{title}</h2>
    </header>
    <div className="p-6">{children}</div>
  </section>
);

const Field = ({ label, value }: { label: string; value: React.ReactNode }) => (
  <div className="min-w-0">
    <p className="text-[11px] font-bold text-gray-400 mb-1">{label}</p>
    <div className="text-xs font-black text-gray-800 break-words">{value || "—"}</div>
  </div>
);

// The page only resolves the request; the sheet below is mounted once that
// exists, so every form field can seed its state straight from the saved
// minutes instead of from an empty row that arrives a render later.
export default function CommitteeMinutesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: requestId } = use(params);
  const router = useRouter();
  const { isLoading: isProfileLoading } = useCurrentProfile();
  const { requests, isLoading: isRequestsLoading } = useDirectPurchase();

  if (isProfileLoading || isRequestsLoading) return <LoadingScreen />;

  const request = requests.find((r) => r.id === requestId);

  if (!request) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center font-bold text-gray-500" dir="rtl">
        <p className="text-base mb-4">الطلب غير موجود أو تم حذفه</p>
        <button onClick={() => router.push("/direct-purchase")} className="px-5 py-2.5 bg-[#0D4435] text-white rounded-xl text-xs font-black">
          العودة للقائمة
        </button>
      </div>
    );
  }

  return <MinutesSheet request={request} />;
}

function MinutesSheet({ request }: { request: DirectPurchaseRequest }) {
  const router = useRouter();
  const { profile, isAdmin } = useCurrentProfile();
  const { committee, updateRequest, isUpdating } = useDirectPurchase();

  // Minutes header
  const [minutesNumber, setMinutesNumber] = useState(request.committee_minutes_number || "");
  const [meetingDate, setMeetingDate] = useState(request.committee_meeting_date || "");
  const [meetingPlace, setMeetingPlace] = useState(request.committee_meeting_place || "");

  // Deliberation form
  const [intakeMethod, setIntakeMethod] = useState(request.intake_method || "qayyem_system");
  const [budgetAmount, setBudgetAmount] = useState(
    request.budget_amount ? String(request.budget_amount) : String(request.estimated_cost ?? "")
  );
  const [recommendation, setRecommendation] = useState<"approved" | "rejected">(
    request.committee_recommendation || "approved"
  );
  const [recommendationReasons, setRecommendationReasons] = useState(request.committee_recommendation_reasons || "");
  const [overviewText, setOverviewText] = useState(
    request.committee_overview ||
      `قامت إدارة المشتريات باستلام النسخة الإلكترونية من العرض الفني والمالي من مدير المشروع / ${request.requester_name} عن طريق (${request.intake_method === "email" ? "البريد الإلكتروني" : "نظام قيّم"}) وذلك برغبة بتوجهه عن طريق الشراء المباشر بتاريخ ${new Date(request.created_at).toLocaleDateString("ar-SA")}.`
  );

  const [attendees, setAttendees] = useState<Attendee[]>(
    (request.committee_attendees as Attendee[]) || []
  );

  // Member acknowledgment
  const [memberNotes, setMemberNotes] = useState("");
  const [memberAgreed, setMemberAgreed] = useState(false);

  const userEmail = profile?.email?.toLowerCase() || "";
  const isSecretary =
    isAdmin ||
    committee.some((m) => m.email.toLowerCase() === userEmail && isSecretaryRole(m.role)) ||
    attendees.some((a) => a.email.toLowerCase() === userEmail && isSecretaryRole(a.role));
  const isPendingApproval = request.status === "pending_committee_approval";
  const myAttendeeIndex = attendees.findIndex((a) => a.email.toLowerCase() === userEmail);
  const myAttendeeRecord = myAttendeeIndex !== -1 ? attendees[myAttendeeIndex] : null;
  // Only the secretary (or an admin) drafts the minutes, and only while the
  // request is actually with the committee — everyone else who can open the
  // request sees the same sheet read-only.
  const canEditMinutes =
    isSecretary &&
    (request.status === "pending_committee_secretary" || request.status === "pending_committee_approval");

  const toggleAttendee = (email: string, name: string, defaultRole: string) => {
    if (attendees.some((a) => a.email === email)) {
      setAttendees(attendees.filter((a) => a.email !== email));
    } else {
      setAttendees([...attendees, { name, email, role: defaultRole, has_approved: false }]);
    }
  };

  const handleRoleChange = (email: string, newRole: string) => {
    setAttendees(attendees.map((a) => (a.email === email ? { ...a, role: newRole } : a)));
  };

  const handleSecretarySubmit = async () => {
    if (!recommendationReasons.trim()) {
      toast.error("يرجى كتابة أسباب ومسوغات توصية اللجنة");
      return;
    }
    if (attendees.length === 0) {
      toast.error("يرجى تحديد أعضاء اللجنة الحاضرين للاجتماع");
      return;
    }

    try {
      await updateRequest({
        id: request.id,
        updates: {
          committee_minutes_number: minutesNumber.trim() || null,
          committee_meeting_date: meetingDate || null,
          committee_meeting_place: meetingPlace.trim() || null,
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

      toast.success("تم اعتماد المحضر وإرساله لأعضاء اللجنة الحاضرين للإقرار");
      notifyDirectPurchase(request.id, "minutes_submitted");
      router.push(`/direct-purchase/${request.id}`);
    } catch (err) {
      // handled in the hook
    }
  };

  const handleMemberApproval = async () => {
    if (!memberAgreed) {
      toast.error("يرجى تفعيل الإقرار على محضر اجتماع اللجنة للمتابعة");
      return;
    }

    const updatedAttendees = attendees.map((a, idx) =>
      idx === myAttendeeIndex
        ? {
            ...a,
            has_approved: true,
            approval_date: new Date().toISOString(),
            declaration: `أقر أنا ${a.name} (${COMMITTEE_ROLE_LABELS[a.role] || a.role}) بصفتي عضواً باجتماع لجنة الشراء المباشر بالموافقة والإقرار على محضر الاجتماع وتوصياته.`,
            notes: memberNotes.trim() || undefined,
          }
        : a
    );

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

      toast.success(
        allDone
          ? "اكتملت إقرارات جميع أعضاء اللجنة وتم اعتماد المحضر والطلب نهائياً!"
          : "تم توثيق إقرارك على محضر اللجنة بنجاح"
      );

      // The specialist who owns the file hears the verdict once the last
      // member has signed off.
      if (allDone) notifyDirectPurchase(request.id, "committee_completed");
      router.push(`/direct-purchase/${request.id}`);
    } catch (err) {
      // handled in the hook
    }
  };

  const reasonLabels = getReasonLabels(request.reason_type);
  const attachments = request.attachments || [];

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col" dir="rtl">
      <style
        dangerouslySetInnerHTML={{
          __html: `
        @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700;800;900&display=swap');
        * { font-family: 'Cairo', sans-serif !important; }
      `,
        }}
      />
      <AppHeader />

      <main className="flex-1 p-6 lg:p-10 max-w-4xl mx-auto w-full space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <button
            onClick={() => router.push(`/direct-purchase/${request.id}`)}
            className="inline-flex items-center gap-2 text-sm font-bold text-gray-500 hover:text-[#0D4435] transition-colors cursor-pointer"
          >
            <ArrowRight size={16} /> العودة لصفحة الطلب
          </button>
          <Link
            href={`/direct-purchase/${request.id}/print`}
            target="_blank"
            className="h-10 px-5 bg-white border border-gray-200 hover:border-[#0D4435] text-gray-700 hover:text-[#0D4435] rounded-xl text-xs font-black flex items-center gap-2 shadow-sm transition-all"
          >
            <Printer size={16} /> طباعة المحضر (A4)
          </Link>
        </div>

        {/* Formal masthead */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="h-1.5 bg-linear-to-l from-[#C5A059] to-[#0D4435]" />
          <div className="p-8 text-center border-b border-gray-100">
            <p className="text-xs font-bold text-gray-400 mb-2">برنامج تطوير وزارة الحرس الوطني — إدارة المشتريات والعقود</p>
            <h1 className="text-2xl font-black text-[#0D4435] mb-2">محضر اجتماع لجنة الشراء المباشر</h1>
            <p className="text-xs font-bold text-gray-500">
              بشأن الطلب رقم <span className="font-mono text-[#0D4435]">{request.request_number}</span>
              {request.pr_number && (
                <>
                  {" · "}
                  <span className="font-mono text-[#856525]">PR: {request.pr_number}</span>
                </>
              )}
            </p>
          </div>

          <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-[11px] font-bold text-gray-500 block mb-1.5">رقم المحضر</label>
              <input
                type="text"
                value={minutesNumber}
                disabled={!canEditMinutes}
                onChange={(e) => setMinutesNumber(e.target.value)}
                placeholder="مثال: DP-C-2026-014"
                className="w-full h-10 px-3 bg-white border border-gray-200 rounded-xl text-xs font-bold text-gray-900 outline-none focus:border-[#0D4435] disabled:bg-gray-50 font-mono"
                dir="ltr"
              />
            </div>
            <div>
              <label className="text-[11px] font-bold text-gray-500 block mb-1.5">تاريخ انعقاد الاجتماع</label>
              <input
                type="date"
                value={meetingDate}
                disabled={!canEditMinutes}
                onChange={(e) => setMeetingDate(e.target.value)}
                className="w-full h-10 px-3 bg-white border border-gray-200 rounded-xl text-xs font-bold text-gray-900 outline-none focus:border-[#0D4435] disabled:bg-gray-50"
              />
            </div>
            <div>
              <label className="text-[11px] font-bold text-gray-500 block mb-1.5">مكان الانعقاد</label>
              <input
                type="text"
                value={meetingPlace}
                disabled={!canEditMinutes}
                onChange={(e) => setMeetingPlace(e.target.value)}
                placeholder="مثال: قاعة الاجتماعات — الدور الثالث"
                className="w-full h-10 px-3 bg-white border border-gray-200 rounded-xl text-xs font-bold text-gray-900 outline-none focus:border-[#0D4435] disabled:bg-gray-50"
              />
            </div>
          </div>
        </div>

        {/* 1. Request file */}
        <Section index={1} title="ملف الطلب المعروض على اللجنة" icon={FileText}>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-5 mb-5">
            <Field label="عنوان الطلب" value={request.request_title} />
            <Field label="صاحب الطلب" value={request.requester_name} />
            <Field label="الإدارة الطالبة" value={request.department} />
            <Field
              label="التكلفة التقديرية"
              value={
                <span className="flex items-center gap-1 text-[#0D4435]">
                  {Number(request.estimated_cost).toLocaleString()}
                  <SaudiRiyalIcon size={13} className="text-[#C5A059]" />
                </span>
              }
            />
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-5 mb-5">
            <Field label="المورد المقترح" value={request.vendor_name} />
            <Field label="ممثل المورد" value={request.vendor_contact_person} />
            <Field label="جوال المورد" value={<span dir="ltr">{request.vendor_contact_phone}</span>} />
            <Field label="بريد المورد" value={<span dir="ltr" className="break-all">{request.vendor_contact_email}</span>} />
          </div>

          <div className="mb-5">
            <p className="text-[11px] font-bold text-gray-400 mb-1.5">سبب اللجوء للشراء المباشر</p>
            <div className="flex flex-wrap gap-2">
              {reasonLabels.map((lbl, idx) => (
                <span key={idx} className="text-[11px] font-bold text-gray-700 bg-gray-50 px-2.5 py-1 rounded-lg border border-gray-200">
                  {lbl}
                </span>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            {[
              { label: "نطاق العمل", value: request.scope_of_work },
              { label: "مبررات الطلب", value: request.justification_reason },
              { label: "الأثر في حال عدم الموافقة", value: request.impact_if_rejected },
            ].map((block) => (
              <div key={block.label}>
                <p className="text-[11px] font-bold text-gray-400 mb-1">{block.label}</p>
                <p className="text-xs font-bold text-gray-700 leading-relaxed bg-gray-50/70 p-3.5 rounded-xl border border-gray-100 whitespace-pre-wrap">
                  {block.value || "—"}
                </p>
              </div>
            ))}
          </div>
        </Section>

        {/* 2. Attachments */}
        <Section index={2} title="المرفقات الداعمة المقدمة من صاحب الطلب" icon={Paperclip}>
          {attachments.length === 0 ? (
            <p className="text-xs font-bold text-gray-400 flex items-center gap-2">
              <AlertTriangle size={14} className="text-amber-500" /> لم يرفق صاحب الطلب أي مستندات داعمة.
            </p>
          ) : (
            <div className="flex flex-wrap gap-2.5">
              {attachments.map((att, idx) => {
                const legacyUrl = att.dataUrl || att.url;
                return (
                  <Tooltip key={idx} content="فتح المرفق في نافذة جديدة">
                    <a
                      href={legacyUrl || "#"}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => {
                        if (att.path) {
                          e.preventDefault();
                          openDirectPurchaseAttachment(att.path);
                        } else if (!legacyUrl) {
                          e.preventDefault();
                          toast.error("هذا المرفق مرفوع بصيغة قديمة وغير متاح للفتح");
                        }
                      }}
                      className="inline-flex items-center gap-2.5 bg-white hover:bg-emerald-50/70 px-4 py-2.5 rounded-xl border border-gray-200 hover:border-[#0D4435] text-xs font-bold text-gray-800 hover:text-[#0D4435] transition-all shadow-2xs cursor-pointer"
                    >
                      <FileText size={16} className="text-[#C5A059]" />
                      <span>{att.name}</span>
                      {att.size && (
                        <span className="text-[10px] text-gray-400 font-normal">
                          ({(att.size / (1024 * 1024)).toFixed(2)} MB)
                        </span>
                      )}
                    </a>
                  </Tooltip>
                );
              })}
            </div>
          )}
        </Section>

        {/* 3. Dept manager decision */}
        <Section index={3} title="اعتماد مدير الإدارة الطالبة" icon={ShieldCheck}>
          {request.dept_manager_approval_status === "approved" ? (
            <div className="space-y-2">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-5">
                <Field label="المعتمِد" value={request.dept_manager_name || request.dept_manager_email} />
                <Field label="تاريخ الاعتماد" value={formatDateTime(request.dept_manager_approval_date)} />
                <Field label="الحالة" value={<span className="text-emerald-700">معتمد</span>} />
              </div>
              {request.dept_manager_declaration && (
                <p className="text-xs font-bold text-emerald-900 bg-emerald-50/70 p-3.5 rounded-xl border border-emerald-100 leading-relaxed">
                  {request.dept_manager_declaration}
                </p>
              )}
              {request.dept_manager_notes && (
                <p className="text-[11px] font-bold text-gray-600">ملاحظات المدير: {request.dept_manager_notes}</p>
              )}
            </div>
          ) : (
            <p className="text-xs font-bold text-gray-400">لم يُسجَّل اعتماد مدير الإدارة بعد.</p>
          )}
        </Section>

        {/* 4. Specialist report */}
        <Section index={4} title="تقرير دراسة وتدقيق أخصائي المشتريات" icon={FileCheck2}>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-5 mb-5">
            <Field label="الأخصائي المكلّف" value={request.assigned_specialist_name || request.assigned_specialist_email} />
            <Field label="تاريخ المراجعة" value={formatDateTime(request.specialist_review_date)} />
            <Field
              label="طريقة الإحالة"
              value={
                request.specialist_action === "referred_to_committee"
                  ? "إحالة يدوية بقرار الأخصائي"
                  : "إحالة آلية (تجاوز حد المبلغ)"
              }
            />
            <Field
              label="نتيجة المطابقة"
              value={(() => {
                const items = SPECIALIST_CHECKLIST_SECTIONS.flatMap((s) => s.items);
                const met = items.filter((i) => request.specialist_checklist?.[i.key]?.value === true).length;
                return `${met} من ${items.length} بند مستوفى`;
              })()}
            />
          </div>

          {request.specialist_checklist ? (
            <div className="space-y-4">
              {SPECIALIST_CHECKLIST_SECTIONS.map((section) => (
                <div key={section.title} className="border border-gray-100 rounded-xl overflow-hidden">
                  <p className="px-4 py-2.5 bg-gray-50 text-[11px] font-black text-gray-700 border-b border-gray-100">
                    {section.title}
                  </p>
                  <ul className="divide-y divide-gray-50">
                    {section.items.map((item) => {
                      const state = request.specialist_checklist?.[item.key];
                      const met = state?.value === true;
                      return (
                        <li key={item.key} className="px-4 py-2.5 flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-gray-800">{item.label}</p>
                            {!met && state?.note && (
                              <p className="text-[11px] font-bold text-red-600 bg-red-50 px-2 py-1 rounded-lg mt-1 inline-block">
                                {state.note}
                              </p>
                            )}
                          </div>
                          <span
                            className={`shrink-0 text-[10px] font-black px-2 py-1 rounded-lg border ${
                              met
                                ? "text-emerald-700 bg-emerald-50 border-emerald-200"
                                : state?.value === false
                                  ? "text-red-700 bg-red-50 border-red-200"
                                  : "text-gray-400 bg-gray-50 border-gray-200"
                            }`}
                          >
                            {met ? "مستوفى" : state?.value === false ? "غير مستوفى" : "لم يُحدد"}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs font-bold text-gray-400">لم يسجّل الأخصائي نتائج المطابقة بعد.</p>
          )}

          {request.specialist_notes && (
            <div className="mt-4">
              <p className="text-[11px] font-bold text-gray-400 mb-1">ملاحظات الأخصائي</p>
              <p className="text-xs font-bold text-gray-700 bg-gray-50/70 p-3.5 rounded-xl border border-gray-100 whitespace-pre-wrap">
                {request.specialist_notes}
              </p>
            </div>
          )}

          {request.specialist_declaration && (
            <p className="mt-3 text-xs font-bold text-[#0D4435] bg-[#0D4435]/5 p-3.5 rounded-xl border border-[#0D4435]/10 leading-relaxed">
              {request.specialist_declaration}
            </p>
          )}
        </Section>

        {/* 5. Deliberation */}
        <Section index={5} title="مداولات اللجنة وتوصيتها" icon={Users}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="text-[11px] font-bold text-gray-500 block mb-1.5">طريقة استلام الطلب</label>
              <div className={canEditMinutes ? "" : "opacity-60 pointer-events-none"}>
                <ModernDropdown
                  value={intakeMethod}
                  options={INTAKE_METHOD_OPTIONS}
                  onChange={(val) => {
                    setIntakeMethod(val);
                    setOverviewText(
                      `قامت إدارة المشتريات باستلام النسخة الإلكترونية من العرض الفني والمالي من مدير المشروع / ${request.requester_name} عن طريق (${val === "email" ? "البريد الإلكتروني" : "نظام قيّم"}) وذلك برغبة بتوجهه عن طريق الشراء المباشر بتاريخ ${new Date(request.created_at).toLocaleDateString("ar-SA")}.`
                    );
                  }}
                  placeholder="اختر طريقة الاستلام"
                  className="w-full"
                />
              </div>
            </div>
            <div>
              <label className="text-[11px] font-bold text-gray-500 block mb-1.5">قيمة المبلغ المرصود (المعتمد)</label>
              <div className="relative">
                <input
                  type="text"
                  inputMode="decimal"
                  value={budgetAmount}
                  disabled={!canEditMinutes}
                  onChange={(e) => setBudgetAmount(e.target.value)}
                  className="w-full h-11 pr-4 pl-16 bg-white border border-gray-200 rounded-xl text-sm font-bold text-gray-900 outline-none focus:border-[#0D4435] disabled:bg-gray-50"
                />
                <div className="absolute left-2.5 top-2 px-2.5 py-1 bg-[#C5A059]/10 border border-[#C5A059]/25 rounded-lg pointer-events-none">
                  <SaudiRiyalIcon size={18} className="text-[#C5A059]" />
                </div>
              </div>
            </div>
          </div>

          <div className="mb-4">
            <label className="text-[11px] font-bold text-gray-500 block mb-1.5">ديباجة المحضر</label>
            <textarea
              rows={3}
              value={overviewText}
              disabled={!canEditMinutes}
              onChange={(e) => setOverviewText(e.target.value)}
              className="w-full p-3 bg-white border border-gray-200 rounded-xl text-xs font-bold text-gray-900 outline-none focus:border-[#0D4435] resize-none disabled:bg-gray-50"
            />
          </div>

          <label className="text-[11px] font-bold text-gray-500 block mb-2">توصية اللجنة</label>
          <div className="grid grid-cols-2 gap-3 mb-4">
            <button
              type="button"
              disabled={!canEditMinutes}
              onClick={() => setRecommendation("approved")}
              className={`py-3 px-4 rounded-xl border text-xs font-black flex items-center justify-center gap-2 transition-all cursor-pointer disabled:cursor-not-allowed ${
                recommendation === "approved"
                  ? "bg-emerald-50 border-emerald-500 text-emerald-800 shadow-sm"
                  : "bg-white border-gray-200 text-gray-600"
              }`}
            >
              <CheckCircle2 size={16} className={recommendation === "approved" ? "text-emerald-600" : ""} /> توصي اللجنة بالموافقة
            </button>
            <button
              type="button"
              disabled={!canEditMinutes}
              onClick={() => setRecommendation("rejected")}
              className={`py-3 px-4 rounded-xl border text-xs font-black flex items-center justify-center gap-2 transition-all cursor-pointer disabled:cursor-not-allowed ${
                recommendation === "rejected"
                  ? "bg-red-50 border-red-500 text-red-800 shadow-sm"
                  : "bg-white border-gray-200 text-gray-600"
              }`}
            >
              <XCircle size={16} className={recommendation === "rejected" ? "text-red-600" : ""} /> توصي اللجنة بعدم الموافقة
            </button>
          </div>

          <div>
            <label className="text-[11px] font-bold text-gray-500 block mb-1.5">أسباب ومسوغات التوصية *</label>
            <textarea
              rows={3}
              value={recommendationReasons}
              disabled={!canEditMinutes}
              onChange={(e) => setRecommendationReasons(e.target.value)}
              placeholder="بيان أسباب وتفاصيل توصية اللجنة بالموافقة أو عدم الموافقة..."
              className="w-full p-3 bg-white border border-gray-200 rounded-xl text-xs font-bold text-gray-900 outline-none focus:border-[#0D4435] resize-none disabled:bg-gray-50"
            />
          </div>
        </Section>

        {/* 6. Attendees */}
        <Section index={6} title="أعضاء اللجنة الحاضرون وإقراراتهم" icon={Users}>
          {canEditMinutes && committee.length > 0 && (
            <div className="bg-gray-50/70 p-4 rounded-xl border border-gray-200 mb-4">
              <p className="text-[11px] font-black text-gray-500 mb-2.5">
                اختر من حضر الاجتماع من أعضاء اللجنة الدائمين:
              </p>
              <div className="flex flex-wrap gap-2">
                {committee.map((m) => {
                  const isSelected = attendees.some((a) => a.email === m.email);
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => toggleAttendee(m.email, m.name, m.role)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                        isSelected
                          ? "bg-[#0D4435] text-white border-[#0D4435] shadow-sm"
                          : "bg-white text-gray-700 border-gray-200 hover:bg-gray-100"
                      }`}
                    >
                      {isSelected ? "✓ " : "+ "} {m.name} ({COMMITTEE_ROLE_LABELS[m.role] || m.role})
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {attendees.length === 0 ? (
            <p className="text-xs font-bold text-gray-400">لم يُحدد الحضور بعد.</p>
          ) : (
            <div className="space-y-2">
              {attendees.map((att) => (
                <div
                  key={att.email}
                  className="bg-white p-4 rounded-xl border border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-black text-gray-900">{att.name}</span>
                      <span className="text-[11px] font-bold text-gray-400" dir="ltr">{att.email}</span>
                    </div>
                    {att.has_approved ? (
                      <p className="text-[11px] font-bold text-emerald-600 flex items-center gap-1 mt-1">
                        <CheckCheck size={13} /> أقرّ بتاريخ {formatDateTime(att.approval_date)}
                      </p>
                    ) : (
                      <p className="text-[11px] font-bold text-amber-600 flex items-center gap-1 mt-1">
                        <Clock size={13} /> بانتظار الإقرار الإلكتروني
                      </p>
                    )}
                    {att.notes && <p className="text-[11px] font-bold text-gray-500 mt-1">ملاحظاته: {att.notes}</p>}
                  </div>

                  {canEditMinutes && !att.has_approved ? (
                    <ModernDropdown
                      value={att.role}
                      options={COMMITTEE_ROLE_OPTIONS}
                      onChange={(newRole) => handleRoleChange(att.email, newRole)}
                      placeholder="منصب الجلسة"
                      className="w-44 shrink-0"
                    />
                  ) : (
                    <span className="text-xs font-black px-3 py-1 bg-gray-100 rounded-lg text-gray-700 shrink-0">
                      {COMMITTEE_ROLE_LABELS[att.role] || att.role}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </Section>

        {/* 7. Member acknowledgment */}
        {isPendingApproval && myAttendeeRecord && !myAttendeeRecord.has_approved && (
          <Section index={7} title="إقرار عضو اللجنة" icon={ShieldCheck}>
            <div className="space-y-4">
              <div>
                <label className="text-[11px] font-bold text-gray-500 block mb-1.5">ملاحظات أو تحفظات (اختياري)</label>
                <input
                  type="text"
                  value={memberNotes}
                  onChange={(e) => setMemberNotes(e.target.value)}
                  placeholder="أي ملاحظات تود تدوينها مع إقرارك..."
                  className="w-full h-10 px-3 bg-white border border-gray-200 rounded-xl text-xs font-bold text-gray-900 outline-none focus:border-emerald-600"
                />
              </div>

              <label className="flex items-start gap-3 p-3.5 bg-emerald-50/70 border border-emerald-200 rounded-xl cursor-pointer">
                <input
                  type="checkbox"
                  checked={memberAgreed}
                  onChange={(e) => setMemberAgreed(e.target.checked)}
                  className="mt-0.5 w-4 h-4 text-[#0D4435] rounded border-gray-300"
                />
                <span className="text-xs font-bold text-emerald-900 leading-relaxed">
                  أقر أنا <span className="font-black underline">{myAttendeeRecord.name}</span> بصفتي (
                  {COMMITTEE_ROLE_LABELS[myAttendeeRecord.role] || myAttendeeRecord.role}) باجتماع اللجنة بصحة ما ورد في
                  محضر الاجتماع وتوصياته والموافقة عليها إلكترونياً.
                </span>
              </label>

              <button
                type="button"
                disabled={isUpdating}
                onClick={handleMemberApproval}
                className="w-full h-11 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl font-black text-xs flex items-center justify-center gap-2 transition-all shadow-md active:scale-95 disabled:opacity-50 cursor-pointer"
              >
                <CheckCircle2 size={16} /> {isUpdating ? "جارِ التوثيق..." : "اعتماد وتوثيق الإقرار على المحضر"}
              </button>
            </div>
          </Section>
        )}

        {/* Footer action */}
        {canEditMinutes && (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sticky bottom-4">
            <p className="text-[11px] font-bold text-gray-500 flex items-center gap-2">
              <User size={13} className="text-[#C5A059]" />
              بصفتك أمين اللجنة، اعتماد المحضر يرسله لجميع الحاضرين للإقرار الإلكتروني.
            </p>
            <button
              type="button"
              disabled={isUpdating}
              onClick={handleSecretarySubmit}
              className="h-11 px-6 bg-[#0D4435] hover:bg-[#0a3529] text-white rounded-xl font-black text-xs flex items-center justify-center gap-2 transition-all shadow-md active:scale-95 disabled:opacity-50 cursor-pointer shrink-0"
            >
              <Send size={15} /> {isUpdating ? "جارِ الاعتماد..." : "اعتماد المحضر وإرساله للأعضاء"}
            </button>
          </div>
        )}

        <div className="h-4" />
      </main>
    </div>
  );
}
