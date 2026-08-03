import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
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

  // Identity check against the caller's real session — this is what
  // actually stops someone from submitting an evaluation under a different
  // committee member's name; supabaseAdmin below only does the privileged
  // write once this has passed.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { data: evaluation, error: fetchError } = await supabase
    .from("evaluations")
    .select("status, item_evaluations, evaluators (email)")
    .eq("id", id)
    .maybeSingle();

  if (fetchError || !evaluation) {
    return NextResponse.json({ error: "Evaluation not found" }, { status: 404 });
  }

  const matchedEvaluator = (evaluation.evaluators as any[])?.[evaluatorIndex];
  if (!matchedEvaluator || matchedEvaluator.email !== user.email) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
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
