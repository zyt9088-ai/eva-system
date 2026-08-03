"use client";
import { VENDOR_PERFORMANCE_FLAT_CRITERIA } from '@/lib/evaluation-utils';

import { use } from "react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowRight, ShieldAlert } from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { AppHeader } from "@/components/layout/app-header";
import { AppFooter } from "@/components/layout/app-footer";
import { EvaluationForm } from "@/components/features/evaluations/public/evaluation-form";
import { ApprovedScreen, PendingReviewScreen, AlreadySubmittedScreen } from "@/components/features/evaluations/public/status-screens";
import { LoadingScreen } from "@/components/ui/loading-screen";

// This route is gated by proxy.ts — only an authenticated session ever
// reaches this component, so the app's normal header/footer/back-link
// always apply (no more anonymous, chrome-free public link).
function Chrome({ children }: { children: React.ReactNode }) {
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

function NotCommitteeMemberScreen() {
  return (
    <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center px-4">
      <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-200 text-center max-w-sm w-full">
        <ShieldAlert size={48} className="mx-auto text-orange-500 mb-5" />
        <h1 className="text-xl font-black text-[#0D4435] mb-2">لست ضمن أعضاء لجنة هذا الطلب</h1>
        <p className="text-sm font-bold text-gray-500">هذا الطلب غير مخصص لك للتقييم.</p>
      </div>
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

  const [currentEvaluations, setCurrentEvaluations] = useState<any>({});
  const [isAgreed, setIsAgreed] = useState(false);

  if (isLoading) {
    return <LoadingScreen />;
  }

  if (!data) {
    return (
      <Chrome>
        <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center font-bold text-gray-500 text-sm">
          الطلب غير موجود.
        </div>
      </Chrome>
    );
  }

  const matchedIndex = data.myEmail
    ? data.evaluators?.findIndex((e: any) => e.email === data.myEmail)
    : -1;

  const mySubmission = matchedIndex !== -1 ? data.itemEvaluations?.[matchedIndex] : undefined;

  const evaluatorsList = data.evaluators;
  const vendorsList = data.vendors?.length ? data.vendors : [{ name: data.vendorName, attachmentName: data.attachmentName }];

  // After approval, a committee member who already submitted sees their own
  // evaluation read-only instead of the generic ApprovedScreen; anyone else
  // (no submission, or not on the committee) still gets the generic screen.
  if (data.status === "APPROVED") {
    if (mySubmission) {
      return (
        <Chrome>
          <EvaluationForm
            data={data}
            vendorsList={vendorsList}
            currentEvaluatorName={evaluatorsList[matchedIndex].name}
            currentEvaluations={mySubmission.evals || {}}
            handleItemEval={() => {}}
            handleItemReason={() => {}}
            handleEvfScore={() => {}}
            isAgreed={true}
            setIsAgreed={() => {}}
            handleSubmit={(e: any) => e.preventDefault()}
            checkSubmitDisabled={() => true}
            setCurrentEvaluations={() => {}}
            readOnly
          />
        </Chrome>
      );
    }
    return <Chrome><ApprovedScreen /></Chrome>;
  }
  if (data.status === "EVALUATED") return <Chrome><PendingReviewScreen /></Chrome>;

  if (matchedIndex === undefined || matchedIndex === -1) {
    return <Chrome><NotCommitteeMemberScreen /></Chrome>;
  }

  if (mySubmission) return <Chrome><AlreadySubmittedScreen /></Chrome>;

  const currentEvaluator = evaluatorsList[matchedIndex];

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
    await submitMutation.mutateAsync({ evaluatorIndex: matchedIndex, evaluations: currentEvaluations });
    toast.success("تم إرسال تقييمك بنجاح، بانتظار الاعتماد");
    router.push("/my-tasks");
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
    <Chrome>
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
