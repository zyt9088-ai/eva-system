"use client";

import { use } from "react";
import Link from "next/link";
import { 
  Printer, ArrowRight, CheckCircle2, XCircle, ShieldCheck, 
  Building, User, Calendar, FileText, CheckCheck, Award, 
  FileCheck2, Users, Download
} from "lucide-react";
import { useDirectPurchase } from "@/hooks/useDirectPurchase";
import { LoadingScreen } from "@/components/ui/loading-screen";
import { 
  STATUS_CONFIG, SPECIALIST_CHECKLIST_SECTIONS, 
  COMMITTEE_ROLE_LABELS, getReasonLabels 
} from "@/lib/direct-purchase-types";
import { SaudiRiyalIcon } from "@/components/SaudiRiyalIcon";

export default function DirectPurchasePrintPage({ params }: { params: Promise<{ id: string }> }) {
  const unwrappedParams = use(params);
  const requestId = unwrappedParams.id;

  const { requests, isLoading } = useDirectPurchase();

  if (isLoading) {
    return <LoadingScreen />;
  }

  const request = requests.find((r) => r.id === requestId);

  if (!request) {
    return (
      <div className="min-h-screen flex items-center justify-center font-bold text-gray-500" dir="rtl">
        الطلب غير موجود.
      </div>
    );
  }

  const isFinalApproved = request.status === "approved" || !!request.admin_approval_date;

  return (
    <div className="min-h-screen bg-[#F1F5F9] pb-16 print:py-0 print:bg-white font-sans text-right" dir="rtl">
      <style
        dangerouslySetInnerHTML={{
          __html: `
            @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700;800;900&display=swap');
            * { font-family: 'Cairo', sans-serif !important; }
            header, footer, nav, aside, [class*="Header"], [class*="Sidebar"], [class*="Nav"], #header { display: none !important; }
            body, main { padding-top: 0 !important; margin-top: 0 !important; }
            
            @page {
              size: A4 portrait;
              margin: 12mm 14mm;
            }

            @media print {
              html, body {
                background: #ffffff !important;
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
                color-adjust: exact !important;
              }
              .no-print { display: none !important; }
              .a4-container {
                box-shadow: none !important;
                border: none !important;
                padding: 0 !important;
                margin: 0 !important;
                max-width: 100% !important;
                width: 100% !important;
              }
              .avoid-break {
                page-break-inside: avoid !important;
                break-inside: avoid !important;
              }
              .page-break {
                page-break-before: always !important;
                break-before: page !important;
              }
            }
          `,
        }}
      />

      {/* Screen Navigation Bar (Hidden in Print) */}
      <div className="max-w-[210mm] mx-auto pt-8 mb-6 flex justify-between items-center no-print px-4">
        <Link
          href={`/direct-purchase/${request.id}`}
          className="inline-flex items-center gap-2 text-xs font-bold text-gray-600 hover:text-[#0D4435] transition-colors bg-white px-4 py-2.5 rounded-xl shadow-xs border border-gray-200"
        >
          <ArrowRight size={16} /> العودة لتفاصيل الطلب
        </Link>
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 bg-[#0D4435] hover:bg-[#0a3529] text-white px-6 py-2.5 rounded-xl text-xs font-black shadow-md transition-all active:scale-95 cursor-pointer"
          >
            <Printer size={16} /> طباعة أو تصدير PDF (A4)
          </button>
        </div>
      </div>

      {/* Main A4 Document Container */}
      <div className="a4-container max-w-[210mm] mx-auto bg-white rounded-2xl shadow-xl border border-gray-200/80 min-h-[297mm] p-10 space-y-7 relative overflow-hidden">
        
        {/* Top Decorative National Bar */}
        <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-[#0D4435] via-[#C5A059] to-[#0D4435]"></div>

        {/* Official Header */}
        <div className="flex justify-between items-start pb-6 border-b-2 border-[#0D4435]/20 gap-4 pt-2">
          {/* Logo & Org Details */}
          <div className="flex items-center gap-4">
            <img src="/logo.png" alt="شعار النظام" className="h-16 w-auto object-contain" />
            <div>
              <h2 className="text-base font-black text-[#0D4435]">برنامج تطوير وزارة الحرس الوطني</h2>
            </div>
          </div>

          {/* Document Title & Reference Stamp */}
          <div className="text-left space-y-1">
            <div className="inline-block bg-[#0D4435]/10 px-3 py-1 rounded-lg border border-[#0D4435]/20 text-left">
              <p className="text-[10px] font-bold text-[#0D4435]">رقم الطلب المرجعي</p>
              <p className="text-sm font-black text-[#0D4435] font-mono tracking-wider">{request.request_number}</p>
            </div>
            <p className="text-[11px] font-bold text-gray-500">تاريخ الإنشاء: {new Date(request.created_at).toLocaleDateString("ar-SA")}</p>
            <div className="flex items-center justify-end gap-1.5 pt-0.5">
              <span className={`px-2.5 py-0.5 rounded-md text-[10px] font-black border ${
                isFinalApproved
                  ? "bg-emerald-50 text-emerald-800 border-emerald-300"
                  : "bg-amber-50 text-amber-800 border-amber-300"
              }`}>
                {isFinalApproved ? "معتمد نهائياً ✓" : (STATUS_CONFIG[request.status]?.label || "قيد الإجراء")}
              </span>
            </div>
          </div>
        </div>

        {/* Title Heading */}
        <div className="text-center py-2 bg-gray-50/80 rounded-xl border border-gray-200">
          <h1 className="text-lg font-black text-[#0D4435]">
            نموذج ومحضر مبررات أسلوب الشراء المباشر
          </h1>
          <p className="text-xs font-bold text-gray-500 mt-0.5">
            وفقاً لنظام المنافسات والمشتريات الحكومية ولائحته التنفيذية
          </p>
        </div>

        {/* ========================================================================= */}
        {/* Section 1: Requester Details & Justifications */}
        {/* ========================================================================= */}
        <div className="avoid-break space-y-3.5">
          <div className="flex items-center justify-between bg-[#0D4435] text-white px-4 py-2 rounded-xl">
            <h3 className="text-xs font-black flex items-center gap-2">
              <FileText size={15} className="text-[#C5A059]" />
              أولاً: بيانات ومبررات صاحب الطلب (الإدارة الطالبة)
            </h3>
            <span className="text-[10px] font-bold text-gray-200">البيانات الأساسية</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="bg-gray-50/90 p-3 rounded-xl border border-gray-200">
              <p className="text-[10px] font-bold text-gray-500">اسم صاحب الطلب</p>
              <p className="font-black text-gray-900 mt-0.5">{request.requester_name}</p>
            </div>
            <div className="bg-gray-50/90 p-3 rounded-xl border border-gray-200">
              <p className="text-[10px] font-bold text-gray-500">الإدارة / القسم</p>
              <p className="font-black text-gray-900 mt-0.5">{request.department || "—"}</p>
            </div>
            <div className="bg-gray-50/90 p-3 rounded-xl border border-gray-200">
              <p className="text-[10px] font-bold text-gray-500">التكلفة التقديرية</p>
              <p className="font-black text-[#0D4435] mt-0.5 flex items-center gap-1">
                <span>{Number(request.estimated_cost).toLocaleString()}</span>
                <SaudiRiyalIcon size={13} className="text-[#C5A059]" />
              </p>
            </div>
            <div className="bg-gray-50/90 p-3 rounded-xl border border-gray-200">
              <p className="text-[10px] font-bold text-gray-500">سبب الشراء المباشر</p>
              <p className="font-black text-[#0D4435] mt-0.5 truncate" title={getReasonLabels(request.reason_type).join(" ، ")}>
                {getReasonLabels(request.reason_type).join(" ، ") || "—"}
              </p>
            </div>
          </div>

          {/* Scope of Work */}
          <div className="bg-gray-50/70 p-3.5 rounded-xl border border-gray-200 text-xs space-y-1">
            <p className="font-black text-gray-800">وصف الطلب وموضوع نطاق العمل:</p>
            <p className="text-gray-700 leading-relaxed whitespace-pre-wrap font-bold">
              {request.scope_of_work}
            </p>
          </div>

          {/* 2 Justifications Columns */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="p-3.5 bg-gray-50/70 rounded-xl border border-gray-200 space-y-1">
              <p className="font-black text-[#0D4435]">1/ أسباب ومسوغات اختيار الشراء المباشر:</p>
              <p className="text-gray-700 leading-relaxed font-bold">
                {request.justification_reason}
              </p>
            </div>
            <div className="p-3.5 bg-gray-50/70 rounded-xl border border-gray-200 space-y-1">
              <p className="font-black text-red-900">2/ الأثر التشغيلي في حال عدم الموافقة:</p>
              <p className="text-gray-700 leading-relaxed font-bold">
                {request.impact_if_rejected}
              </p>
            </div>
          </div>

          {/* Vendor Details */}
          <div className="p-3 bg-gray-50/70 rounded-xl border border-gray-200 text-xs">
            <p className="font-black text-[#0D4435] mb-1.5 flex items-center gap-1.5">
              <Building size={14} /> بيانات المورد المقترح:
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
              <div>
                <span className="text-gray-500 font-bold">المورد: </span>
                <span className="font-black text-gray-900">{request.vendor_name}</span>
              </div>
              <div>
                <span className="text-gray-500 font-bold">المسؤول: </span>
                <span className="font-bold text-gray-800">{request.vendor_contact_person || "—"}</span>
              </div>
              <div>
                <span className="text-gray-500 font-bold">الهاتف: </span>
                <span className="font-bold text-gray-800 font-mono" dir="ltr">{request.vendor_contact_phone || "—"}</span>
              </div>
              <div>
                <span className="text-gray-500 font-bold">البريد: </span>
                <span className="font-bold text-gray-800 font-mono" dir="ltr">{request.vendor_contact_email || "—"}</span>
              </div>
            </div>
          </div>

          {/* Dept Manager Electronic Approval Stamp */}
          <div className="p-3 bg-emerald-50/70 rounded-xl border border-emerald-200 text-xs flex justify-between items-center">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold text-xs shrink-0">
                ✓
              </div>
              <div>
                <p className="font-black text-emerald-950">
                  اعتماد وموافقة مدير الإدارة الطالبة: <span className="font-black text-gray-900">{request.dept_manager_name || request.dept_manager_email}</span>
                </p>
                <p className="text-[11px] font-bold text-emerald-800">
                  {request.dept_manager_declaration || "أقر بصفتي مدير الإدارة الطالبة بصحة ونظامية مبررات الشراء المباشر."}
                </p>
              </div>
            </div>
            <div className="text-left shrink-0 font-mono text-[10px] text-emerald-700 font-bold">
              {request.dept_manager_approval_date ? new Date(request.dept_manager_approval_date).toLocaleDateString("ar-SA") : "—"}
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* Section 2: Procurement Specialist Review */}
        {/* ========================================================================= */}
        {request.specialist_review_date && (
          <div className="avoid-break space-y-3.5 pt-2">
            <div className="flex items-center justify-between bg-[#0D4435] text-white px-4 py-2 rounded-xl">
              <h3 className="text-xs font-black flex items-center gap-2">
                <FileCheck2 size={15} className="text-[#C5A059]" />
                ثانياً: تقرير فحص ومطابقة أخصائي المشتريات والعقود
              </h3>
              <span className="text-[10px] font-bold text-gray-200">
                الأخصائي: {request.assigned_specialist_name}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {SPECIALIST_CHECKLIST_SECTIONS.map((sec, sIdx) => (
                <div key={sIdx} className="border border-gray-200 rounded-xl overflow-hidden text-xs bg-gray-50/50">
                  <div className="bg-gray-100/90 px-3 py-1.5 font-black text-gray-800 text-[11px] border-b border-gray-200">
                    {sec.title}
                  </div>
                  <div className="divide-y divide-gray-100 p-2 space-y-1">
                    {sec.items.map((item) => {
                      const itemState = request.specialist_checklist?.[item.key];
                      const isYes = itemState?.value === true;
                      return (
                        <div key={item.key} className="flex items-center justify-between py-1 px-1.5 text-[11px]">
                          <span className="font-bold text-gray-700">{item.label}</span>
                          <span className={`px-2 py-0.5 rounded font-black text-[10px] shrink-0 ${
                            isYes ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-800"
                          }`}>
                            {isYes ? "مستوفى ✓" : "غير مستوفى ✗"}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            {/* Specialist Verification Stamp */}
            <div className="p-3 bg-emerald-50/70 rounded-xl border border-emerald-200 text-xs flex justify-between items-center">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#0D4435] text-white flex items-center justify-center font-bold text-xs shrink-0">
                  ✓
                </div>
                <div>
                  <p className="font-black text-gray-900">
                    أخصائي المشتريات المدقق: <span className="font-black text-[#0D4435]">{request.assigned_specialist_name}</span>
                  </p>
                  <p className="text-[11px] font-bold text-gray-700">
                    {request.specialist_declaration || "أقر بدراسة ومطابقة الطلب فنياً ونظامياً واستيفاء كافة البنود."}
                  </p>
                </div>
              </div>
              <span className="text-[10px] font-bold text-gray-500 font-mono shrink-0">
                {new Date(request.specialist_review_date).toLocaleDateString("ar-SA")}
              </span>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* Section 3: Committee Minutes & Recommendations */}
        {/* ========================================================================= */}
        {request.committee_submitted_at && (
          <div className="avoid-break space-y-3.5 pt-2">
            <div className="flex items-center justify-between bg-[#0D4435] text-white px-4 py-2 rounded-xl">
              <h3 className="text-xs font-black flex items-center gap-2">
                <Users size={15} className="text-[#C5A059]" />
                ثالثاً: محضر اجتماع وتوصية لجنة الشراء المباشر
              </h3>
              <span className="text-[10px] font-bold text-gray-200">
                المحضر المعتمد
              </span>
            </div>

            <div className="p-4 bg-gray-50/90 rounded-xl border border-gray-200 text-xs space-y-2.5 leading-relaxed">
              <p className="font-bold text-gray-800">{request.committee_overview}</p>
              
              <div className="p-3 bg-white rounded-xl border border-gray-200 flex items-center justify-between gap-4">
                <div>
                  <span className="text-gray-500 text-[11px] font-bold">قرار وتوصية اللجنة: </span>
                  <span className="font-black text-emerald-800 text-xs mr-1">
                    {request.committee_recommendation === "approved" ? "الموافقة على الشراء المباشر ✓" : "عدم الموافقة ✗"}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-gray-500 text-[11px] font-bold">المبلغ المرصود والمعتمد: </span>
                  <span className="font-black text-[#0D4435] text-xs mr-1 flex items-center gap-1">
                    <span>{Number(request.budget_amount || request.estimated_cost).toLocaleString()}</span>
                    <SaudiRiyalIcon size={13} className="text-[#C5A059]" />
                  </span>
                </div>
              </div>

              {request.committee_recommendation_reasons && (
                <div className="text-[11px]">
                  <span className="font-black text-gray-800">أسباب ومسوغات التوصية: </span>
                  <span className="font-bold text-gray-700">{request.committee_recommendation_reasons}</span>
                </div>
              )}
            </div>

            {/* Committee Attendees Signature Stamps Grid */}
            <div className="space-y-2">
              <p className="text-xs font-black text-gray-800">
                أعضاء لجنة الشراء المباشر الحاضرون والمقرّون على المحضر:
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {request.committee_attendees?.map((att, idx) => (
                  <div key={idx} className="p-3 border border-gray-200 rounded-xl bg-gray-50/80 text-xs space-y-1">
                    <p className="font-black text-gray-900">{att.name}</p>
                    <p className="text-[10px] font-bold text-[#0D4435]">{COMMITTEE_ROLE_LABELS[att.role] || att.role}</p>
                    <div className="pt-1.5 border-t border-gray-200 flex items-center justify-between text-[10px]">
                      <span className="font-black text-emerald-700 flex items-center gap-1">
                        <CheckCheck size={12} /> معتمد إلكترونياً
                      </span>
                      <span className="text-gray-400 font-mono">
                        {att.approval_date ? new Date(att.approval_date).toLocaleDateString("ar-SA") : "معتمد"}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* Section 4: Final Procurement Approval Stamp */}
        {/* ========================================================================= */}
        {isFinalApproved && (
          <div className="avoid-break p-4 bg-gradient-to-r from-emerald-50 via-white to-emerald-50 rounded-2xl border-2 border-emerald-600/30 text-xs flex justify-between items-center shadow-xs">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#0D4435] text-[#C5A059] flex items-center justify-center font-black text-base shadow-sm">
                <Award size={22} />
              </div>
              <div>
                <h4 className="text-sm font-black text-[#0D4435]">الاعتماد النهائي والمصادقة النظامية</h4>
                <p className="text-[11px] font-bold text-gray-600">تم اعتماد مسوغات ومحضر الشراء المباشر نهائياً واكتمال الدورة المستندية.</p>
                {request.admin_notes && (
                  <p className="text-[11px] font-bold text-emerald-800 mt-0.5">توجيه الإدارة: {request.admin_notes}</p>
                )}
              </div>
            </div>
            <div className="text-left font-mono text-[11px] font-black text-[#0D4435] shrink-0 border-r-2 border-gray-200 pr-4">
              <p className="text-gray-400 text-[10px]">تاريخ الاعتماد النهائي</p>
              <p>{request.admin_approval_date ? new Date(request.admin_approval_date).toLocaleDateString("ar-SA") : new Date().toLocaleDateString("ar-SA")}</p>
            </div>
          </div>
        )}

        {/* Official Document Footer */}
        <div className="pt-6 border-t border-gray-200 text-center space-y-1 text-[10px] font-bold text-gray-400">
          <p>تم استخراج وتوليد هذا المستند إلكترونياً من منصة قيّم لإدارة المشتريات والعقود — برقم مرجعي معتمد {request.request_number}</p>
          <p className="text-[9px] text-gray-400">مستند رسمي معتمد إلكترونياً وصالح للمطابقة الإجرائية والمحاسبية دون الحاجة إلى توقيع خطي يدوي.</p>
        </div>

      </div>
    </div>
  );
}
