import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { mapEvaluationRow } from "@/lib/evaluation-utils";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const { data, error } = await supabaseAdmin
    .from("evaluations")
    .select(
      `
      id, pr_number, project_name, deadline, type, current_total_weight,
      created_at, status, item_evaluations,
      vendors (*),
      evaluators (*),
      evf_criteria (*),
      evaluated_items (*)
    `
    )
    .eq("id", id)
    .maybeSingle();

  if (error || !data) {
    return NextResponse.json({ error: "Evaluation not found" }, { status: 404 });
  }

  return NextResponse.json({ data: mapEvaluationRow(data) });
}
