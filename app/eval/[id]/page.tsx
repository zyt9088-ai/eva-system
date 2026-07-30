"use client";
import { VENDOR_PERFORMANCE_FLAT_CRITERIA } from '@/lib/evaluation-utils';

import { useState, use } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { EvaluatorSelector } from "@/components/features/evaluations/public/evaluator-selector";
import { EvaluationForm } from "@/components/features/evaluations/public/evaluation-form";
import { SuccessScreen, ApprovedScreen, PendingReviewScreen } from "@/components/features/evaluations/public/status-screens";
import { LoadingScreen } from "@/components/ui/loading-screen";

export default function PublicEvalPage({ params }: { params: any }) {
  const unwrappedParams = use(params);
  const evalId = (unwrappedParams as any).id;

  const { data, isLoading } = useQuery({
    queryKey: ["public-eval", evalId],
    queryFn: async () => {
      const res = await fetch(`/api/public-eval/${evalId}`);
      if (!res.ok) return null;
      const json = await res.json();
      return json.data;
    },
  });

  const submitMutation = useMutation({
    mutationFn: async ({ evaluatorIndex, evaluations }: { evaluatorIndex: number; evaluations: any }) => {
      const res = await fetch(`/api/public-eval/${evalId}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ evaluatorIndex, evaluations }),
      });
      if (!res.ok) throw new Error("submit failed");
    },
  });

  const [selectedEvaluatorIndex, setSelectedEvaluatorIndex] = useState<number | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [currentEvaluations, setCurrentEvaluations] = useState<any>({});
  const [isAgreed, setIsAgreed] = useState(false);

  if (isLoading) {
    return <LoadingScreen />;
  }

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

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    await submitMutation.mutateAsync({ evaluatorIndex: selectedEvaluatorIndex, evaluations: currentEvaluations });
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
