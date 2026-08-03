import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { mapEvaluationRow } from "@/lib/evaluation-utils";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // No service_role here on purpose: RLS on `evaluations` already scopes
  // this to admin, the specialist who created it, or anyone whose email
  // matches an evaluator on it — an unauthenticated or unrelated caller
  // just gets no row back, same as a genuinely missing id.
  const { data, error } = await supabase
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

  return NextResponse.json({ data: { ...mapEvaluationRow(data), myEmail: user?.email ?? null } });
}
