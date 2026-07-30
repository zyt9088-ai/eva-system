import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();
  const { evaluatorIndex, evaluations } = body ?? {};

  if (typeof evaluatorIndex !== "number" || !evaluations) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const { data: evaluation, error: fetchError } = await supabaseAdmin
    .from("evaluations")
    .select("status, item_evaluations, evaluators (id)")
    .eq("id", id)
    .maybeSingle();

  if (fetchError || !evaluation) {
    return NextResponse.json({ error: "Evaluation not found" }, { status: 404 });
  }

  if (evaluation.status === "APPROVED") {
    return NextResponse.json({ error: "Evaluation already approved" }, { status: 409 });
  }

  const allEvaluations = evaluation.item_evaluations || {};
  allEvaluations[evaluatorIndex] = {
    evals: evaluations,
    timestamp: new Date().toISOString(),
    declaration: "تم الإقرار إلكترونياً",
  };

  const evaluatorsCount = evaluation.evaluators?.length || 1;
  const isEveryoneDone = Array.from({ length: evaluatorsCount }).every(
    (_, idx) => allEvaluations[idx] !== undefined
  );

  let overallStatus = evaluation.status;
  if (isEveryoneDone && (overallStatus === "PENDING" || overallStatus === "قيد التجهيز")) {
    overallStatus = "EVALUATED";
  }

  const { error: updateError } = await supabaseAdmin
    .from("evaluations")
    .update({ status: overallStatus, item_evaluations: allEvaluations })
    .eq("id", id);

  if (updateError) {
    return NextResponse.json({ error: "Failed to save evaluation" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
