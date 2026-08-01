"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ClipboardList, CheckCircle2, ArrowLeft, Inbox } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { mapEvaluationRow } from "@/lib/evaluation-utils";
import { AppHeader } from "@/components/layout/app-header";
import { LoadingScreen } from "@/components/ui/loading-screen";

export default function MyTasksPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["my-tasks"],
    queryFn: async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user?.email) return { pending: [], completed: [] };

      const { data: myEvaluatorRows } = await supabase
        .from("evaluators")
        .select("evaluation_id")
        .eq("email", user.email);

      const evaluationIds = [...new Set((myEvaluatorRows || []).map((r) => r.evaluation_id))];
      if (evaluationIds.length === 0) return { pending: [], completed: [] };

      const { data: rows } = await supabase
        .from("evaluations")
        .select(
          `
          *,
          vendors (*),
          evaluators (*),
          evf_criteria (*),
          evaluated_items (*)
        `
        )
        .in("id", evaluationIds)
        .order("created_at", { ascending: false });

      const pending: any[] = [];
      const completed: any[] = [];

      (rows || []).map(mapEvaluationRow).forEach((ev: any) => {
        const myIndex = ev.evaluators.findIndex((e: any) => e.email === user.email);
        const isDone = ev.itemEvaluations?.[myIndex] !== undefined;
        const entry = { ...ev, myIndex };
        if (isDone || ev.status === "APPROVED") {
          completed.push(entry);
        } else {
          pending.push(entry);
        }
      });

      return { pending, completed };
    },
  });

  if (isLoading) return <LoadingScreen />;

  const pending = data?.pending || [];
  const completed = data?.completed || [];

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
      <main className="flex-1 p-6 lg:p-10 max-w-4xl mx-auto w-full">
        <div className="mb-8">
          <h1 className="text-2xl font-black text-[#0D4435]">طلباتي</h1>
          <p className="text-sm font-bold text-gray-500 mt-1">
            الطلبات المطلوب منك تقييمها، والطلبات اللي سبق قيّمتها
          </p>
        </div>

        <section className="mb-10">
          <h2 className="font-black text-gray-800 text-sm mb-4 flex items-center gap-2">
            <ClipboardList size={16} className="text-[#C5A059]" /> بانتظار تقييمك
          </h2>
          {pending.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center text-sm font-bold text-gray-400 flex flex-col items-center gap-2">
              <Inbox size={28} className="text-gray-300" />
              لا يوجد طلبات بانتظار تقييمك حاليًا
            </div>
          ) : (
            <div className="space-y-3">
              {pending.map((ev: any) => (
                <Link
                  key={ev.id}
                  href={`/eval/${ev.id}`}
                  className="flex items-center justify-between bg-white rounded-2xl border border-gray-100 shadow-sm p-5 hover:border-[#C5A059] transition-colors group"
                >
                  <div>
                    <p className="font-black text-gray-900">{ev.projectName}</p>
                    <p className="text-xs font-bold text-gray-400 mt-1">رقم الطلب: {ev.prNumber}</p>
                  </div>
                  <ArrowLeft size={18} className="text-gray-300 group-hover:text-[#C5A059] transition-colors" />
                </Link>
              ))}
            </div>
          )}
        </section>

        <section>
          <h2 className="font-black text-gray-800 text-sm mb-4 flex items-center gap-2">
            <CheckCircle2 size={16} className="text-[#0D4435]" /> تقييمات سابقة
          </h2>
          {completed.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center text-sm font-bold text-gray-400">
              ما فيه تقييمات سابقة بعد
            </div>
          ) : (
            <div className="space-y-3">
              {completed.map((ev: any) => (
                <Link
                  key={ev.id}
                  href={`/eval/${ev.id}`}
                  className="flex items-center justify-between bg-white/80 rounded-2xl border border-gray-100 p-5 hover:border-gray-300 transition-colors group"
                >
                  <div>
                    <p className="font-bold text-gray-600">{ev.projectName}</p>
                    <p className="text-xs font-bold text-gray-400 mt-1">رقم الطلب: {ev.prNumber}</p>
                  </div>
                  <span className="text-[10px] font-black text-gray-400 bg-gray-100 px-2.5 py-1 rounded-md">
                    مكتمل
                  </span>
                </Link>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
