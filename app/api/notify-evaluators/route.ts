import { NextRequest, NextResponse } from "next/server";
import { resend, RESEND_FROM_EMAIL } from "@/lib/resend";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function POST(request: NextRequest) {
  if (!resend) {
    return NextResponse.json(
      { success: false, error: "خدمة البريد غير مهيأة على الخادم (RESEND_API_KEY مفقود)" },
      { status: 503 }
    );
  }

  const { evaluationId } = await request.json();
  if (!evaluationId) {
    return NextResponse.json({ error: "Missing evaluationId" }, { status: 400 });
  }

  const { data: evaluation, error } = await supabaseAdmin
    .from("evaluations")
    .select("id, project_name, pr_number, evaluators (name, email)")
    .eq("id", evaluationId)
    .maybeSingle();

  if (error || !evaluation) {
    return NextResponse.json({ error: "Evaluation not found" }, { status: 404 });
  }

  // Always build the link from the public site URL when it's configured —
  // otherwise a notification triggered while testing locally reaches the
  // evaluator with a `localhost` link they can't open.
  const origin = (process.env.NEXT_PUBLIC_SITE_URL || request.nextUrl.origin).replace(/\/+$/, "");
  const link = `${origin}/eval/${evaluationId}`;

  const allEvaluators = evaluation.evaluators || [];
  const evaluators = allEvaluators.filter((e: { email: string }) => e.email?.trim());
  const missingEmail = allEvaluators.length - evaluators.length;

  if (evaluators.length === 0) {
    return NextResponse.json(
      {
        success: false,
        sent: 0,
        total: 0,
        error:
          allEvaluators.length === 0
            ? "لا يوجد مقيّمون مسجّلون على هذا الطلب"
            : "لا يوجد بريد إلكتروني مسجّل لأي من المقيّمين",
      },
      { status: 200 }
    );
  }

  const results = await Promise.allSettled(
    evaluators.map((evaluator: { name: string; email: string }) =>
      resend!.emails.send({
        from: RESEND_FROM_EMAIL,
        to: evaluator.email,
        subject: `طلب تقييم جديد: ${evaluation.project_name}`,
        html: `
          <div dir="rtl" style="font-family: 'Segoe UI', Tahoma, Arial, sans-serif; background-color: #F8FAFC; padding: 32px 16px;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width: 480px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #e5e7eb;">
              <tr>
                <td style="background-color: #0D4435; padding: 24px; text-align: center;">
                  <img src="${origin}/logo.png" alt="نظام قيّم" width="48" height="48" style="display: block; margin: 0 auto 8px; border-radius: 8px;" />
                  <span style="color: #ffffff; font-size: 18px; font-weight: 800;">نظام قيّم</span>
                </td>
              </tr>
              <tr>
                <td style="padding: 28px 24px;">
                  <p style="font-size: 15px; color: #111827; margin: 0 0 16px;">مرحبًا <strong>${evaluator.name}</strong>،</p>
                  <p style="font-size: 14px; color: #374151; line-height: 1.8; margin: 0 0 20px;">
                    لديك <strong style="color: #0D4435;">طلب تقييم جديد</strong> بانتظارك في نظام قيّم، ونحتاج تعبئته في أقرب وقت.
                  </p>
                  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background: #F8FAFC; border: 1px solid #e5e7eb; border-radius: 10px; margin-bottom: 24px;">
                    <tr>
                      <td style="padding: 14px 16px; font-size: 12px; color: #6b7280;">المشروع</td>
                      <td style="padding: 14px 16px; font-size: 13px; color: #111827; font-weight: 700; text-align: left;">${evaluation.project_name}</td>
                    </tr>
                    <tr>
                      <td style="padding: 14px 16px; font-size: 12px; color: #6b7280; border-top: 1px solid #e5e7eb;">رقم الطلب</td>
                      <td style="padding: 14px 16px; font-size: 13px; color: #C5A059; font-weight: 800; text-align: left; border-top: 1px solid #e5e7eb;">${evaluation.pr_number}</td>
                    </tr>
                  </table>
                  <table role="presentation" cellpadding="0" cellspacing="0" style="margin: 0 auto;">
                    <tr>
                      <td style="border-radius: 10px; background-color: #0D4435;">
                        <a href="${link}" style="display: inline-block; padding: 12px 32px; font-size: 14px; font-weight: 800; color: #ffffff; text-decoration: none;">
                          بدء التقييم الآن
                        </a>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
              <tr>
                <td style="background: #F8FAFC; padding: 16px 24px; text-align: center; border-top: 1px solid #e5e7eb;">
                  <p style="font-size: 11px; color: #9ca3af; margin: 0;">برنامج تطوير وزارة الحرس الوطني — نظام قيّم</p>
                </td>
              </tr>
            </table>
          </div>
        `,
      })
    )
  );

  // resend.emails.send() resolves with { data, error } instead of throwing, so
  // `allSettled` reports a rejected send as "fulfilled". Every result has to be
  // inspected, otherwise a request where nothing was delivered still reports a
  // full success and the evaluators are never chased.
  const failures: Array<{ email: string; reason: string }> = [];

  results.forEach((result, index) => {
    const email = evaluators[index].email;
    if (result.status === "rejected") {
      failures.push({ email, reason: String(result.reason?.message || result.reason) });
      return;
    }
    const error = (result.value as { error?: { message?: string } })?.error;
    if (error) {
      failures.push({ email, reason: error.message || "رفض الإرسال" });
    }
  });

  const sent = evaluators.length - failures.length;

  if (failures.length > 0) {
    console.error("Resend rejected evaluator notifications:", failures);
  }

  return NextResponse.json({
    success: failures.length === 0,
    sent,
    total: evaluators.length,
    missingEmail,
    failures,
  });
}
