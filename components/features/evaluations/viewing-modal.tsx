"use client";
import { useState } from "react";
import { X, CheckCircle2, Calculator, ClipboardList, Briefcase, Users, AlertCircle, Paperclip, Tag, Printer, Clock, Radar as RadarIcon } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { formatDateTime } from "@/lib/formatters";
import { getEvaluatorsList, calculateEvfAveragesForVendor, getFinalStatusForVendor, getSafeEvalStatus, getSafeReason, getSafeScore, getRadarData } from "@/lib/evaluation-utils";
import { supabase } from "@/lib/supabase/client";
import Link from "next/link";

const openVendorAttachment = async (path: string) => {
  const { data, error } = await supabase.storage.from("vendor-attachments").createSignedUrl(path, 60);
  if (error || !data?.signedUrl) {
    toast.error("تعذّر فتح المرفق — تأكد من تسجيل دخولك بحساب مصرّح له");
    return;
  }
  window.open(data.signedUrl, "_blank");
};
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
} from "recharts";

// Criteria titles are free-text and can run long, so the default single-line
// centered tick overlaps its neighbors on a small radar. This wraps each
// label into up to 2 short lines and anchors it away from the chart center,
// with the full title still available via a native <title> tooltip on hover.
const wrapRadarLabel = (text: string, maxCharsPerLine = 12, maxLines = 2) => {
  const words = String(text).trim().split(/\s+/);
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length > maxCharsPerLine && current) {
      lines.push(current);
      current = word;
    } else {
      current = candidate;
    }
    if (lines.length === maxLines) break;
  }
  if (lines.length < maxLines && current) lines.push(current);
  const isTruncated = words.join(" ").length > lines.join(" ").length;
  if (isTruncated && lines.length) {
    lines[lines.length - 1] = lines[lines.length - 1].slice(0, maxCharsPerLine - 1).trimEnd() + "…";
  }
  return lines;
};

const RadarAxisTick = ({ x, y, cx, cy, payload }: any) => {
  const lines = wrapRadarLabel(payload.value);
  const dx = x - cx;
  const anchor = Math.abs(dx) < 6 ? "middle" : dx > 0 ? "start" : "end";
  const startDy = lines.length > 1 ? -6 : 0;
  return (
    <g>
      <title>{payload.value}</title>
      <text x={x} y={y} textAnchor={anchor} fontSize={10} fontWeight={700} fill="#4b5563">
        {lines.map((line, i) => (
          <tspan key={i} x={x} dy={i === 0 ? startDy : 12}>
            {line}
          </tspan>
        ))}
      </text>
    </g>
  );
};

export const ViewingModal = ({ viewingEval, onClose }: any) => {
  const [activeVendorTab, setActiveVendorTab] = useState(0);

  if (!viewingEval) return null;

  return (
    <AnimatePresence>
          {viewingEval && (
            <div
              className="fixed inset-0 z-99999 overflow-y-auto print:overflow-visible custom-scrollbar"
              dir="rtl"
            >
              <div className="flex min-h-full items-center justify-center p-4 sm:p-6 print:p-0">
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 bg-black/70 backdrop-blur-sm print:hidden"
                  onClick={() => onClose()}
                />

                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: 15 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 15 }}
                  transition={{ duration: 0.2 }}
                  className="relative bg-gray-50 rounded-2xl shadow-2xl w-full flex flex-col print:shadow-none print:w-full z-10 my-8"
                  // @ts-ignore
                  style={{
                    maxWidth: viewingEval.type === "EVF" ? "1000px" : "850px",
                  }}
                >
                  <div className="sticky top-0 bg-[#0D4435] px-5 sm:px-6 py-4 flex justify-between items-center shrink-0 z-20 shadow-sm print:relative print:bg-transparent print:border-b print:border-gray-300 rounded-t-2xl print:rounded-none">
                    <div className="flex items-center gap-3 sm:gap-4 text-white">
                      <div className="p-2 bg-white/10 rounded-xl shrink-0">
                        {/* @ts-ignore */}
                        {viewingEval.type === "EVF" ? (
                          <Calculator size={20} className="text-[#C5A059]" />
                        ) : (
                          <ClipboardList size={20} className="text-[#C5A059]" />
                        )}
                      </div>
                      <div>
                        <h2 className="text-lg sm:text-xl font-black print:text-black text-right leading-tight">
                          تقرير {/* @ts-ignore */}
                          {viewingEval.type === "EVF"
                            ? "التقييم الموزون (EVF)"
                            : "المطابقة الفنية"}
                        </h2>
                        <div className="mt-1 flex items-center gap-2 text-[#C5A059]">
                          <Tag size={14} />{" "}
                          <span className="text-xs sm:text-sm font-bold">
                            {/* @ts-ignore */}
                            {viewingEval.prNumber} - {viewingEval.projectName}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2 sm:gap-3 no-print shrink-0">
                      <Link
                        // @ts-ignore
                        href={`/print/${viewingEval.id}`}
                        target="_blank"
                        className="bg-white/10 text-white hover:bg-white/20 px-3 sm:px-4 py-2 rounded-xl flex items-center gap-2 transition-colors text-xs sm:text-sm font-bold"
                      >
                        <Printer size={16} />{" "}
                        <span className="hidden sm:inline">طباعة</span>
                      </Link>
                      <button
                        onClick={() => onClose()}
                        className="bg-white/10 text-white hover:bg-red-500 p-2 rounded-xl transition-colors"
                      >
                        <X size={18} />
                      </button>
                    </div>
                  </div>

                  <div className="p-5 sm:p-6 space-y-6 print:p-0 print:bg-white bg-gray-50/50 rounded-b-2xl">
                    {/* @ts-ignore */}
                    {viewingEval.vendors && viewingEval.vendors.length > 0 && (
                      <div className="flex gap-3 overflow-x-auto custom-scrollbar border-b border-gray-200 pb-4">
                        {/* @ts-ignore */}
                        {viewingEval.vendors.map((v, idx) => (
                          <button
                            key={idx}
                            onClick={() => setActiveVendorTab(idx)}
                            className={`px-5 py-2.5 rounded-xl text-sm font-bold whitespace-nowrap transition-all shadow-sm
                            ${activeVendorTab === idx ? "bg-[#C5A059] text-white border border-[#C5A059]" : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"}`}
                          >
                            {v.name}
                          </button>
                        ))}
                      </div>
                    )}

                    {(() => {
                      // @ts-ignore
                      const currentVendor = viewingEval.vendors
                        ? // @ts-ignore
                          viewingEval.vendors[activeVendorTab]
                        : viewingEval;
                      const finalStatus =
                        // @ts-ignore
                        viewingEval.type === "GENERAL"
                          ? getFinalStatusForVendor(
                              viewingEval,
                              activeVendorTab,
                            )
                          : // @ts-ignore
                            viewingEval.status === "APPROVED" ||
                              viewingEval.status === "EVALUATED" ||
                              viewingEval.status === "AWAITING_JUSTIFICATION"
                            ? Number(calculateEvfAveragesForVendor(viewingEval, activeVendorTab).total) >= 60
                              ? "مؤهل فنياً"
                              : "مستبعد"
                            : "قيد الإجراء";
                      const finalScore =
                        // @ts-ignore
                        viewingEval.type === "EVF"
                          ? calculateEvfAveragesForVendor(
                              viewingEval,
                              activeVendorTab,
                            ).total
                          : "-";

                      return (
                        <motion.div
                          key={activeVendorTab}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="space-y-6"
                        >
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 shrink-0">
                            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 flex items-center gap-3 sm:col-span-2">
                              <div className="w-11 h-11 rounded-full bg-[#C5A059]/10 flex items-center justify-center shrink-0">
                                <Briefcase
                                  size={22}
                                  className="text-[#C5A059]"
                                />
                              </div>
                              <div className="flex-1 overflow-hidden text-right">
                                <p className="text-[11px] text-gray-500 font-bold mb-1">
                                  المورد الحالي
                                </p>
                                <p
                                  className="font-black text-sm text-[#222222] truncate"
                                  title={currentVendor.name}
                                >
                                  {currentVendor.name}
                                </p>
                                {currentVendor.attachmentName && (
                                  currentVendor.attachmentPath ? (
                                    <button
                                      type="button"
                                      onClick={() => openVendorAttachment(currentVendor.attachmentPath)}
                                      className="mt-1 text-[10px] text-blue-600 hover:text-blue-800 flex items-center gap-1 font-bold transition-colors"
                                    >
                                      <Paperclip size={10} />{" "}
                                      {currentVendor.attachmentName}
                                    </button>
                                  ) : (
                                    <div className="mt-1 text-[10px] text-gray-400 flex items-center gap-1 font-bold">
                                      <Paperclip size={10} />{" "}
                                      {currentVendor.attachmentName}
                                    </div>
                                  )
                                )}
                              </div>
                            </div>

                            <div
                              className={`rounded-xl border shadow-sm p-4 flex items-center justify-between gap-3 ${finalStatus === "مؤهل فنياً" || finalStatus === "مطابق كلياً" ? "border-green-200 bg-green-50/50" : finalStatus === "مستبعد" || finalStatus === "غير مطابق" ? "border-red-200 bg-red-50/50" : finalStatus === "مطابق جزئياً" ? "border-blue-200 bg-blue-50/50" : "border-gray-200 bg-white"}`}
                            >
                              <div className="flex flex-col text-right">
                                <p className="text-[11px] text-gray-500 font-bold mb-1">
                                  النتيجة النهائية
                                </p>
                                <span
                                  className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-black shadow-sm text-white ${finalStatus === "مؤهل فنياً" || finalStatus === "مطابق كلياً" ? "bg-green-600" : finalStatus === "مستبعد" || finalStatus === "غير مطابق" ? "bg-red-600" : finalStatus === "مطابق جزئياً" ? "bg-blue-600" : "bg-orange-500"}`}
                                >
                                  {finalStatus}
                                </span>
                              </div>
                              {/* @ts-ignore */}
                              {viewingEval.type === "EVF" &&
                                finalStatus !== "قيد الإجراء" && (
                                  <div
                                    className={`font-black text-2xl ${finalStatus === "مؤهل فنياً" ? "text-green-700" : "text-red-700"}`}
                                  >
                                    {finalScore}%
                                  </div>
                                )}
                            </div>
                          </div>

                          {/* @ts-ignore */}
                          {viewingEval.pmJustifications?.[activeVendorTab] && (
                            <div className="p-4 bg-red-50 border border-red-100 rounded-xl flex items-start gap-3">
                              <AlertCircle
                                size={18}
                                className="text-red-600 shrink-0 mt-0.5"
                              />
                              <div>
                                <h5 className="text-[11px] font-black text-red-800 mb-1">
                                  مبرر الاستبعاد من مدير المشروع:
                                </h5>
                                <p className="text-sm font-bold text-red-700 leading-relaxed">
                                  {/* @ts-ignore */}
                                  {
                                    viewingEval.pmJustifications[
                                      activeVendorTab
                                    ]
                                  }
                                </p>
                              </div>
                            </div>
                          )}

                          <div
                            // @ts-ignore
                            className={`grid grid-cols-1 ${viewingEval.type === "EVF" && finalStatus !== "قيد الإجراء" ? "lg:grid-cols-3" : ""} gap-6 shrink-0`}
                          >
                            <div
                              // @ts-ignore
                              className={`bg-white rounded-xl border border-gray-200 shadow-sm p-5 ${viewingEval.type === "EVF" && finalStatus !== "قيد الإجراء" ? "lg:col-span-2" : ""}`}
                            >
                              <h4 className="font-bold text-[#0D4435] text-sm mb-4 flex items-center gap-2 border-b border-gray-100 pb-3">
                                <Users size={18} className="text-[#C5A059]" />{" "}
                                تقييمات أعضاء اللجنة
                              </h4>
                              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                                {getEvaluatorsList(viewingEval).map((ev: any, i: any) => {
                                  let hasEvaluated = false;
                                  let evalTimestamp = null;
                                  let individualResult = null;

                                  if (
                                    // @ts-ignore
                                    viewingEval.itemEvaluations &&
                                    // @ts-ignore
                                    viewingEval.itemEvaluations[i] &&
                                    // @ts-ignore
                                    viewingEval.itemEvaluations[i].evals
                                  ) {
                                    if (
                                      // @ts-ignore
                                      viewingEval.itemEvaluations[i].evals[
                                        activeVendorTab
                                      ]
                                    ) {
                                      hasEvaluated = true;
                                      evalTimestamp =
                                        // @ts-ignore
                                        viewingEval.itemEvaluations[i]
                                          .timestamp;
                                    }
                                  } else if (
                                    // @ts-ignore
                                    viewingEval.itemEvaluations &&
                                    // @ts-ignore
                                    viewingEval.itemEvaluations[i] &&
                                    activeVendorTab === 0
                                  ) {
                                    hasEvaluated = true;
                                    evalTimestamp =
                                      // @ts-ignore
                                      viewingEval.itemEvaluations[i].timestamp;
                                  }

                                  if (hasEvaluated) {
                                    // @ts-ignore
                                    if (viewingEval.type === "EVF") {
                                      let indTotal = 0;
                                      // @ts-ignore
                                      viewingEval.evfCriteria?.forEach(
                                        // @ts-ignore
                                        (crit, cIdx) => {
                                          const s = getSafeScore(
                                            // @ts-ignore
                                            viewingEval.itemEvaluations,
                                            i,
                                            activeVendorTab,
                                            cIdx,
                                          );
                                          if (s)
                                            indTotal +=
                                              (parseFloat(s) / 10) *
                                              parseFloat(crit.weight);
                                        },
                                      );
                                      individualResult = (
                                        <div className="flex justify-center items-center gap-1 bg-[#0D4435] text-white px-3 py-1.5 rounded-lg w-full shadow-sm mt-3">
                                          <span className="font-black text-sm">
                                            {indTotal.toFixed(2)}
                                          </span>
                                          <span className="text-[10px] text-[#C5A059]">
                                            %
                                          </span>
                                        </div>
                                      );
                                    } else {
                                      let indYesCount = 0;
                                      let indNoCount = 0;
                                      // @ts-ignore
                                      viewingEval.evaluatedItems?.forEach(
                                        (_: any, itemIdx: any) => {
                                          const st = getSafeEvalStatus(
                                            // @ts-ignore
                                            viewingEval.itemEvaluations,
                                            i,
                                            activeVendorTab,
                                            // @ts-ignore
                                            itemIdx,
                                          );
                                          if (st) {
                                            if (st.status === "YES")
                                              indYesCount++;
                                            if (st.status === "NO")
                                              indNoCount++;
                                          }
                                        },
                                      );

                                      if (indNoCount === 0) {
                                        individualResult = (
                                          <div className="text-white font-black text-xs bg-green-600 px-3 py-1.5 rounded-lg text-center w-full shadow-sm mt-3">
                                            مطابق كلياً
                                          </div>
                                        );
                                      } else if (indYesCount === 0) {
                                        individualResult = (
                                          <div className="text-white font-black text-xs bg-red-600 px-3 py-1.5 rounded-lg text-center w-full shadow-sm mt-3">
                                            غير مطابق
                                          </div>
                                        );
                                      } else {
                                        individualResult = (
                                          <div className="text-white font-black text-xs bg-blue-600 px-3 py-1.5 rounded-lg text-center w-full shadow-sm mt-3">
                                            مطابق جزئياً
                                          </div>
                                        );
                                      }
                                    }
                                  }

                                  return (
                                    <div
                                      key={i}
                                      className="bg-gray-50 border border-gray-100 rounded-xl p-4 flex flex-col justify-between relative overflow-hidden transition-all hover:border-[#C5A059]/30"
                                    >
                                      <div className="absolute top-0 right-0 w-7 h-7 bg-[#C5A059]/10 text-[#C5A059] rounded-bl-xl font-black text-[11px] flex items-center justify-center">
                                        {i + 1}
                                      </div>
                                      <div className="pr-5">
                                        <p
                                          className="text-xs font-bold text-[#222222] line-clamp-1"
                                          // @ts-ignore
                                          title={ev.name}
                                        >
                                          {/* @ts-ignore */}
                                          {ev.name}
                                        </p>
                                        <p
                                          className={`text-[10px] font-bold mt-1 ${hasEvaluated ? "text-green-600" : "text-orange-500"}`}
                                        >
                                          {hasEvaluated
                                            ? "تم التقييم"
                                            : "بانتظار التقييم"}
                                        </p>
                                        {hasEvaluated && evalTimestamp && (
                                          <p
                                            className="text-[9px] text-gray-500 font-bold mt-1"
                                            dir="ltr"
                                          >
                                            {formatDateTime(evalTimestamp)}
                                          </p>
                                        )}
                                      </div>
                                      <div className="mt-auto">
                                        {hasEvaluated ? (
                                          individualResult
                                        ) : (
                                          <div className="flex items-center justify-between mt-4 border-t border-gray-200 pt-3">
                                            <Clock
                                              size={16}
                                              className="text-[#C5A059]"
                                            />
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>

                            {/* @ts-ignore */}
                            {viewingEval.type === "EVF" &&
                              finalStatus !== "قيد الإجراء" && (
                                <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 lg:col-span-1 print:break-inside-avoid">
                                  <h4 className="font-bold text-[#0D4435] text-sm mb-3 flex items-center gap-2 border-b border-gray-100 pb-3">
                                    <RadarIcon size={18}
                                      className="text-[#C5A059]"
                                    />{" "}
                                    التحليل البصري
                                  </h4>
                                  <div className="w-full h-70 flex items-center justify-center">
                                    <ResponsiveContainer
                                      width="100%"
                                      height="100%"
                                    >
                                      <RadarChart
                                        cx="50%"
                                        cy="50%"
                                        outerRadius="62%"
                                        data={getRadarData(
                                          viewingEval,
                                          activeVendorTab,
                                        )}
                                      >
                                        <defs>
                                          <linearGradient id="radarFill" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="0%" stopColor="#0D4435" stopOpacity={0.35} />
                                            <stop offset="100%" stopColor="#0D4435" stopOpacity={0.05} />
                                          </linearGradient>
                                        </defs>
                                        <PolarGrid stroke="#e5e7eb" />
                                        <PolarAngleAxis
                                          dataKey="subject"
                                          tick={<RadarAxisTick />}
                                        />
                                        <PolarRadiusAxis
                                          angle={30}
                                          domain={[0, 10]}
                                          axisLine={false}
                                          tick={{
                                            fill: "#c1c8d1",
                                            fontSize: 9,
                                          }}
                                        />
                                        <Radar
                                          name="متوسط التقييم"
                                          dataKey="A"
                                          stroke="#0D4435"
                                          strokeWidth={2}
                                          fill="url(#radarFill)"
                                          dot={{ r: 3, fill: "#0D4435", strokeWidth: 0 }}
                                        />
                                        <RechartsTooltip
                                          contentStyle={{
                                            borderRadius: "10px",
                                            border: "1px solid #e5e7eb",
                                            boxShadow:
                                              "0 4px 12px -2px rgba(0, 0, 0, 0.12)",
                                            fontFamily: "Cairo",
                                            fontSize: "11px",
                                            textAlign: "right",
                                          }}
                                        />
                                      </RadarChart>
                                    </ResponsiveContainer>
                                  </div>
                                </div>
                              )}
                          </div>

                          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 shrink-0 print:break-inside-avoid">
                            <h4 className="font-bold text-[#0D4435] text-sm flex items-center justify-start gap-2 border-b border-gray-100 pb-4 mb-5">
                              <ClipboardList
                                size={20}
                                className="text-[#C5A059]"
                              />{" "}
                              {/* @ts-ignore */}
                              {viewingEval.type === "EVF"
                                ? "مصفوفة التقييم الفني المفصلة"
                                : "تفاصيل بنود المطابقة"}
                            </h4>

                            <div className="grid grid-cols-1 gap-4">
                              {/* @ts-ignore */}
                              {viewingEval.type === "GENERAL" &&
                                // @ts-ignore
                                viewingEval.evaluatedItems?.map(
                                  // @ts-ignore
                                  (item, itemIndex) => {
                                    let allYes = true;
                                    let anyNo = false;
                                    let evaluatedCount = 0;
                                    getEvaluatorsList(viewingEval).forEach(
                                      (_: any, evIdx: any) => {
                                        const st = getSafeEvalStatus(
                                          // @ts-ignore
                                          viewingEval.itemEvaluations,
                                          evIdx,
                                          activeVendorTab,
                                          itemIndex,
                                        );
                                        if (st) {
                                          evaluatedCount++;
                                          if (st.status === "NO") anyNo = true;
                                          if (st.status !== "YES")
                                            allYes = false;
                                        } else {
                                          allYes = false;
                                        }
                                      },
                                    );
                                    const finalItemStatus = anyNo
                                      ? "مرفوض"
                                      : allYes &&
                                          evaluatedCount ===
                                            getEvaluatorsList(viewingEval)
                                              .length
                                        ? "مطابق"
                                        : "قيد التقييم";

                                    return (
                                      <div
                                        key={itemIndex}
                                        className="bg-gray-50 rounded-xl border border-gray-200 p-4 flex flex-col h-full relative overflow-hidden transition-all hover:border-[#C5A059]/30"
                                      >
                                        <div className="absolute top-0 right-0 w-7 h-7 bg-[#C5A059]/10 text-[#C5A059] rounded-bl-xl font-black text-[11px] flex items-center justify-center">
                                          {itemIndex + 1}
                                        </div>

                                        <h5
                                          className="font-bold text-[#222222] text-sm mb-4 pl-2 pr-6 leading-relaxed"
                                          title={item}
                                        >
                                          {item}
                                        </h5>

                                        <div className="flex-1">
                                          <p className="text-[11px] font-bold text-gray-500 mb-2.5">
                                            قرارات الأعضاء:
                                          </p>
                                          <div className="flex flex-wrap gap-2">
                                            {getEvaluatorsList(viewingEval).map(
                                              (ev: any, evIdx: any) => {
                                                const st = getSafeEvalStatus(
                                                  // @ts-ignore
                                                  viewingEval.itemEvaluations,
                                                  evIdx,
                                                  activeVendorTab,
                                                  itemIndex,
                                                );
                                                return (
                                                  <div
                                                    key={evIdx}
                                                    className="flex flex-col gap-1 bg-white border border-gray-200 shadow-sm rounded-lg px-3 py-2"
                                                    // @ts-ignore
                                                    title={ev.name}
                                                  >
                                                    <div className="flex items-center gap-2">
                                                      <span className="text-[10px] text-[#0D4435] font-bold max-w-[60px] truncate">
                                                        {/* @ts-ignore */}
                                                        {ev.name.split(" ")[0]}
                                                      </span>
                                                      {st ? (
                                                        <span
                                                          className={`w-2 h-2 rounded-full ${st.status === "YES" ? "bg-green-500" : "bg-red-500"}`}
                                                        ></span>
                                                      ) : (
                                                        <span className="w-2 h-2 rounded-full bg-gray-300"></span>
                                                      )}
                                                    </div>
                                                    {st?.status === "NO" &&
                                                      st.reason && (
                                                        <p
                                                          className="text-[9px] text-red-600 font-bold bg-red-50 p-1 rounded max-w-[150px] truncate"
                                                          title={st.reason}
                                                        >
                                                          {st.reason}
                                                        </p>
                                                      )}
                                                  </div>
                                                );
                                              },
                                            )}
                                          </div>
                                        </div>

                                        <div className="mt-4 pt-3 border-t border-gray-200 flex items-center justify-between">
                                          <span className="text-[11px] font-bold text-gray-600">
                                            القرار النهائي للبند:
                                          </span>
                                          <span
                                            className={`inline-block text-[11px] font-black px-3 py-1.5 rounded-lg shadow-sm text-white ${finalItemStatus === "مطابق" ? "bg-[#0D4435]" : finalItemStatus === "مرفوض" ? "bg-red-600" : "bg-orange-500"}`}
                                          >
                                            {finalItemStatus}
                                          </span>
                                        </div>
                                      </div>
                                    );
                                  },
                                )}

                              {/* @ts-ignore */}
                              {viewingEval.type === "EVF" &&
                                // @ts-ignore
                                viewingEval.evfCriteria?.map(
                                  // @ts-ignore
                                  (crit, critIndex) => {
                                    const stats = calculateEvfAveragesForVendor(
                                      viewingEval,
                                      activeVendorTab,
                                    ).criteria[critIndex];
                                    return (
                                      <div
                                        key={critIndex}
                                        className="bg-gray-50 rounded-xl border border-gray-200 flex flex-col h-full relative overflow-hidden transition-all hover:border-[#C5A059]/30"
                                      >
                                        <div className="absolute top-0 right-0 w-7 h-7 bg-[#C5A059]/10 text-[#C5A059] rounded-bl-xl font-black text-[11px] flex items-center justify-center z-10">
                                          {critIndex + 1}
                                        </div>

                                        <div className="p-4 flex-1 flex flex-col sm:flex-row gap-6">
                                          <div className="flex-1">
                                            <h5
                                              className="font-bold text-[#222222] text-sm mb-3 pl-2 pr-6 leading-relaxed"
                                              title={crit.title}
                                            >
                                              {crit.title}
                                            </h5>
                                            <div className="inline-flex items-center gap-1.5 bg-white px-2.5 py-1 rounded-lg border border-gray-200 shadow-sm">
                                              <span className="text-[10px] text-gray-600 font-bold">
                                                الوزن:
                                              </span>
                                              <span className="text-xs font-black text-[#C5A059]">
                                                {crit.weight}%
                                              </span>
                                            </div>
                                          </div>

                                          <div className="flex-[2]">
                                            <p className="text-[11px] font-bold text-gray-500 mb-2.5">
                                              درجات الأعضاء (من 10):
                                            </p>
                                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                              {getEvaluatorsList(
                                                viewingEval,
                                              ).map((ev: any, evalIndex: any) => {
                                                const score = getSafeScore(
                                                  // @ts-ignore
                                                  viewingEval.itemEvaluations,
                                                  evalIndex,
                                                  activeVendorTab,
                                                  critIndex,
                                                );
                                                const reason = getSafeReason(
                                                  // @ts-ignore
                                                  viewingEval.itemEvaluations,
                                                  evalIndex,
                                                  activeVendorTab,
                                                  critIndex,
                                                );
                                                return (
                                                  <div
                                                    key={evalIndex}
                                                    className="flex flex-col gap-1 bg-white border border-gray-200 shadow-sm rounded-lg px-2 py-1.5"
                                                    // @ts-ignore
                                                    title={ev.name}
                                                  >
                                                    <div className="flex justify-between items-center">
                                                      <span className="text-[10px] text-gray-600 font-bold truncate mr-1">
                                                        {/* @ts-ignore */}
                                                        {ev.name.split(" ")[0]}
                                                      </span>
                                                      <span
                                                        className={`text-[11px] font-black ${score !== undefined ? "text-[#0D4435]" : "text-gray-300"}`}
                                                      >
                                                        {score !== undefined
                                                          ? score
                                                          : "-"}
                                                      </span>
                                                    </div>
                                                    {reason && (
                                                      <p
                                                        className="text-[9px] text-red-600 font-bold bg-red-50 p-1 rounded mt-1 truncate"
                                                        title={reason}
                                                      >
                                                        {reason}
                                                      </p>
                                                    )}
                                                  </div>
                                                );
                                              })}
                                            </div>
                                          </div>
                                        </div>

                                        <div className="bg-[#0D4435]/5 border-t border-[#0D4435]/10 p-3 flex items-center justify-between">
                                          <div className="flex flex-col items-center flex-1 border-l border-[#0D4435]/10">
                                            <span className="text-[10px] font-bold text-gray-600 mb-0.5">
                                              المتوسط
                                            </span>
                                            <span className="text-sm font-black text-[#222222]">
                                              {stats?.avgScore || "-"}
                                            </span>
                                          </div>
                                          <div className="flex flex-col items-center flex-1">
                                            <span className="text-[10px] font-bold text-gray-600 mb-0.5">
                                              الموزونة
                                            </span>
                                            <span className="text-sm font-black text-[#0D4435]">
                                              {stats?.weightedScore || "-"}
                                            </span>
                                          </div>
                                        </div>
                                      </div>
                                    );
                                  },
                                )}
                            </div>
                          </div>
                        </motion.div>
                      );
                    })()}
                  </div>
                </motion.div>
              </div>
            </div>
          )}
        </AnimatePresence>
  );
};
