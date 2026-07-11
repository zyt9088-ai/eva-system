const fs = require('fs');

const fileContent = `"use client";

import { useState, use } from "react";
import { Printer, ArrowRight } from "lucide-react";
import Link from "next/link";
import { useEvaluations } from "@/hooks/useEvaluations";
import { getFinalStatusForVendor, calculateEvfAveragesForVendor, formatDateTime } from "@/lib/evaluation-utils";

export default function PrintEvalPage({ params }: { params: any }) {
  const unwrappedParams = use(params);
  const evalId = (unwrappedParams as any).id;
  
  const { evaluations, isLoaded } = useEvaluations();

  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center font-bold text-gray-500">
        جاري تحميل بيانات التقرير...
      </div>
    );
  }

  const data = evaluations.find((ev) => ev.id === evalId);

  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center font-bold text-gray-500">
        الطلب غير موجود.
      </div>
    );
  }

  const vendorsList = data.vendors?.length ? data.vendors : [
    { name: data.vendorName, quotationPrice: data.quotationPrice, showPrice: data.showPrice !== false },
  ];
  
  const evaluatorsList = data.evaluators?.length ? data.evaluators : [{ name: data.evaluatorName || "مقيم 1", isPM: true }];

  const mappedVendors = vendorsList.map((v: any, idx: number) => {
    const finalStatus = data.type === "GENERAL"
      ? getFinalStatusForVendor(data, idx)
      : data.status === "APPROVED"
        ? parseFloat(calculateEvfAveragesForVendor(data, idx).total) >= 60
          ? "مؤهل فنياً"
          : "مستبعد"
        : "قيد الإجراء";

    const scoreStr = data.type === "EVF" ? calculateEvfAveragesForVendor(data, idx).total : "-";
    const finalScore = data.type === "EVF" ? parseFloat(scoreStr) : 0;
    const isPassed = finalStatus === "مؤهل فنياً" || finalStatus === "مطابق كلياً";

    return {
      ...v,
      originalIndex: idx,
      finalStatus,
      finalScore,
      scoreStr,
      isPassed,
    };
  });

  const passedVendors = [...mappedVendors]
    .filter((v) => v.isPassed)
    .sort((a, b) => {
      if (b.finalScore !== a.finalScore) return b.finalScore - a.finalScore;
      return a.originalIndex - b.originalIndex;
    });

  const rankNames = ["الأول", "الثاني", "الثالث", "الرابع", "الخامس", "السادس", "السابع", "الثامن", "التاسع", "العاشر"];

  passedVendors.forEach((pv, index) => {
    const indexInMapped = mappedVendors.findIndex((v) => v.originalIndex === pv.originalIndex);
    if (indexInMapped !== -1) {
      mappedVendors[indexInMapped].rank = rankNames[index] || (index + 1).toString();
    }
  });

  return (
    <div className="min-h-screen bg-gray-100 pb-8 print:py-0 print:bg-white font-sans" dir="rtl">
      <style
        dangerouslySetInnerHTML={{
          __html: \`
            @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;900&display=swap');
            * { font-family: 'Cairo', sans-serif !important; }
            header, footer, nav, aside, [class*="Header"], [class*="Sidebar"], [class*="Nav"], #header { display: none !important; }
            body, main { padding-top: 0 !important; margin-top: 0 !important; }
            @media print {
              body { background: white !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
              .no-print { display: none !important; }
              .print-border { border: 1px solid #e5e7eb !important; }
              .print-bg-gray { background-color: #f9fafb !important; }
              .print-bg-dark { background-color: #0D4435 !important; color: white !important; }
              .page-break { page-break-before: always; }
            }
          \`,
        }}
      />

      <div className="max-w-[210mm] mx-auto pt-20 mb-6 flex justify-between items-center no-print px-4 relative z-[99999]">
        <Link
          href="/tech-eval"
          className="inline-flex items-center gap-2 text-sm font-bold text-gray-600 hover:text-[#0D4435] transition-colors bg-white px-4 py-2.5 rounded-lg shadow-sm border border-gray-200 hover:bg-gray-50"
        >
          <ArrowRight size={16} /> العودة للوحة التحكم
        </Link>
        <button
          onClick={() => window.print()}
          className="inline-flex items-center gap-2 bg-[#0D4435] text-white px-6 py-2.5 rounded-lg text-sm font-bold shadow-md hover:bg-[#0a3529] transition-all"
        >
          <Printer size={16} /> طباعة التقرير (A4)
        </button>
      </div>

      <div className="max-w-[210mm] mx-auto bg-white print-border shadow-sm print:shadow-none min-h-[297mm] p-12">
        <div className="flex justify-between items-center border-b-2 border-[#0D4435] pb-6 mb-8">
          <div className="flex items-center gap-4">
            <img src="/logo.png" alt="الشعار" className="h-16 w-auto grayscale-0 print:grayscale-0" />
            <div className="h-12 w-[1px] bg-gray-300"></div>
            <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/6/66/Saudi_Vision_2030_logo.svg/1200px-Saudi_Vision_2030_logo.svg.png" alt="رؤية 2030" className="h-12 w-auto grayscale-0 print:grayscale-0" />
          </div>
          <div className="text-left">
            <h2 className="text-xl font-black text-[#0D4435] mb-1">محضر لجنة فحص العروض التقنية</h2>
            <p className="text-xs font-bold text-gray-500">
              التاريخ: {formatDateTime(data.status === "APPROVED" ? data.history?.[data.history.length - 1]?.date || data.createdAt : data.createdAt).split(" ")[0]}
            </p>
            <p className="text-xs font-bold text-gray-500 mt-1">الرقم المرجعي: {data.id.toUpperCase()}</p>
          </div>
        </div>

        <div className="bg-[#f9fafb] print-bg-gray rounded-xl p-6 border border-gray-200 mb-8">
          <h3 className="text-lg font-black text-[#0D4435] mb-4 border-b border-gray-200 pb-2">تفاصيل الطلب</h3>
          <div className="grid grid-cols-2 gap-x-12 gap-y-4">
            <div>
              <p className="text-xs text-gray-500 font-bold mb-1">اسم المشروع / الغرض:</p>
              <p className="text-sm font-black text-gray-900">{data.projectName}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 font-bold mb-1">رقم طلب الشراء (PR):</p>
              <p className="text-sm font-black text-gray-900">{data.prNumber}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 font-bold mb-1">نوع التقييم الفني:</p>
              <p className="text-sm font-black text-[#0D4435]">{data.type === "EVF" ? "تقييم فني موزون (EVF)" : "مطابقة مواصفات (General)"}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 font-bold mb-1">حالة الاعتماد:</p>
              <p className="text-sm font-black text-gray-900">{data.status === "APPROVED" ? "مكتمل ومعتمد نهائياً" : "قيد الإجراء"}</p>
            </div>
          </div>
        </div>

        <div className="mb-8">
          <h3 className="text-lg font-black text-[#0D4435] mb-4 border-b border-gray-200 pb-2">نتائج تقييم العروض</h3>
          <table className="w-full text-sm text-right border-collapse border border-gray-300">
            <thead>
              <tr className="bg-[#0D4435] print-bg-dark text-white">
                <th className="p-3 font-bold border border-gray-300 w-12 text-center">#</th>
                <th className="p-3 font-bold border border-gray-300">اسم المورد</th>
                {data.type === "EVF" && <th className="p-3 font-bold border border-gray-300 text-center">الدرجة الفنية (من 100)</th>}
                <th className="p-3 font-bold border border-gray-300 text-center">النتيجة النهائية</th>
                {data.type === "EVF" && <th className="p-3 font-bold border border-gray-300 text-center">الترتيب الفني</th>}
              </tr>
            </thead>
            <tbody>
              {mappedVendors.map((v: any, index: number) => (
                <tr key={index} className={index % 2 === 0 ? "bg-white" : "bg-gray-50 print-bg-gray"}>
                  <td className="p-3 text-center border border-gray-300 font-bold text-gray-500">{index + 1}</td>
                  <td className="p-3 font-bold text-gray-900 border border-gray-300">{v.name}</td>
                  {data.type === "EVF" && <td className="p-3 text-center border border-gray-300 font-black text-[#0D4435]">{v.scoreStr}%</td>}
                  <td className="p-3 text-center border border-gray-300">
                    <span className={\`inline-block px-3 py-1 rounded text-xs font-black \${
                      v.isPassed ? "bg-green-100 text-green-800 border-green-200" :
                      v.finalStatus === "مطابق جزئياً" ? "bg-yellow-100 text-yellow-800 border-yellow-200" :
                      v.finalStatus === "غير مطابق" || v.finalStatus === "مستبعد" ? "bg-red-100 text-red-800 border-red-200" :
                      "bg-gray-100 text-gray-800 border-gray-200"
                    } border\`}>
                      {v.finalStatus}
                    </span>
                  </td>
                  {data.type === "EVF" && (
                    <td className="p-3 text-center border border-gray-300 font-black text-gray-700">
                      {v.isPassed ? v.rank : "-"}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {data.pmJustifications && Object.keys(data.pmJustifications).length > 0 && (
          <div className="mb-10 bg-yellow-50/50 print-bg-gray p-6 rounded-xl border border-yellow-200">
            <h3 className="text-sm font-black text-yellow-800 mb-4 border-b border-yellow-200 pb-2">تبريرات لجنة فحص العروض للموردين المستبعدين:</h3>
            <div className="space-y-4">
              {mappedVendors.map((v: any, idx: number) => {
                if (data.pmJustifications[idx] && data.pmJustifications[idx].trim() !== "") {
                  return (
                    <div key={idx} className="bg-white p-4 rounded border border-yellow-100">
                      <p className="text-xs font-bold text-gray-500 mb-1">المورد: <span className="text-gray-900">{v.name}</span></p>
                      <p className="text-sm font-bold text-gray-800 leading-relaxed">{data.pmJustifications[idx]}</p>
                    </div>
                  );
                }
                return null;
              })}
            </div>
          </div>
        )}

        <div className="mt-16 pt-8 border-t-2 border-gray-200">
          <h3 className="text-lg font-black text-[#0D4435] mb-8 text-center">أعضاء لجنة فحص العروض</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {evaluatorsList.map((ev: any, idx: number) => {
              const hasEvaluated = data.itemEvaluations && data.itemEvaluations[idx] !== undefined;
              const evalTimestamp = hasEvaluated ? data.itemEvaluations[idx].timestamp : null;
              
              return (
                <div key={idx} className="text-center">
                  <p className="text-sm font-bold text-gray-900 mb-1">{ev.name}</p>
                  <p className="text-xs text-gray-500 mb-6">{ev.isPM ? "رئيس اللجنة (مدير المشروع)" : "عضو فني"}</p>
                  {hasEvaluated && data.status === "APPROVED" ? (
                    <div className="border border-green-200 bg-green-50 rounded-lg p-2 inline-block">
                      <p className="text-[10px] font-black text-green-700">تم الاعتماد إلكترونياً</p>
                      {evalTimestamp && <p className="text-[9px] text-green-600 mt-0.5" dir="ltr">{formatDateTime(evalTimestamp)}</p>}
                    </div>
                  ) : (
                    <div className="border border-gray-200 bg-gray-50 rounded-lg p-2 inline-block text-gray-400">
                      <p className="text-[10px] font-bold">بانتظار الاعتماد</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="mt-12 text-center text-xs font-bold text-gray-400 no-print">
          <p>هذا المستند معتمد إلكترونياً ولا يحتاج إلى توقيع ورقي في حال اكتمال اعتمادات جميع الأعضاء.</p>
        </div>
      </div>
    </div>
  );
}
`;

fs.writeFileSync('app/print/[id]/page.jsx', fileContent);
console.log('Successfully refactored app/print/[id]/page.jsx');
