"use client";

import { useState, useEffect, use } from "react";
import { Printer, ArrowRight } from "lucide-react";
import Link from "next/link";

const sarSymbol = "\u20C1";

const getSafeScore = (itemEvals, evalIdx, vendorIdx, critIdx) => {
  if (!itemEvals) return undefined;
  const evalData = itemEvals[evalIdx];
  if (!evalData) return undefined;
  if (evalData.evals && evalData.evals[vendorIdx]) {
    return evalData.evals[vendorIdx][critIdx]?.score;
  }
  if (vendorIdx === 0 && evalData[critIdx]) return evalData[critIdx].score;
  return undefined;
};

const getSafeEvalStatus = (itemEvals, evalIdx, vendorIdx, itemIdx) => {
  if (!itemEvals) return null;
  const evalData = itemEvals[evalIdx];
  if (!evalData) return null;
  if (evalData.evals && evalData.evals[vendorIdx]) {
    return evalData.evals[vendorIdx][itemIdx];
  }
  if (vendorIdx === 0 && evalData[itemIdx]) return evalData[itemIdx];
  return null;
};

const calculateEvfAveragesForVendor = (evalData, vendorIdx) => {
  if (evalData.type !== "EVF" || !evalData.evfCriteria)
    return { criteria: [], total: 0 };
  let totalScore = 0;
  const evaluatorsList = evalData.evaluators?.length
    ? evalData.evaluators
    : [{ name: evalData.evaluatorName || "مقيم 1" }];

  const criteriaStats = evalData.evfCriteria.map((crit, critIndex) => {
    let sum = 0;
    let count = 0;
    evaluatorsList.forEach((_, evalIndex) => {
      const score = getSafeScore(
        evalData.itemEvaluations,
        evalIndex,
        vendorIdx,
        critIndex,
      );
      if (score !== undefined && score !== "") {
        sum += parseFloat(score);
        count++;
      }
    });
    const avgScore = count > 0 ? sum / count : 0;
    const weightedScore = (avgScore / 10) * parseFloat(crit.weight);
    totalScore += weightedScore;
    return {
      avgScore: avgScore.toFixed(2),
      weightedScore: weightedScore.toFixed(2),
    };
  });
  return { criteria: criteriaStats, total: totalScore.toFixed(2) };
};

const getFinalStatusForVendor = (evalData, vendorIdx) => {
  if (evalData.type !== "GENERAL" || !evalData.evaluatedItems)
    return "قيد التقييم";
  let yesCount = 0;
  let noCount = 0;
  let evaluatedCountTotal = 0;
  const evaluatorsList = evalData.evaluators?.length
    ? evalData.evaluators
    : [{ name: "مقيم 1" }];

  evalData.evaluatedItems.forEach((_, itemIdx) => {
    evaluatorsList.forEach((_, evIdx) => {
      const st = getSafeEvalStatus(
        evalData.itemEvaluations,
        evIdx,
        vendorIdx,
        itemIdx,
      );
      if (st) {
        evaluatedCountTotal++;
        if (st.status === "YES") yesCount++;
        if (st.status === "NO") noCount++;
      }
    });
  });

  const expectedTotal = evalData.evaluatedItems.length * evaluatorsList.length;
  if (evaluatedCountTotal < expectedTotal) return "قيد التقييم";
  if (noCount === 0) return "مطابق كلياً";
  if (yesCount === 0) return "غير مطابق";
  return "مطابق جزئياً";
};

const formatDateTime = (isoString) => {
  if (!isoString) return "-";
  const d = new Date(isoString);
  return (
    d.toLocaleDateString("ar-SA") +
    " " +
    d.toLocaleTimeString("ar-SA", { hour: "2-digit", minute: "2-digit" })
  );
};

// @ts-ignore
export default function PrintEvalPage({ params }) {
  const unwrappedParams = use(params);
  // @ts-ignore
  const evalId = unwrappedParams.id;
  const [data, setData] = useState(null);

  useEffect(() => {
    const saved = JSON.parse(
      localStorage.getItem("ladun_workflow_evals") || "[]",
    );
    const item = saved.find((ev) => ev.id === evalId);
    setData(item);
  }, [evalId]);

  if (!data)
    return (
      <div className="min-h-screen flex items-center justify-center font-bold text-gray-500">
        جاري تحميل بيانات التقرير...
      </div>
    );

  // @ts-ignore
  const vendorsList = data.vendors?.length
    ? // @ts-ignore
      data.vendors
    : [
        {
          // @ts-ignore
          name: data.vendorName,
          // @ts-ignore
          quotationPrice: data.quotationPrice,
          // @ts-ignore
          showPrice: data.showPrice !== false,
        },
      ];
  // @ts-ignore
  const evaluatorsList = data.evaluators?.length
    ? // @ts-ignore
      data.evaluators
    : // @ts-ignore
      [{ name: data.evaluatorName || "مقيم 1", isPM: true }];

  const mappedVendors = vendorsList.map((v, idx) => {
    const finalStatus =
      // @ts-ignore
      data.type === "GENERAL"
        ? getFinalStatusForVendor(data, idx)
        : // @ts-ignore
          data.status === "APPROVED"
          ? calculateEvfAveragesForVendor(data, idx).total >= 60
            ? "مؤهل فنياً"
            : "مستبعد"
          : "قيد الإجراء";

    const scoreStr =
      // @ts-ignore
      data.type === "EVF"
        ? calculateEvfAveragesForVendor(data, idx).total
        : "-";
    // @ts-ignore
    const finalScore = data.type === "EVF" ? parseFloat(scoreStr) : 0;

    const isPassed =
      finalStatus === "مؤهل فنياً" || finalStatus === "مطابق كلياً";

    return {
      // @ts-ignore
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
      if (b.finalScore !== a.finalScore) {
        return b.finalScore - a.finalScore;
      }
      return a.originalIndex - b.originalIndex;
    });

  const rankNames = [
    "الأول",
    "الثاني",
    "الثالث",
    "الرابع",
    "الخامس",
    "السادس",
    "السابع",
    "الثامن",
    "التاسع",
    "العاشر",
  ];

  passedVendors.forEach((pv, index) => {
    const indexInMapped = mappedVendors.findIndex(
      (v) => v.originalIndex === pv.originalIndex,
    );
    if (indexInMapped !== -1) {
      mappedVendors[indexInMapped].rank =
        rankNames[index] || (index + 1).toString();
    }
  });

  return (
    <div
      className="min-h-screen bg-gray-100 pb-8 print:py-0 print:bg-white font-sans"
      dir="rtl"
    >
      <style
        dangerouslySetInnerHTML={{
          __html: `
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
      `,
        }}
      />

      <div className="max-w-[210mm] mx-auto pt-20 mb-6 flex justify-between items-center no-print px-4 relative z-[99999]">
        {/* تم تعديل هذا الرابط ليرجع إلى مسار الداشبورد الجديد */}
        <Link
          href="/tech-eval"
          className="inline-flex items-center gap-2 text-sm font-bold text-gray-600 hover:text-[#0D4435] transition-colors bg-white px-4 py-2.5 rounded-lg shadow-sm border border-gray-200 hover:bg-gray-50"
        >
          <ArrowRight size={16} /> العودة للوحة التحكم
        </Link>
        <button
          onClick={() => window.print()}
          className="inline-flex items-center gap-2 bg-[#0D4435] text-white px-6 py-2.5 rounded-lg text-sm font-bold shadow-sm hover:bg-[#0a3529] transition-all active:scale-95 cursor-pointer"
        >
          <Printer size={18} /> طباعة التقرير
        </button>
      </div>

      <div className="max-w-[210mm] min-h-[297mm] mx-auto bg-white shadow-xl print:shadow-none p-10 print:p-0">
        <div className="flex justify-between items-start border-b-2 border-[#0D4435] pb-6 mb-8">
          <div>
            <h1 className="text-2xl font-black text-[#0D4435] mb-2">
              تقرير التقييم الفني للموردين
            </h1>
            <p className="text-sm font-bold text-gray-600">
              {/* @ts-ignore */}
              {data.type === "EVF"
                ? "نموذج التقييم الموزون (EVF)"
                : "نموذج مطابقة المواصفات الفنية"}
            </p>
          </div>
          <div className="text-right">
            <div className="text-xs text-gray-500 font-bold mb-1">
              تاريخ الإصدار
            </div>
            <div className="text-sm font-black text-gray-900" dir="ltr">
              {new Date().toLocaleDateString("ar-SA")}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-6 mb-8">
          <div className="print-bg-gray bg-gray-50 p-4 rounded-lg print-border border border-transparent">
            <p className="text-xs text-gray-500 font-bold mb-1">
              المشروع / القسم
            </p>
            <p className="text-base font-black text-gray-900">
              {/* @ts-ignore */}
              {data.projectName}
            </p>
          </div>
          <div className="print-bg-gray bg-gray-50 p-4 rounded-lg print-border border border-transparent">
            <p className="text-xs text-gray-500 font-bold mb-1">
              رقم الطلب (PR)
            </p>
            <p className="text-base font-black text-[#0D4435]">
              {/* @ts-ignore */}
              {data.prNumber}
            </p>
          </div>
        </div>

        <div className="mb-8">
          <h2 className="text-lg font-black text-[#0D4435] border-b border-gray-200 pb-2 mb-4">
            ملخص العروض والنتائج
          </h2>
          <table className="w-full text-sm text-right border-collapse border border-gray-200">
            <thead className="print-bg-gray bg-gray-50">
              <tr>
                <th className="p-3 border border-gray-200 font-bold text-gray-700">
                  #
                </th>
                <th className="p-3 border border-gray-200 font-bold text-gray-700">
                  اسم المورد
                </th>
                <th className="p-3 border border-gray-200 font-bold text-gray-700 text-center">
                  القيمة المادية
                </th>
                <th className="p-3 border border-gray-200 font-bold text-gray-700 text-center">
                  النتيجة الفنية
                </th>
                <th className="p-3 border border-gray-200 font-bold text-gray-700 text-center">
                  ترتيب الشركة
                </th>
              </tr>
            </thead>
            <tbody>
              {mappedVendors.map((v, idx) => (
                <tr key={idx}>
                  <td className="p-3 border border-gray-200 text-center font-bold text-gray-500">
                    {idx + 1}
                  </td>
                  <td className="p-3 border border-gray-200 font-bold text-gray-900">
                    {v.name}
                  </td>
                  <td className="p-3 border border-gray-200 text-center font-bold">
                    {v.showPrice !== false
                      ? // @ts-ignore
                        `${v.quotationPrice?.toLocaleString()} ${data.type === "EVF" ? "%" : sarSymbol}`
                      : "مخفي"}
                  </td>
                  <td className="p-3 border border-gray-200 text-center font-black">
                    <span
                      className={`${v.finalStatus === "مؤهل فنياً" || v.finalStatus === "مطابق كلياً" ? "text-green-600" : v.finalStatus === "مستبعد" || v.finalStatus === "غير مطابق" ? "text-red-600" : "text-gray-800"}`}
                    >
                      {v.finalStatus}
                    </span>
                    {/* @ts-ignore */}
                    {data.type === "EVF" && v.finalStatus !== "قيد الإجراء" && (
                      <span className="mr-2 text-lg">({v.scoreStr}%)</span>
                    )}
                  </td>
                  <td className="p-3 border border-gray-200 text-center font-black text-[#0D4435] text-base">
                    {v.rank || "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mb-8">
          <h2 className="text-lg font-black text-[#0D4435] border-b border-gray-200 pb-2 mb-4">
            المصفوفة الفنية التفصيلية
          </h2>
          <table className="w-full text-sm text-right border-collapse border border-gray-200">
            <thead className="print-bg-dark bg-[#0D4435] text-white">
              <tr>
                <th className="p-3 border border-gray-300 font-bold w-10 text-center">
                  #
                </th>
                <th className="p-3 border border-gray-300 font-bold">
                  {/* @ts-ignore */}
                  {data.type === "EVF" ? "المعايير الفنية" : "بنود المطابقة"}
                </th>
                {vendorsList.map((v, vIdx) => (
                  <th
                    key={vIdx}
                    className="p-3 border border-gray-300 font-bold text-center"
                  >
                    {/* @ts-ignore */}
                    {v.name}
                    {/* @ts-ignore */}
                    {data.type === "EVF" && (
                      <div className="text-[10px] font-normal opacity-80 mt-1">
                        النسبة الموزونة
                      </div>
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {/* @ts-ignore */}
              {data.type === "EVF"
                ? // @ts-ignore
                  data.evfCriteria.map((crit, cIdx) => (
                    <tr key={cIdx}>
                      <td className="p-3 border border-gray-200 text-center font-bold text-gray-500">
                        {cIdx + 1}
                      </td>
                      <td className="p-3 border border-gray-200 font-bold text-gray-800">
                        {crit.title}
                        <span className="block text-[10px] text-gray-500 mt-1">
                          الوزن: {crit.weight}%
                        </span>
                      </td>
                      {vendorsList.map((_, vIdx) => {
                        const stats = calculateEvfAveragesForVendor(data, vIdx)
                          .criteria[cIdx];
                        return (
                          <td
                            key={vIdx}
                            className="p-3 border border-gray-200 text-center"
                          >
                            <div className="font-black text-[#0D4435] text-sm">
                              {stats?.weightedScore || "-"} %
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  ))
                : // @ts-ignore
                  data.evaluatedItems.map((item, cIdx) => (
                    <tr key={cIdx}>
                      <td className="p-3 border border-gray-200 text-center font-bold text-gray-500">
                        {cIdx + 1}
                      </td>
                      <td className="p-3 border border-gray-200 font-bold text-gray-800">
                        {item}
                      </td>
                      {vendorsList.map((_, vIdx) => {
                        let allYes = true;
                        let anyNo = false;
                        let evaluatedCount = 0;
                        evaluatorsList.forEach((_, evIdx) => {
                          const st = getSafeEvalStatus(
                            // @ts-ignore
                            data.itemEvaluations,
                            evIdx,
                            vIdx,
                            cIdx,
                          );
                          if (st) {
                            evaluatedCount++;
                            if (st.status === "NO") anyNo = true;
                            if (st.status !== "YES") allYes = false;
                          } else {
                            allYes = false;
                          }
                        });
                        const finalItemStatus = anyNo
                          ? "مرفوض"
                          : allYes && evaluatedCount === evaluatorsList.length
                            ? "مطابق"
                            : "قيد التقييم";

                        return (
                          <td
                            key={vIdx}
                            className="p-3 border border-gray-200 text-center font-black"
                          >
                            <span
                              className={
                                finalItemStatus === "مطابق"
                                  ? "text-green-600"
                                  : finalItemStatus === "مرفوض"
                                    ? "text-red-600"
                                    : "text-gray-500"
                              }
                            >
                              {finalItemStatus}
                            </span>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
            </tbody>
          </table>
        </div>

        <div className="page-break"></div>

        <div className="mt-10">
          <h2 className="text-lg font-black text-[#0D4435] border-b border-gray-200 pb-2 mb-6">
            أعضاء لجنة التقييم والاعتمادات
          </h2>
          <div className="grid grid-cols-2 gap-8">
            {evaluatorsList.map((ev, i) => {
              // @ts-ignore
              const evalData = data.itemEvaluations && data.itemEvaluations[i];
              return (
                <div key={i} className="border border-gray-200 rounded-xl p-5">
                  <div className="flex justify-between items-start mb-4 border-b border-gray-100 pb-3">
                    <div>
                      <p className="text-sm font-black text-gray-900">
                        {/* @ts-ignore */}
                        {ev.name}
                      </p>
                      <p className="text-[11px] font-bold text-[#C5A059] mt-1">
                        {/* @ts-ignore */}
                        {ev.isPM ? "مدير المشروع" : "عضو لجنة التقييم"}
                      </p>
                    </div>
                    {evalData ? (
                      <span className="text-[10px] bg-green-50 text-green-700 border border-green-200 px-2 py-1 rounded font-bold">
                        تم الإقرار
                      </span>
                    ) : (
                      <span className="text-[10px] bg-orange-50 text-orange-700 border border-orange-200 px-2 py-1 rounded font-bold">
                        بانتظار الإقرار
                      </span>
                    )}
                  </div>
                  <div className="space-y-3">
                    <div>
                      <p className="text-[10px] text-gray-500 font-bold mb-1">
                        وقت التقييم الفعلي
                      </p>
                      <p className="text-xs font-bold text-gray-800" dir="ltr">
                        {evalData?.timestamp
                          ? formatDateTime(evalData.timestamp)
                          : "---"}
                      </p>
                    </div>
                    <div className="pt-4 mt-2">
                      <p className="text-[10px] text-gray-500 font-bold mb-1">
                        التوقيع:
                      </p>
                      <div className="h-10 border-b-2 border-dashed border-gray-300">
                        {evalData?.declaration && (
                          <span className="text-[10px] italic text-gray-400">
                            {evalData.declaration}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="mt-16 pt-4 border-t border-gray-200 text-center text-[10px] text-gray-400 font-bold">
          تم إنشاء هذا التقرير آلياً من نظام لدن التقني، ولا يعتد به إلا بعد
          استكمال الإقرارات والتواقيع أعلاه.
        </div>
      </div>
    </div>
  );
}
