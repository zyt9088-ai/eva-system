"use client";
import { VENDOR_PERFORMANCE_FLAT_CRITERIA } from '@/lib/evaluation-utils';

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase/client";
import { AppHeader } from "@/components/layout/app-header";
import { AppFooter } from "@/components/layout/app-footer";
import { EvaluatorSelector } from "@/components/features/evaluations/public/evaluator-selector";
import { EvaluationForm } from "@/components/features/evaluations/public/evaluation-form";
import { SuccessScreen, ApprovedScreen, PendingReviewScreen, AlreadySubmittedScreen } from "@/components/features/evaluations/public/status-screens";
import { LoadingScreen } from "@/components/ui/loading-screen";

// Logged-in employees get the app's header/footer + a way back to their
// portal. Anonymous evaluators (external, via a shared link) keep the
// original full-screen, chrome-free look.
function Chrome({ authenticated, children }: { authenticated: boolean; children: React.ReactNode }) {
  if (!authenticated) return <>{children}</>;
  return (
    <div className="min-h-screen flex flex-col" dir="rtl">
      <AppHeader />
      <div className="max-w-5xl mx-auto w-full px-4 pt-6">
        <Link href="/my-tasks" className="inline-flex items-center gap-2 text-sm font-bold text-gray-500 hover:text-[#0D4435] transition-colors">
          <ArrowRight size={16} /> رجوع لطلباتي
        </Link>
      </div>
      <div className="flex-1">{children}</div>
      <AppFooter />
    </div>
  );
}

export default function PublicEvalPage({ params }: { params: any }) {
  const router = useRouter();
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

  const { data: loggedInEmail } = useQuery({
    queryKey: ["current-user-email"],
    queryFn: async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      return user?.email ?? null;
    },
  });

  const [selectedEvaluatorIndex, setSelectedEvaluatorIndex] = useState<number | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [currentEvaluations, setCurrentEvaluations] = useState<any>({});
  const [isAgreed, setIsAgreed] = useState(false);

  const isAuthenticated = !!loggedInEmail;

  // Logged-in employees are matched to their evaluator slot automatically,
  // skipping the "pick your name" screen used by the anonymous public link.
  useEffect(() => {
    if (selectedEvaluatorIndex !== null || !data || !loggedInEmail) return;
    const matchedIndex = data.evaluators?.findIndex((e: any) => e.email === loggedInEmail);
    if (matchedIndex !== undefined && matchedIndex !== -1) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSelectedEvaluatorIndex(matchedIndex);
    }
  }, [data, loggedInEmail, selectedEvaluatorIndex]);

  if (isLoading) {
    return <LoadingScreen />;
  }

  if (!data) {
    return (
      <Chrome authenticated={isAuthenticated}>
        <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center font-bold text-gray-500 text-sm">
          الطلب غير موجود.
        </div>
      </Chrome>
    );
  }

  const matchedIndex = loggedInEmail
    ? data.evaluators?.findIndex((e: any) => e.email === loggedInEmail)
    : -1;
  const alreadySubmitted = matchedIndex !== undefined && matchedIndex !== -1 && data.itemEvaluations?.[matchedIndex] !== undefined;

  if (submitted) return <Chrome authenticated={isAuthenticated}><SuccessScreen /></Chrome>;
  if (data.status === "APPROVED") return <Chrome authenticated={isAuthenticated}><ApprovedScreen /></Chrome>;
  if (data.status === "EVALUATED") return <Chrome authenticated={isAuthenticated}><PendingReviewScreen /></Chrome>;
  if (alreadySubmitted) return <Chrome authenticated={isAuthenticated}><AlreadySubmittedScreen /></Chrome>;

  const evaluatorsList = data.evaluators?.length ? data.evaluators : [{ name: data.evaluatorName || "مقيم 1", email: "", isPM: true }];

  if (selectedEvaluatorIndex === null) {
    return (
      <Chrome authenticated={isAuthenticated}>
        <EvaluatorSelector
          data={data}
          evaluatorsList={evaluatorsList}
          setSelectedEvaluatorIndex={setSelectedEvaluatorIndex}
        />
      </Chrome>
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
    if (isAuthenticated) {
      toast.success("تم إرسال تقييمك بنجاح، بانتظار الاعتماد");
      router.push("/my-tasks");
    } else {
      setSubmitted(true);
    }
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
    <Chrome authenticated={isAuthenticated}>
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
    </Chrome>
  );
}
