"use client";
import { VENDOR_PERFORMANCE_FLAT_CRITERIA } from '@/lib/evaluation-utils';

import { useState, use } from "react";
import { useEvaluations } from "@/hooks/useEvaluations";
import { EvaluatorSelector } from "@/components/features/evaluations/public/evaluator-selector";
import { EvaluationForm } from "@/components/features/evaluations/public/evaluation-form";
import { SuccessScreen, ApprovedScreen, PendingReviewScreen } from "@/components/features/evaluations/public/status-screens";
import { LoadingScreen } from "@/components/ui/loading-screen";

export default function PublicEvalPage({ params }: { params: any }) {
  const unwrappedParams = use(params);
  const evalId = (unwrappedParams as any).id;

  const { evaluations, isLoaded, saveEvaluation } = useEvaluations();
  const [selectedEvaluatorIndex, setSelectedEvaluatorIndex] = useState<number | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [currentEvaluations, setCurrentEvaluations] = useState<any>({});
  const [isAgreed, setIsAgreed] = useState(false);

  if (!isLoaded) {
    return <LoadingScreen />;
  }

  const data: any = evaluations.find((ev: any) => ev.id === evalId);

  if (!data) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center font-bold text-gray-500 text-sm">
        الطلب غير موجود.
      </div>
    );
  }

  if (submitted) return <SuccessScreen />;
  if (data.status === "APPROVED") return <ApprovedScreen />;
  if (data.status === "EVALUATED") return <PendingReviewScreen />;

  const evaluatorsList = data.evaluators?.length ? data.evaluators : [{ name: data.evaluatorName || "مقيم 1", email: "", isPM: true }];

  if (selectedEvaluatorIndex === null) {
    return (
      <EvaluatorSelector 
        data={data} 
        evaluatorsList={evaluatorsList} 
        setSelectedEvaluatorIndex={setSelectedEvaluatorIndex} 
      />
    );
  }

  const currentEvaluator = evaluatorsList[selectedEvaluatorIndex];
  const vendorsList = data.vendors?.length ? data.vendors : [{ name: data.vendorName, attachmentName: data.attachmentName }];

  const handleItemEval = (vendorIdx: number, critIdx: number, status: string) => {
    setCurrentEvaluations((prev: any) => ({
      ...prev,
      [vendorIdx]: {
        ...(prev[vendorIdx] || {}),
        [critIdx]: {
          ...((prev[vendorIdx] || {})[critIdx] || {}),
          status,
          reason: status === "YES" ? "" : ((prev[vendorIdx] || {})[critIdx] || {}).reason || "",
        },
      },
    }));
  };

  const handleItemReason = (vendorIdx: number, critIdx: number, reason: string) => {
    setCurrentEvaluations((prev: any) => ({
      ...prev,
      [vendorIdx]: {
        ...(prev[vendorIdx] || {}),
        [critIdx]: { ...((prev[vendorIdx] || {})[critIdx] || {}), reason },
      },
    }));
  };

  const handleEvfScore = (vendorIdx: number, critIdx: number, val: string) => {
    let value = parseFloat(val);
    if (data.type === "VENDOR_PERFORMANCE") {
      if (value > 100) value = 100;
    } else {
      if (value > 10) value = 10;
    }
    if (value < 0) value = 0;
    setCurrentEvaluations((prev: any) => ({
      ...prev,
      [vendorIdx]: {
        ...(prev[vendorIdx] || {}),
        [critIdx]: {
          ...((prev[vendorIdx] || {})[critIdx] || {}),
          score: isNaN(value) ? "" : value,
        },
      },
    }));
  };

  const handleSubmit = (e: any) => {
    e.preventDefault();

    let allEvaluations = data.itemEvaluations || {};
    allEvaluations[selectedEvaluatorIndex] = {
      evals: currentEvaluations,
      timestamp: new Date().toISOString(),
      declaration: "تم الإقرار إلكترونياً",
    };

    let isEveryoneDone = true;
    evaluatorsList.forEach((_: any, idx: number) => {
      if (!allEvaluations[idx]) isEveryoneDone = false;
    });

    let overallStatus = data.status;
    if (isEveryoneDone && (overallStatus === "PENDING" || overallStatus === "قيد التجهيز")) {
      overallStatus = "EVALUATED";
    }

    const updated = {
      ...data,
      status: overallStatus,
      itemEvaluations: allEvaluations,
    };

    saveEvaluation(updated, true);
    setSubmitted(true);
  };

  const checkSubmitDisabled = () => {
    if (!isAgreed) return true;
    let disabled = false;
    vendorsList.forEach((_: any, vIdx: number) => {
      if (data.type === "GENERAL") {
        data.evaluatedItems.forEach((_: any, cIdx: number) => {
          const evalData = currentEvaluations[vIdx]?.[cIdx];
          if (!evalData || !evalData.status) disabled = true;
          if (evalData?.status === "NO" && (!evalData.reason || !evalData.reason.trim())) disabled = true;
        });
      } else if (data.type === "VENDOR_PERFORMANCE") {
        VENDOR_PERFORMANCE_FLAT_CRITERIA.forEach((_: any, cIdx: number) => {
          const evalData = currentEvaluations[vIdx]?.[cIdx];
          if (!evalData || evalData.score === "" || evalData.score === undefined) disabled = true;
          if (evalData && evalData.score !== "" && parseFloat(evalData.score) < 70 && (!evalData.reason || !evalData.reason.trim())) disabled = true;
        });
      } else {
        data.evfCriteria.forEach((_: any, cIdx: number) => {
          const evalData = currentEvaluations[vIdx]?.[cIdx];
          if (!evalData || evalData.score === "" || evalData.score === undefined) disabled = true;
          if (evalData && evalData.score !== "" && parseFloat(evalData.score) < 5 && (!evalData.reason || !evalData.reason.trim())) disabled = true;
        });
      }
    });
    return disabled;
  };

  return (
    <EvaluationForm 
      data={data}
      vendorsList={vendorsList}
      currentEvaluatorName={currentEvaluator.name}
      currentEvaluations={currentEvaluations}
      handleItemEval={handleItemEval}
      handleItemReason={handleItemReason}
      handleEvfScore={handleEvfScore}
      isAgreed={isAgreed}
      setIsAgreed={setIsAgreed}
      handleSubmit={handleSubmit}
      checkSubmitDisabled={checkSubmitDisabled}
      setCurrentEvaluations={setCurrentEvaluations}
    />
  );
}
