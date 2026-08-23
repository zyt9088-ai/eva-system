"use client";

import { useState, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight, Printer, CheckCircle2, Clock, XCircle, AlertCircle,
  Building, User, DollarSign, FileText, Paperclip, ShieldCheck,
  CheckCheck, Users, HelpCircle, Edit3, UserCheck, Sparkles, ExternalLink, Download, RotateCcw
} from "lucide-react";
import { AppHeader } from "@/components/layout/app-header";
import { LoadingScreen } from "@/components/ui/loading-screen";
import { useCurrentProfile } from "@/hooks/useCurrentProfile";
import { useDirectPurchase } from "@/hooks/useDirectPurchase";
import { ProgressStepper } from "@/components/features/direct-purchase/progress-stepper";
import { DeptManagerApprovalModal } from "@/components/features/direct-purchase/dept-manager-approval-modal";
import { EditDirectPurchaseModal } from "@/components/features/direct-purchase/edit-direct-purchase-modal";
import { AssignSpecialistModal } from "@/components/features/direct-purchase/assign-specialist-modal";
import { SpecialistReviewModal } from "@/components/features/direct-purchase/specialist-review-modal";
import { CommitteeMinutesModal } from "@/components/features/direct-purchase/committee-minutes-modal";
import { AdminFinalApprovalModal } from "@/components/features/direct-purchase/admin-final-approval-modal";
import {
  STATUS_CONFIG, SPECIALIST_CHECKLIST_SECTIONS,
  COMMITTEE_ROLE_LABELS, getReasonLabels
} from "@/lib/direct-purchase-types";
import { SaudiRiyalIcon } from "@/components/SaudiRiyalIcon";

export default function DirectPurchaseDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const unwrappedParams = use(params);
  const requestId = unwrappedParams.id;
  const router = useRouter();

  const { profile, isAdmin, isLoading: isProfileLoading } = useCurrentProfile();
  const { requests, isLoading: isRequestsLoading } = useDirectPurchase();

  // Modals state
  const [isDeptModalOpen, setIsDeptModalOpen] = useState(false);
  const [deptModalAction, setDeptModalAction] = useState<"approve" | "return" | "reject">("approve");
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [isSpecialistModalOpen, setIsSpecialistModalOpen] = useState(false);
  const [isCommitteeModalOpen, setIsCommitteeModalOpen] = useState(false);
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);

  if (isProfileLoading || isRequestsLoading) {
    return <LoadingScreen />;
  }

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

  const userEmail = profile?.email?.toLowerCase() || "";
  const isDeptManager = request.dept_manager_email?.toLowerCase() === userEmail;
  const isAssignedSpecialist = request.assigned_specialist_email?.toLowerCase() === userEmail;
  const isRequester = request.requester_email?.toLowerCase() === userEmail;
  const isCommitteeAttendee = request.committee_attendees?.some((a) => a.email.toLowerCase() === userEmail);
  const myAttendeeRecord = request.committee_attendees?.find((a) => a.email.toLowerCase() === userEmail);

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

      <main className="flex-1 p-6 lg:p-10 max-w-5xl mx-auto w-full">

        {/* Navigation & Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <button
            onClick={() => router.push("/direct-purchase")}
            className="inline-flex items-center gap-2 text-sm font-bold text-gray-500 hover:text-[#0D4435] transition-colors"
          >
            <ArrowRight size={16} /> العودة لقائمة الطلبات
          </button>

          <div className="flex items-center gap-3">
            <Link
              href={`/direct-purchase/${request.id}/print`}
              target="_blank"
              className="h-10 px-5 bg-white border border-gray-200 hover:border-[#0D4435] text-gray-700 hover:text-[#0D4435] rounded-xl text-xs font-black flex items-center gap-2 shadow-sm transition-all"
            >
              <Printer size={16} /> طباعة التقرير والمحضر (A4)
            </Link>
          </div>
        </div>

        {/* Title Banner */}
        <div className="bg-white rounded-3xl border border-gray-100 p-8 shadow-sm mb-6 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className="px-3 py-1 bg-[#0D4435]/10 text-[#0D4435] rounded-xl text-xs font-black">
                {request.request_number}
              </span>
              <span className="text-xs font-bold text-gray-400">
                تاريخ الإنشاء: {new Date(request.created_at).toLocaleDateString("ar-SA")}
              </span>
            </div>
            <h1 className="text-2xl font-black text-gray-900 leading-snug">
              {request.request_title}
            </h1>
          </div>

          <div className="flex flex-col md:items-end gap-1 shrink-0">
            <span className="text-xs font-bold text-gray-400">التكلفة التقديرية</span>
            <div className="text-2xl font-black text-[#0D4435] flex items-center gap-1.5">
              <span>{Number(request.estimated_cost).toLocaleString()}</span>
              <SaudiRiyalIcon size={24} className="text-[#C5A059]" />
            </div>
          </div>
        </div>

        {/* Progress Stepper */}
        <ProgressStepper request={request} />

        {/* Dynamic Action Banner based on User Role and Status */}
        <div className="mb-8">
          {/* 1. Dept Manager Action */}
          {request.status === "pending_dept_manager" && (isDeptManager || isAdmin) && (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-4 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-amber-100 text-amber-800 rounded-xl flex items-center justify-center shrink-0">
                  <ShieldCheck size={20} />
                </div>
                <div>
                  <h4 className="text-sm font-black text-amber-900">بانتظار قرارك بصفتك مدير الإدارة الطالبة</h4>
                  <p className="text-xs font-bold text-amber-700 mt-0.5">يرجى مراجعة مبررات الشراء المباشر أدناه واتخاذ الإجراء المناسب (موافقة، إرجاع للتعديل، أو رفض).</p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0 flex-wrap">
                <button
                  onClick={() => {
                    setDeptModalAction("approve");
                    setIsDeptModalOpen(true);
                  }}
                  className="h-10 px-5 bg-[#0D4435] hover:bg-[#0a3529] text-white rounded-xl text-xs font-black flex items-center gap-1.5 shadow-sm transition-all active:scale-95 cursor-pointer"
                >
                  <CheckCircle2 size={15} /> موافقة واعتماد
                </button>
                <button
                  onClick={() => {
                    setDeptModalAction("return");
                    setIsDeptModalOpen(true);
                  }}
                  className="h-10 px-4 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-black flex items-center gap-1.5 shadow-sm transition-all active:scale-95 cursor-pointer"
                >
                  <RotateCcw size={15} /> إرجاع للتعديل
                </button>
                <button
                  onClick={() => {
                    setDeptModalAction("reject");
                    setIsDeptModalOpen(true);
                  }}
                  className="h-10 px-4 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-black flex items-center gap-1.5 shadow-sm transition-all active:scale-95 cursor-pointer"
                >
                  <XCircle size={15} /> رفض الطلب
                </button>
              </div>
            </div>
          )}

          {/* 1.1 Requester Action: Request Returned for Modification */}
          {request.status === "returned_to_requester" && (isRequester || isAdmin) && (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-amber-100 text-amber-800 rounded-xl flex items-center justify-center shrink-0">
                  <RotateCcw size={20} />
                </div>
                <div>
                  <h4 className="text-sm font-black text-amber-900">الطلب معاد إليك لإجراء التعديلات المطلوبة</h4>
                  <p className="text-xs font-bold text-amber-700 mt-0.5">
                    توجيه المدير: {request.dept_manager_notes || "يرجى تعديل البيانات واستيفاء المتطلبات ثم إعادة الإرسال."}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsEditModalOpen(true)}
                className="h-11 px-6 bg-[#0D4435] hover:bg-[#0a3529] text-white rounded-xl text-xs font-black flex items-center justify-center gap-2 shadow-sm transition-all shrink-0 active:scale-95 cursor-pointer"
              >
                <Edit3 size={16} /> تعديل وإعادة إرسال الطلب
              </button>
            </div>
          )}

          {/* 1.2 Rejected by Dept Manager Banner (Permanent Close) */}
          {request.status === "dept_manager_rejected" && (
            <div className="bg-red-50 border border-red-200 rounded-2xl p-6 flex items-center gap-3 shadow-sm">
              <div className="w-10 h-10 bg-red-100 text-red-800 rounded-xl flex items-center justify-center shrink-0">
                <XCircle size={20} />
              </div>
              <div>
                <h4 className="text-sm font-black text-red-900">الطلب مغلق — تم رفضه من مدير الإدارة</h4>
                <p className="text-xs font-bold text-red-700 mt-0.5">
                  أسباب ومسوغات الرفض: {request.dept_manager_notes || "لم يتم اعتماد مبررات الشراء المباشر من الإدارة المعنية."}
                </p>
              </div>
            </div>
          )}

          {/* 2. Admin Assign Specialist Action */}
          {request.status === "pending_procurement_assign" && isAdmin && (
            <div className="bg-blue-50 border border-blue-200 rounded-2xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 text-blue-800 rounded-xl flex items-center justify-center shrink-0">
                  <UserCheck size={20} />
                </div>
                <div>
                  <h4 className="text-sm font-black text-blue-900">تم اعتماد الطلب من مدير الإدارة — بانتظار إسناده لأخصائي</h4>
                  <p className="text-xs font-bold text-blue-700 mt-0.5">اختر أخصائي المشتريات المسؤول عن دراسة وفحص مسوغات الطلب.</p>
                </div>
              </div>
              <button
                onClick={() => setIsAssignModalOpen(true)}
                className="h-11 px-6 bg-[#0D4435] hover:bg-[#0a3529] text-white rounded-xl text-xs font-black flex items-center justify-center gap-2 shadow-sm transition-all shrink-0 active:scale-95"
              >
                <UserCheck size={16} /> إسناد لأخصائي المشتريات
              </button>
            </div>
          )}

          {/* 3. Specialist Review Action */}
          {request.status === "pending_specialist_review" && (isAssignedSpecialist || isAdmin) && (
            <div className="bg-purple-50 border border-purple-200 rounded-2xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-purple-100 text-purple-800 rounded-xl flex items-center justify-center shrink-0">
                  <Edit3 size={20} />
                </div>
                <div>
                  <h4 className="text-sm font-black text-purple-900">الطلب مسند إليك لدراسة ومطابقة البنود</h4>
                  <p className="text-xs font-bold text-purple-700 mt-0.5">قم بتعبئة قائمة الفحص والتحقق (Checklist) والإقرار لاتخاذ الإجراء المناسب.</p>
                </div>
              </div>
              <button
                onClick={() => setIsSpecialistModalOpen(true)}
                className="h-11 px-6 bg-[#0D4435] hover:bg-[#0a3529] text-white rounded-xl text-xs font-black flex items-center justify-center gap-2 shadow-sm transition-all shrink-0 active:scale-95"
              >
                <FileText size={16} /> فتح نموذج الفحص والمطابقة
              </button>
            </div>
          )}

          {/* 4. Committee Secretary Action */}
          {request.status === "pending_committee_secretary" && (isAdmin || isCommitteeAttendee) && (
            <div className="bg-blue-50 border border-blue-200 rounded-2xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 text-blue-800 rounded-xl flex items-center justify-center shrink-0">
                  <Users size={20} />
                </div>
                <div>
                  <h4 className="text-sm font-black text-blue-900">محال للجنة الشراء المباشر — بانتظار صياغة المحضر</h4>
                  <p className="text-xs font-bold text-blue-700 mt-0.5">يقوم أمين اللجنة بتسجيل توصيات الاجتماع وتحديد الحضور لإرسال المحضر للإقرار.</p>
                </div>
              </div>
              <button
                onClick={() => setIsCommitteeModalOpen(true)}
                className="h-11 px-6 bg-[#0D4435] hover:bg-[#0a3529] text-white rounded-xl text-xs font-black flex items-center justify-center gap-2 shadow-sm transition-all shrink-0 active:scale-95"
              >
                <Users size={16} /> إعداد محضر اجتماع اللجنة
              </button>
            </div>
          )}

          {/* 5. Committee Member Acknowledgment Action */}
          {request.status === "pending_committee_approval" && isCommitteeAttendee && !myAttendeeRecord?.has_approved && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-emerald-100 text-emerald-800 rounded-xl flex items-center justify-center shrink-0">
                  <ShieldCheck size={20} />
                </div>
                <div>
                  <h4 className="text-sm font-black text-emerald-900">تمت دعوتك للإقرار على محضر اجتماع لجنة الشراء المباشر</h4>
                  <p className="text-xs font-bold text-emerald-700 mt-0.5">يرجى الاطلاع على المحضر والتوصيات وتوثيق إقرارك الإلكتروني.</p>
                </div>
              </div>
              <button
                onClick={() => setIsCommitteeModalOpen(true)}
                className="h-11 px-6 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-black flex items-center justify-center gap-2 shadow-sm transition-all shrink-0 active:scale-95"
              >
                <CheckCheck size={16} /> توثيق إقرار العضو على المحضر
              </button>
            </div>
          )}

          {/* 6. Admin Final Approval for <= 50k */}
          {request.status === "pending_admin_approval" && isAdmin && (
            <div className="bg-indigo-50 border border-indigo-200 rounded-2xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-indigo-100 text-indigo-800 rounded-xl flex items-center justify-center shrink-0">
                  <ShieldCheck size={20} />
                </div>
                <div>
                  <h4 className="text-sm font-black text-indigo-900">اكتمل فحص أخصائي المشتريات — بانتظار الاعتماد النهائي</h4>
                  <p className="text-xs font-bold text-indigo-700 mt-0.5">الطلب بمبلغ $\le$ 50 ألف ريال ولا يتطلب لجنة، بانتظار قرار مدير المشتريات النهائي.</p>
                </div>
              </div>
              <button
                onClick={() => setIsAdminModalOpen(true)}
                className="h-11 px-6 bg-[#0D4435] hover:bg-[#0a3529] text-white rounded-xl text-xs font-black flex items-center justify-center gap-2 shadow-sm transition-all shrink-0 active:scale-95"
              >
                <CheckCircle2 size={16} /> الاعتماد النهائي للطلب
              </button>
            </div>
          )}
        </div>

        {/* Section 1: Requester Details & Justifications */}
        <div className="bg-white rounded-3xl border border-gray-100 p-8 shadow-sm mb-6 space-y-6">
          <h2 className="text-base font-black text-[#0D4435] flex items-center gap-2 pb-3 border-b border-gray-100">
            <FileText size={18} className="text-[#C5A059]" /> بيانات ومبررات صاحب الطلب
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs">
            <div className="bg-gray-50/80 p-4 rounded-2xl border border-gray-100/80 flex flex-col justify-between">
              <p className="font-bold text-gray-400 mb-1">صاحب الطلب:</p>
              <div>
                <p className="font-black text-gray-900 text-sm">{request.requester_name}</p>
                <p className="text-[11px] font-bold text-gray-500 font-mono mt-0.5 truncate">{request.requester_email}</p>
              </div>
            </div>

            <div className="bg-gray-50/80 p-4 rounded-2xl border border-gray-100/80 flex flex-col justify-between">
              <p className="font-bold text-gray-400 mb-1">الإدارة / القسم:</p>
              <div>
                <p className="font-black text-gray-900 text-sm">{request.department || "—"}</p>
                <p className="text-[11px] font-bold text-gray-400 mt-0.5">الإدارة الطالبة</p>
              </div>
            </div>

            <div className="bg-gray-50/80 p-4 rounded-2xl border border-gray-100/80 flex flex-col justify-between">
              <p className="font-bold text-gray-400 mb-1">سبب الشراء المباشر:</p>
              <div className="flex flex-wrap gap-1.5 mt-0.5">
                {getReasonLabels(request.reason_type).map((lbl, idx) => (
                  <span key={idx} className="font-black text-[#0D4435] text-xs bg-[#0D4435]/10 px-2.5 py-1 rounded-lg border border-[#0D4435]/15">
                    {lbl}
                  </span>
                ))}
              </div>
            </div>

            <div className="bg-gray-50/80 p-4 rounded-2xl border border-gray-100/80 flex flex-col justify-between">
              <p className="font-bold text-gray-400 mb-1">مدير الإدارة المعتمد:</p>
              <div>
                <p className="font-black text-gray-900 text-sm">{request.dept_manager_name || request.dept_manager_email}</p>
                <p className="text-[11px] font-bold text-gray-500 font-mono mt-0.5 truncate">{request.dept_manager_email}</p>
              </div>
            </div>
          </div>

          {/* Scope of Work */}
          <div>
            <p className="text-xs font-black text-gray-700 mb-1.5">وصف الطلب ونطاق العمل:</p>
            <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 text-xs font-bold text-gray-800 leading-relaxed whitespace-pre-wrap">
              {request.scope_of_work}
            </div>
          </div>

          {/* Justifications */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-xs font-black text-gray-700 mb-1.5">1/ سبب اختيار أسلوب الشراء المباشر:</p>
              <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 text-xs font-bold text-gray-800 leading-relaxed whitespace-pre-wrap">
                {request.justification_reason}
              </div>
            </div>
            <div>
              <p className="text-xs font-black text-gray-700 mb-1.5">2/ الأثر في حال عدم الموافقة:</p>
              <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 text-xs font-bold text-gray-800 leading-relaxed whitespace-pre-wrap">
                {request.impact_if_rejected}
              </div>
            </div>
          </div>

          {/* Vendor Details */}
          <div className="p-5 bg-gray-50/80 rounded-2xl border border-gray-100/80 space-y-3">
            <h4 className="text-xs font-black text-[#0D4435] flex items-center gap-1.5">
              <Building size={15} /> بيانات المورد المقترح:
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
              <div className="bg-white p-3 rounded-xl border border-gray-200/70">
                <p className="font-bold text-gray-400 text-[11px]">اسم المورد</p>
                <p className="font-black text-gray-900 mt-1">{request.vendor_name}</p>
              </div>
              <div className="bg-white p-3 rounded-xl border border-gray-200/70">
                <p className="font-bold text-gray-400 text-[11px]">الشخص المسؤول</p>
                <p className="font-bold text-gray-800 mt-1">{request.vendor_contact_person || "—"}</p>
              </div>
              <div className="bg-white p-3 rounded-xl border border-gray-200/70">
                <p className="font-bold text-gray-400 text-[11px]">رقم التواصل</p>
                <p className="font-bold text-gray-800 font-mono mt-1">{request.vendor_contact_phone || "—"}</p>
              </div>
              <div className="bg-white p-3 rounded-xl border border-gray-200/70">
                <p className="font-bold text-gray-400 text-[11px]">البريد الإلكتروني</p>
                <p className="font-bold text-gray-800 font-mono mt-1 truncate">{request.vendor_contact_email || "—"}</p>
              </div>
            </div>
          </div>

          {/* Attachments */}
          {request.attachments && request.attachments.length > 0 && (
            <div>
              <p className="text-xs font-black text-gray-700 mb-2.5">المرفقات الداعمة:</p>
              <div className="flex flex-wrap gap-2.5">
                {request.attachments.map((att: any, idx: number) => {
                  const fileUrl = att.dataUrl || att.url;
                  return (
                    <a
                      key={idx}
                      href={fileUrl || "#"}
                      target="_blank"
                      rel="noopener noreferrer"
                      download={att.name}
                      onClick={(e) => {
                        if (!fileUrl) {
                          e.preventDefault();
                          alert("هذا المرفق تم رفعه في طلب تجريبي سابق قبل تفعيل قارئ الملفات المباشر");
                        }
                      }}
                      className="inline-flex items-center gap-2.5 bg-white hover:bg-emerald-50/70 px-4 py-2.5 rounded-xl border border-gray-200 hover:border-[#0D4435] text-xs font-bold text-gray-800 hover:text-[#0D4435] transition-all shadow-2xs group cursor-pointer"
                    >
                      <FileText size={16} className="text-[#C5A059] group-hover:scale-110 transition-transform" />
                      <span className="font-bold">{att.name}</span>
                      {att.size && (
                        <span className="text-[10px] text-gray-400 font-normal">
                          ({(att.size / (1024 * 1024)).toFixed(2)} MB)
                        </span>
                      )}
                      <ExternalLink size={14} className="text-gray-400 group-hover:text-[#0D4435] mr-1" />
                    </a>
                  );
                })}
              </div>
            </div>
          )}

          {/* Dept Manager Decision Record */}
          {request.dept_manager_approval_status === "approved" && (
            <div className="p-4 bg-emerald-50/70 rounded-2xl border border-emerald-100 text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="space-y-1">
                <p className="font-black text-emerald-900 flex items-center gap-1.5">
                  <CheckCircle2 size={15} className="text-emerald-600" /> تم اعتماد وموافقة مدير الإدارة الطالبة
                </p>
                <p className="font-bold text-emerald-800">{request.dept_manager_declaration}</p>
                {request.dept_manager_notes && (
                  <p className="text-emerald-700 font-bold">ملاحظات المدير: {request.dept_manager_notes}</p>
                )}
              </div>
              {request.dept_manager_approval_date && (
                <span className="text-[11px] font-bold text-emerald-600 shrink-0">
                  {new Date(request.dept_manager_approval_date).toLocaleString("ar-SA")}
                </span>
              )}
            </div>
          )}

          {(request.dept_manager_approval_status === "returned" || request.status === "returned_to_requester") && (
            <div className="p-5 bg-amber-50 rounded-2xl border border-amber-200 text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
              <div className="space-y-1.5">
                <p className="font-black text-amber-900 flex items-center gap-1.5 text-sm">
                  <RotateCcw size={16} className="text-amber-600" /> تم إرجاع الطلب من مدير الإدارة للتعديل
                </p>
                <p className="font-bold text-amber-800">
                  توجيهات وملاحظات المدير: <span className="font-black text-gray-900 bg-white/80 px-2 py-0.5 rounded border border-amber-200">{request.dept_manager_notes || "يرجى تعديل الطلب واستيفاء المطلوب"}</span>
                </p>
              </div>
              {request.dept_manager_approval_date && (
                <span className="text-[11px] font-bold text-amber-700 shrink-0">
                  {new Date(request.dept_manager_approval_date).toLocaleString("ar-SA")}
                </span>
              )}
            </div>
          )}

          {(request.dept_manager_approval_status === "rejected" || request.status === "dept_manager_rejected") && (
            <div className="p-5 bg-red-50 rounded-2xl border border-red-200 text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
              <div className="space-y-1.5">
                <p className="font-black text-red-900 flex items-center gap-1.5 text-sm">
                  <XCircle size={16} className="text-red-600" /> تم رفض الطلب من مدير الإدارة
                </p>
                <p className="font-bold text-red-800">
                  أسباب وتبريرات الرفض: <span className="font-black text-gray-900 bg-white/80 px-2 py-0.5 rounded border border-red-200">{request.dept_manager_notes || "غير معتمد"}</span>
                </p>
              </div>
              {request.dept_manager_approval_date && (
                <span className="text-[11px] font-bold text-red-700 shrink-0">
                  {new Date(request.dept_manager_approval_date).toLocaleString("ar-SA")}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Section 2: Procurement Specialist Verification */}
        {request.specialist_review_date && (
          <div className="bg-white rounded-3xl border border-gray-100 p-8 shadow-sm mb-6 space-y-6">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <h2 className="text-base font-black text-[#0D4435] flex items-center gap-2">
                <FileText size={18} className="text-[#C5A059]" /> دراسة وتدقيق أخصائي المشتريات
              </h2>
              <span className="text-xs font-bold text-gray-400">
                المكلف: {request.assigned_specialist_name}
              </span>
            </div>

            {/* Checklist Results */}
            <div className="space-y-4">
              {SPECIALIST_CHECKLIST_SECTIONS.map((section, sIdx) => (
                <div key={sIdx} className="bg-gray-50/50 rounded-2xl border border-gray-100 p-4">
                  <h4 className="text-xs font-black text-[#0D4435] mb-2">{section.title}</h4>
                  <div className="space-y-2 text-xs">
                    {section.items.map((item) => {
                      const itemState = request.specialist_checklist?.[item.key];
                      const isYes = itemState?.value === true;
                      return (
                        <div key={item.key} className="flex flex-col sm:flex-row sm:items-center justify-between p-2 rounded-lg bg-white border border-gray-100 gap-2">
                          <span className="font-bold text-gray-800">{item.label}</span>
                          <div className="flex items-center gap-2">
                            {isYes ? (
                              <span className="px-2.5 py-0.5 bg-emerald-100 text-emerald-800 rounded font-black text-[11px]">مستوفى (نعم)</span>
                            ) : (
                              <span className="px-2.5 py-0.5 bg-red-100 text-red-800 rounded font-black text-[11px]">غير مستوفى (لا)</span>
                            )}
                          </div>
                          {itemState?.note && (
                            <p className="text-red-600 text-[11px] font-bold mt-1 sm:mt-0 w-full sm:w-auto">
                              الملاحظة: {itemState.note}
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            {/* Specialist Declaration */}
            <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <p className="font-black text-gray-800">{request.specialist_declaration}</p>
                {request.specialist_notes && (
                  <p className="font-bold text-gray-600 mt-1">توجيهات الأخصائي: {request.specialist_notes}</p>
                )}
              </div>
              <span className="text-[11px] font-bold text-gray-400 shrink-0">
                {new Date(request.specialist_review_date).toLocaleString("ar-SA")}
              </span>
            </div>
          </div>
        )}

        {/* Section 3: Committee Minutes & Recommendations */}
        {request.committee_submitted_at && (
          <div className="bg-white rounded-3xl border border-gray-100 p-8 shadow-sm mb-6 space-y-6">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <h2 className="text-base font-black text-[#0D4435] flex items-center gap-2">
                <Users size={18} className="text-[#C5A059]" /> محضر اجتماع وتوصية لجنة الشراء المباشر
              </h2>
              <div className={`px-3 py-1 rounded-full text-xs font-black ${request.committee_recommendation === "approved" ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-800"}`}>
                {request.committee_recommendation === "approved" ? "توصية بالموافقة" : "توصية بعدم الموافقة"}
              </div>
            </div>

            <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 text-xs space-y-2">
              <p className="font-bold text-gray-500">طريقة استلام الطلب: <span className="font-black text-gray-800">{request.intake_method === "email" ? "البريد الإلكتروني" : "نظام قيّم"}</span></p>
              <p className="font-bold text-gray-500 flex items-center gap-1">المبلغ المرصود: <span className="font-black text-[#0D4435]">{Number(request.budget_amount || request.estimated_cost).toLocaleString()}</span> <SaudiRiyalIcon size={14} className="text-[#C5A059]" /></p>
              <p className="font-bold text-gray-800 leading-relaxed pt-2 border-t border-gray-200">{request.committee_overview}</p>
            </div>

            <div>
              <p className="text-xs font-black text-gray-700 mb-1.5">أسباب ومسوغات توصية اللجنة:</p>
              <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 text-xs font-bold text-gray-800 leading-relaxed whitespace-pre-wrap">
                {request.committee_recommendation_reasons}
              </div>
            </div>

            {/* Attendees & Acknowledgments */}
            <div>
              <p className="text-xs font-black text-gray-700 mb-3">حضور وإقرارات أعضاء اللجنة:</p>
              <div className="space-y-2">
                {request.committee_attendees?.map((att, idx) => (
                  <div key={idx} className="bg-gray-50 p-4 rounded-xl border border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-black text-gray-900">{att.name}</span>
                        <span className="px-2 py-0.5 bg-gray-200 rounded text-[10px] font-bold text-gray-700">
                          {COMMITTEE_ROLE_LABELS[att.role] || att.role}
                        </span>
                      </div>
                      {att.has_approved ? (
                        <p className="text-emerald-700 font-bold mt-1 flex items-center gap-1">
                          <CheckCheck size={14} /> تم الإقرار والموافقة الإلكترونية
                        </p>
                      ) : (
                        <p className="text-amber-600 font-bold mt-1 flex items-center gap-1">
                          <Clock size={14} /> بانتظار الإقرار الإلكتروني
                        </p>
                      )}
                    </div>

                    {att.approval_date && (
                      <span className="text-[11px] font-bold text-gray-400">
                        {new Date(att.approval_date).toLocaleDateString("ar-SA")}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

      </main>

      {/* Modals */}
      <DeptManagerApprovalModal
        request={request}
        isOpen={isDeptModalOpen}
        onClose={() => setIsDeptModalOpen(false)}
        defaultAction={deptModalAction}
      />

      <EditDirectPurchaseModal
        request={request}
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
      />

      <AssignSpecialistModal
        request={request}
        isOpen={isAssignModalOpen}
        onClose={() => setIsAssignModalOpen(false)}
      />

      <SpecialistReviewModal
        request={request}
        isOpen={isSpecialistModalOpen}
        onClose={() => setIsSpecialistModalOpen(false)}
      />

      <CommitteeMinutesModal
        request={request}
        isOpen={isCommitteeModalOpen}
        onClose={() => setIsCommitteeModalOpen(false)}
      />

      <AdminFinalApprovalModal
        request={request}
        isOpen={isAdminModalOpen}
        onClose={() => setIsAdminModalOpen(false)}
      />
    </div>
  );
}
