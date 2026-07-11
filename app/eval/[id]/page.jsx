"use client";

import { useState, useEffect, use } from "react";
import {
  CheckCircle2,
  ClipboardList,
  Calculator,
  Paperclip,
  Briefcase,
  Users,
  AlertCircle,
  CalendarClock,
  ShieldAlert,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const sarSymbol = "\u20C1";

const inputClasses =
  "w-full h-11 bg-white border border-gray-300 rounded-lg px-3 text-sm font-semibold text-gray-900 outline-none focus:border-[#0D4435] focus:ring-1 focus:ring-[#0D4435] transition-all placeholder:text-gray-400 shadow-sm";
const primaryBtn =
  "inline-flex items-center justify-center gap-2 rounded-lg bg-[#0D4435] text-white hover:bg-[#0a3529] h-11 px-8 text-sm font-bold shadow-sm transition-all active:scale-95 w-full sm:w-auto disabled:opacity-50 disabled:cursor-not-allowed";

import { getSafeScore, getSafeEvalStatus } from "@/lib/evaluation-utils";

// @ts-ignore
export default function PublicEvalPage({ params }) {
  const unwrappedParams = use(params);
  // @ts-ignore
  const evalId = unwrappedParams.id;

  const [data, setData] = useState(null);
  const [selectedEvaluatorIndex, setSelectedEvaluatorIndex] = useState(null);
  const [submitted, setSubmitted] = useState(false);
  const [currentEvaluations, setCurrentEvaluations] = useState({});
  const [isAgreed, setIsAgreed] = useState(false);

  const [pmJustifications, setPmJustifications] = useState({});

  useEffect(() => {
    const saved = JSON.parse(
      localStorage.getItem("ladun_workflow_evals") || "[]",
    );
    const item = saved.find((ev) => ev.id === evalId);
    if (item) {
      setData(item);
      if (item.pmJustifications) {
        setPmJustifications(item.pmJustifications);
      }
    }
  }, [evalId]);

  // @ts-ignore
  const vendorsList = data?.vendors?.length
    ? // @ts-ignore
      data.vendors
    : [
        {
          // @ts-ignore
          name: data?.vendorName,
          // @ts-ignore
          quotationPrice: data?.quotationPrice,
          // @ts-ignore
          attachmentName: data?.attachmentName,
          // @ts-ignore
          showPrice: data?.showPrice !== false,
        },
      ];

  // @ts-ignore
  const handleItemEval = (vendorIdx, critIdx, status) => {
    setCurrentEvaluations((prev) => ({
      ...prev,
      [vendorIdx]: {
        // @ts-ignore
        ...(prev[vendorIdx] || {}),
        [critIdx]: {
          // @ts-ignore
          ...((prev[vendorIdx] || {})[critIdx] || {}),
          status,
          reason:
            status === "YES"
              ? ""
              : // @ts-ignore
                ((prev[vendorIdx] || {})[critIdx] || {}).reason || "",
        },
      },
    }));
  };

  // @ts-ignore
  const handleItemReason = (vendorIdx, critIdx, reason) => {
    setCurrentEvaluations((prev) => ({
      ...prev,
      [vendorIdx]: {
        // @ts-ignore
        ...(prev[vendorIdx] || {}),
        // @ts-ignore
        [critIdx]: { ...((prev[vendorIdx] || {})[critIdx] || {}), reason },
      },
    }));
  };

  // @ts-ignore
  const handleEvfScore = (vendorIdx, critIdx, val) => {
    let value = parseFloat(val);
    if (value > 10) value = 10;
    if (value < 0) value = 0;
    setCurrentEvaluations((prev) => ({
      ...prev,
      [vendorIdx]: {
        // @ts-ignore
        ...(prev[vendorIdx] || {}),
        [critIdx]: {
          // @ts-ignore
          ...((prev[vendorIdx] || {})[critIdx] || {}),
          score: isNaN(value) ? "" : value,
        },
      },
    }));
  };

  // @ts-ignore
  const handleSubmit = (e) => {
    e.preventDefault();

    const saved = JSON.parse(
      localStorage.getItem("ladun_workflow_evals") || "[]",
    );
    const currentRecord = saved.find((ev) => ev.id === evalId);
    if (!currentRecord) return;

    let allEvaluations = currentRecord.itemEvaluations || {};

    // @ts-ignore
    allEvaluations[selectedEvaluatorIndex] = {
      evals: currentEvaluations,
      timestamp: new Date().toISOString(),
      declaration: "تم الإقرار إلكترونياً",
    };

    const evaluatorsList = currentRecord.evaluators?.length
      ? currentRecord.evaluators
      : [{ name: currentRecord.evaluatorName || "مقيم 1" }];

    let isEveryoneDone = true;
    evaluatorsList.forEach((_, idx) => {
      if (!allEvaluations[idx]) {
        isEveryoneDone = false;
      }
    });

    let overallStatus = currentRecord.status;
    if (isEveryoneDone && overallStatus === "PENDING") {
      overallStatus = "EVALUATED";
    }

    const updated = saved.map((ev) =>
      ev.id === evalId
        ? {
            ...ev,
            status: overallStatus,
            itemEvaluations: allEvaluations,
          }
        : ev,
    );

    localStorage.setItem("ladun_workflow_evals", JSON.stringify(updated));
    setSubmitted(true);
  };

  // @ts-ignore
  const handlePMJustificationSubmit = (e) => {
    e.preventDefault();
    const saved = JSON.parse(
      localStorage.getItem("ladun_workflow_evals") || "[]",
    );
    const updated = saved.map((ev) =>
      ev.id === evalId ? { ...ev, status: "APPROVED", pmJustifications } : ev,
    );
    localStorage.setItem("ladun_workflow_evals", JSON.stringify(updated));
    setSubmitted(true);
  };

  const checkSubmitDisabled = () => {
    if (!isAgreed) return true;
    let disabled = false;
    vendorsList.forEach((_, vIdx) => {
      // @ts-ignore
      if (data.type === "GENERAL") {
        // @ts-ignore
        data.evaluatedItems.forEach((_, cIdx) => {
          // @ts-ignore
          const evalData = currentEvaluations[vIdx]?.[cIdx];
          if (!evalData || !evalData.status) disabled = true;
          if (
            evalData?.status === "NO" &&
            (!evalData.reason || !evalData.reason.trim())
          )
            disabled = true;
        });
      } else {
        // @ts-ignore
        data.evfCriteria.forEach((_, cIdx) => {
          const evalData = currentEvaluations[vIdx]?.[cIdx];
          if (
            !evalData ||
            evalData.score === "" ||
            evalData.score === undefined
          ) {
            disabled = true;
          }
          // التحقق من كتابة التبرير إذا كانت الدرجة أقل من 5
          if (
            evalData &&
            evalData.score !== "" &&
            parseFloat(evalData.score) < 5 &&
            (!evalData.reason || !evalData.reason.trim())
          ) {
            disabled = true;
          }
        });
      }
    });
    return disabled;
  };

  if (!data)
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center font-bold text-gray-500 text-sm">
        جاري التحميل...
      </div>
    );

  if (submitted)
    return (
      <div
        className="min-h-screen flex items-center justify-center bg-[#F8FAFC] px-4 font-sans"
        dir="rtl"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white p-8 rounded-2xl shadow-sm border border-gray-200 text-center max-w-sm w-full"
        >
          <CheckCircle2 size={48} className="mx-auto text-green-600 mb-5" />
          <h1 className="text-xl font-black text-[#0D4435] mb-2">
            تم إرسال التقييم بنجاح
          </h1>
          <p className="text-sm font-bold text-gray-500">
            شكراً لك، تم تسجيل بياناتك واعتمادها في النظام.
          </p>
        </motion.div>
      </div>
    );

  // @ts-ignore
  const evaluatorsList = data.evaluators?.length
    ? // @ts-ignore
      data.evaluators
    : // @ts-ignore
      [{ name: data.evaluatorName || "مقيم 1" }];

  if (selectedEvaluatorIndex === null) {
    return (
      <div
        className="min-h-screen flex items-center justify-center bg-[#F8FAFC] px-4 font-sans"
        dir="rtl"
      >
        <style
          dangerouslySetInnerHTML={{
            __html: `
              @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700;800;900&display=swap');
              * { font-family: 'Cairo', sans-serif !important; }
              header, footer, nav { display: none !important; } 
              body, main { padding-top: 0 !important; margin-top: 0 !important; background-color: #F8FAFC; }
            `,
          }}
        />
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white p-8 rounded-2xl shadow-sm border border-gray-200 max-w-md w-full"
        >
          <div className="mb-6 text-center">
            <div className="w-16 h-16 bg-[#0D4435]/5 rounded-full flex items-center justify-center mx-auto mb-4">
              <Users size={32} className="text-[#0D4435]" />
            </div>
            <h1 className="text-2xl font-black text-[#0D4435]">
              بوابة التقييم الفني
            </h1>
            <p className="text-sm font-bold text-gray-500 mt-2">
              الرجاء اختيار اسمك من قائمة اللجنة للبدء
            </p>
          </div>
          <div className="space-y-3">
            {evaluatorsList.map((ev, idx) => {
              // @ts-ignore
              const isDone =
                data.itemEvaluations && data.itemEvaluations[idx] !== undefined;
              return (
                <button
                  key={idx}
                  // @ts-ignore
                  disabled={isDone}
                  // @ts-ignore
                  onClick={() => setSelectedEvaluatorIndex(idx)}
                  className={`w-full p-4 rounded-xl text-sm font-bold text-right border transition-all flex justify-between items-center
                    // @ts-ignore
                    ${isDone 
                      ? "bg-gray-50 border-gray-200 text-gray-400 cursor-not-allowed opacity-70" 
                      : "bg-white border-gray-300 text-gray-700 hover:border-[#0D4435] hover:text-[#0D4435] hover:shadow-sm active:scale-[0.98]"}`}
                >
                  <span>
                    {ev.name}{" "}
                    {ev.isPM && (
                      <span className="text-[10px] bg-blue-50 text-blue-600 px-2 py-0.5 rounded mr-2">
                        مدير المشروع
                      </span>
                    )}
                  </span>
                  {isDone ? (
                    <span className="text-[10px] bg-gray-200 text-gray-500 px-2.5 py-1 rounded-md flex items-center gap-1">
                      تم التقييم <CheckCircle2 size={12} />
                    </span>
                  ) : (
                    <span className="text-[10px] bg-[#0D4435]/10 text-[#0D4435] px-2.5 py-1 rounded-md opacity-0 transition-opacity">
                      اختر
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </motion.div>
      </div>
    );
  }

  const currentEvaluator = evaluatorsList[selectedEvaluatorIndex];
  const currentEvaluatorName = currentEvaluator.name;
  const isPM = currentEvaluator.isPM;

  // @ts-ignore
  if (data.status === "APPROVED") {
    return (
      <div
        className="min-h-screen flex items-center justify-center bg-[#F8FAFC] px-4 font-sans"
        dir="rtl"
      >
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-200 text-center max-w-sm w-full">
          <CheckCircle2 size={48} className="mx-auto text-green-600 mb-5" />
          <h1 className="text-xl font-black text-[#0D4435] mb-2">
            اكتمل الطلب وتم اعتماده
          </h1>
          <p className="text-sm font-bold text-gray-500">
            تم الانتهاء من التقييم واعتماده بشكل نهائي في النظام.
          </p>
        </div>
      </div>
    );
  }

  // @ts-ignore
  if (data.status === "EVALUATED") {
    return (
      <div
        className="min-h-screen flex items-center justify-center bg-[#F8FAFC] px-4 font-sans"
        dir="rtl"
      >
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-200 text-center max-w-sm w-full">
          <ClipboardList size={48} className="mx-auto text-blue-600 mb-5" />
          <h1 className="text-xl font-black text-[#0D4435] mb-2">
            قيد المراجعة
          </h1>
          <p className="text-sm font-bold text-gray-500">
            اكتمل تقييم جميع الأعضاء والطلب الآن قيد المراجعة من قبل إدارة
            المشتريات.
          </p>
        </div>
      </div>
    );
  }

  

  return (
    <div
      className="min-h-screen bg-[#F8FAFC] py-10 px-4 md:px-6 container mx-auto font-sans"
      dir="rtl"
    >
      <style
        dangerouslySetInnerHTML={{
          __html: `
        @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700;800;900&display=swap');
        * { font-family: 'Cairo', sans-serif !important; }
        header, footer, nav { display: none !important; } 
        body, main { padding-top: 0 !important; margin-top: 0 !important; background-color: #F8FAFC;} 
        input[type="number"]::-webkit-inner-spin-button, input[type="number"]::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; } 
        input[type="number"] { -moz-appearance: textfield; }
      `,
        }}
      />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-5xl mx-auto space-y-6"
      >
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-[#0D4435] flex items-center gap-3 mb-2">
              <div className="p-2 bg-[#C5A059]/10 rounded-lg">
                {/* @ts-ignore */}
                {data.type === "EVF" ? (
                  <Calculator size={24} className="text-[#C5A059]" />
                ) : (
                  <ClipboardList size={24} className="text-[#C5A059]" />
                )}
              </div>
              نموذج التقييم الفني {/* @ts-ignore */}
              {data.type === "EVF" ? "(موزون EVF)" : "(مطابقة مواصفات)"}
            </h1>
            <p className="text-sm font-bold text-gray-500 flex items-center gap-2">
              مرحباً بك،{" "}
              <span className="text-[#0D4435] px-2 py-0.5 bg-[#0D4435]/5 rounded-md border border-[#0D4435]/10">
                {currentEvaluatorName}
              </span>
            </p>
          </div>
          {/* @ts-ignore */}
          {data.deadline && (
            <div className="bg-red-50 text-red-600 border border-red-100 px-4 py-2 rounded-xl text-sm font-black flex items-center gap-2 shrink-0">
              {/* @ts-ignore */}
              <CalendarClock size={18} /> ينتهي التقييم في: {data.deadline}
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-gray-100 pb-5 mb-5">
            <div>
              <p className="text-[11px] text-gray-400 font-bold mb-1 uppercase">
                المشروع
              </p>
              <p className="text-lg font-black text-gray-900 leading-snug">
                {/* @ts-ignore */}
                {data.projectName}
              </p>
            </div>
            <div className="text-right">
              <p className="text-[11px] text-gray-400 font-bold mb-1 uppercase">
                رقم الطلب (PR)
              </p>
              <p className="text-sm font-black text-[#C5A059] bg-[#C5A059]/10 px-3 py-1 rounded-lg w-fit">
                {/* @ts-ignore */}
                {data.prNumber}
              </p>
            </div>
          </div>

          <div>
            <h4 className="font-bold text-[#0D4435] text-sm mb-4 flex items-center gap-2">
              <Briefcase size={18} className="text-[#C5A059]" /> الموردين
              المتنافسين
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {vendorsList.map((v, i) => (
                <div
                  key={i}
                  className="bg-gray-50 rounded-xl p-4 border border-gray-200 flex flex-col justify-between"
                >
                  <div>
                    <p
                      className="font-bold text-sm text-gray-900 truncate mb-1"
                      title={v.name}
                    >
                      {v.name}
                    </p>
                  </div>
                  {v.attachmentName && (
                    <div className="mt-4 pt-3 border-t border-gray-200 text-xs font-bold text-blue-600 flex items-center gap-1.5 cursor-pointer hover:text-blue-800 transition-colors">
                      <Paperclip size={14} />{" "}
                      <span className="truncate">{v.attachmentName}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        <form
          onSubmit={handleSubmit}
          className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden"
        >
          <div className="p-6">
            <h3 className="font-black text-[#0D4435] text-base border-b border-gray-100 pb-4 mb-6">
              {/* @ts-ignore */}
              {data.type === "GENERAL"
                ? "تحديد المطابقة الفنية لكل مورد"
                : "إدخال درجة التقييم (من 0 إلى 10) لكل مورد"}
            </h3>

            <div className="overflow-x-auto custom-scrollbar border border-gray-200 rounded-xl">
              <table className="w-full text-sm text-right whitespace-nowrap">
                <thead className="bg-[#0D4435] text-white">
                  <tr>
                    <th className="py-4 px-4 font-bold w-12 text-center border-l border-[#0a3529]">
                      #
                    </th>
                    <th className="py-4 px-5 font-bold border-l border-[#0a3529]">
                      {/* @ts-ignore */}
                      {data.type === "EVF" ? "المعيار الفني" : "وصف البند"}
                    </th>
                    {/* @ts-ignore */}
                    {data.type === "EVF" && (
                      <th className="py-4 px-4 font-bold text-center border-l border-[#0a3529]">
                        الوزن
                      </th>
                    )}
                    {vendorsList.map((v, vIdx) => (
                      <th
                        key={vIdx}
                        className="py-3 px-4 font-bold text-center border-l border-[#0a3529] text-xs max-w-[150px] truncate bg-[#C5A059]"
                        title={v.name}
                      >
                        مورد {vIdx + 1}
                        <br />
                        <span className="font-normal text-[10px] text-white/90">
                          {v.name}
                        </span>
                        {/* @ts-ignore */}
                        {data.type === "EVF" && (
                          <span className="block text-[11px] text-yellow-200 mt-1 font-black tracking-widest">
                            0 - 10
                          </span>
                        )}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {/* @ts-ignore */}
                  {data.type === "EVF"
                    ? // @ts-ignore
                      data.evfCriteria.map((crit, cIdx) => (
                        <tr
                          key={cIdx}
                          className="hover:bg-gray-50 transition-colors"
                        >
                          <td className="py-4 px-4 text-center font-black text-gray-400 border-l border-gray-200 align-top">
                            {cIdx + 1}
                          </td>
                          <td className="py-4 px-5 font-bold text-gray-900 border-l border-gray-200 whitespace-normal min-w-[200px] align-top">
                            {crit.title}
                          </td>
                          <td className="py-4 px-4 text-center font-black text-[#C5A059] border-l border-gray-200 bg-yellow-50/30 align-top">
                            {crit.weight}%
                          </td>
                          {vendorsList.map((_, vIdx) => {
                const scoreVal = currentEvaluations[vIdx]?.[cIdx]?.score;
                return (
                  <td
                    key={vIdx}
                    className="py-3 px-4 text-center border-l border-gray-200 align-top"
                  >
                    <input
                      type="number"
                      min="0"
                      max="10"
                      step="1"
                      required
                      className="w-20 h-10 mx-auto bg-gray-50 border border-gray-300 rounded-lg text-center font-black text-lg focus:border-[#0D4435] focus:ring-1 focus:ring-[#0D4435] outline-none"
                      value={scoreVal ?? ""}
                      onChange={(e) =>
                        handleEvfScore(vIdx, cIdx, e.target.value)
                      }
                      placeholder="0"
                    />
                    {/* يظهر الحقل ويصبح إجبارياً فقط إذا كانت الدرجة أقل من 5 */}
                    {scoreVal !== "" && scoreVal !== undefined && parseFloat(scoreVal) < 5 && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        className="mt-2"
                      >
                        <input
                          type="text"
                          required
                          className="w-full h-8 bg-white border border-red-200 rounded-lg px-2 text-[11px] font-semibold text-gray-900 outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-all placeholder:text-gray-400 shadow-sm"
                          value={currentEvaluations[vIdx]?.[cIdx]?.reason || ""}
                          onChange={(e) => {
                            setCurrentEvaluations((prev) => ({
                              ...prev,
                              [vIdx]: {
                                ...(prev[vIdx] || {}),
                                [cIdx]: {
                                  ...((prev[vIdx] || {})[cIdx] || {}),
                                  reason: e.target.value,
                                },
                              },
                            }));
                          }}
                          placeholder="يرجى تبرير الدرجة..."
                        />
                      </motion.div>
                    )}
                  </td>
                );
              })}
                        </tr>
                      ))
                    : // @ts-ignore
                      data.evaluatedItems.map((item, cIdx) => (
                        <tr
                          key={cIdx}
                          className="hover:bg-gray-50 transition-colors"
                        >
                          <td className="py-4 px-4 text-center font-black text-gray-400 border-l border-gray-200">
                            {cIdx + 1}
                          </td>
                          <td className="py-4 px-5 font-bold text-gray-900 border-l border-gray-200 whitespace-normal min-w-[200px]">
                            {item}
                          </td>
                          {vendorsList.map((_, vIdx) => {
                            const status =
                              // @ts-ignore
                              currentEvaluations[vIdx]?.[cIdx]?.status;
                            return (
                              <td
                                key={vIdx}
                                className="py-3 px-4 text-center border-l border-gray-200 min-w-[160px] align-top"
                              >
                                <div className="flex justify-center gap-2 mb-2">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleItemEval(vIdx, cIdx, "YES")
                                    }
                                    className={`flex-1 py-2 rounded-lg text-[11px] font-black border transition-all ${status === "YES" ? "bg-green-50 border-green-600 text-green-700 shadow-sm" : "bg-white border-gray-200 text-gray-500 hover:border-gray-300"}`}
                                  >
                                    يطابق
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleItemEval(vIdx, cIdx, "NO")
                                    }
                                    className={`flex-1 py-2 rounded-lg text-[11px] font-black border transition-all ${status === "NO" ? "bg-red-50 border-red-600 text-red-700 shadow-sm" : "bg-white border-gray-200 text-gray-500 hover:border-gray-300"}`}
                                  >
                                    لا يطابق
                                  </button>
                                </div>
                                {status === "NO" && (
                                  <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: "auto" }}
                                  >
                                    <input
                                      type="text"
                                      required
                                      className={`${inputClasses} h-8 text-[11px] border-red-200 focus:border-red-500`}
                                      value={
                                        // @ts-ignore
                                        currentEvaluations[vIdx]?.[cIdx]
                                          ?.reason || ""
                                      }
                                      onChange={(e) =>
                                        handleItemReason(
                                          vIdx,
                                          cIdx,
                                          e.target.value,
                                        )
                                      }
                                      placeholder="يرجى كتابة السبب..."
                                    />
                                  </motion.div>
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                </tbody>
              </table>
            </div>

            <div className="mt-8 pt-6 border-t border-gray-100">
              <label className="flex items-start gap-3 p-4 rounded-xl border cursor-pointer transition-all bg-gray-50 hover:border-[#0D4435]/50">
                <div className="pt-0.5">
                  <input
                    type="checkbox"
                    checked={isAgreed}
                    onChange={(e) => setIsAgreed(e.target.checked)}
                    className="w-5 h-5 text-[#0D4435] rounded border-gray-300 focus:ring-[#0D4435] cursor-pointer"
                  />
                </div>
                <p className="text-sm font-bold text-gray-700 leading-relaxed">
                  أقر أنا "
                  <span className="text-[#0D4435] font-black">
                    {currentEvaluatorName}
                  </span>
                  " بأني من قام بتقييم هذا الطلب بدون ضغوط خارجية وقد اطلعت على
                  الطلب والبنود كاملة ومسؤول عن أي مسائلات في حال التلاعب.
                </p>
              </label>
            </div>
          </div>

          <div className="p-6 border-t border-gray-100 bg-gray-50 flex justify-end">
            <button
              type="submit"
              disabled={checkSubmitDisabled()}
              className={primaryBtn}
            >
              حفظ واعتماد تقييم الموردين
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
