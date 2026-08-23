import { NextRequest, NextResponse } from "next/server";
import { resend, RESEND_FROM_EMAIL } from "@/lib/resend";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function POST(request: NextRequest) {
  try {
    const { requestId, action = "created" } = await request.json();
    if (!requestId) {
      return NextResponse.json({ error: "Missing requestId" }, { status: 400 });
    }

    const { data: reqData, error } = await supabaseAdmin
      .from("direct_purchase_requests")
      .select("*")
      .eq("id", requestId)
      .maybeSingle();

    if (error || !reqData) {
      return NextResponse.json({ error: "Direct purchase request not found" }, { status: 404 });
    }

    if (!resend) {
      console.warn("Resend API key is not configured. Skipping email notification.");
      return NextResponse.json({ success: true, warning: "Resend not configured" });
    }

    const origin = request.nextUrl.origin || process.env.NEXT_PUBLIC_SITE_URL || "https://eva-system.mngdp.com";
    const requestLink = `${origin}/direct-purchase/${reqData.id}`;

    let targetEmail = "";
    let targetName = "";
    let subject = "";
    let headerTitle = "طلب اعتماد مبرر شراء مباشر";
    let bodyText = "";

    if (action === "created" || action === "pending_dept_manager") {
      targetEmail = reqData.dept_manager_email;
      targetName = reqData.dept_manager_name || "مدير الإدارة";
      subject = `طلب اعتماد مبرر شراء مباشر جديد: ${reqData.request_title}`;
      headerTitle = "طلب اعتماد مبرر شراء مباشر";
      bodyText = `قام الموظف <strong>${reqData.requester_name}</strong> برفع مبرر شراء مباشر جديد ويتطلب مراجعتكم واعتمادكم للمضي قدماً في إجراءات الشراء.`;
    } else if (action === "dept_manager_approved") {
      targetEmail = reqData.requester_email;
      targetName = reqData.requester_name;
      subject = `تمت موافقة مدير الإدارة على طلبك: ${reqData.request_title}`;
      headerTitle = "موافقة مدير الإدارة";
      bodyText = `تمت الموافقة على طلبك من قِبل مدير الإدارة <strong>${reqData.dept_manager_name || ""}</strong> وتم تحويل الطلب إلى إدارة المشتريات والعقود للدراسة والتدقيق.`;
    } else if (action === "dept_manager_returned") {
      targetEmail = reqData.requester_email;
      targetName = reqData.requester_name;
      subject = `إرجاع طلب الشراء المباشر للتعديل: ${reqData.request_title}`;
      headerTitle = "إرجاع الطلب للتعديل";
      bodyText = `قام مدير الإدارة <strong>${reqData.dept_manager_name || ""}</strong> بإرجاع طلب الشراء المباشر رقم <strong>${reqData.request_number}</strong> لإجراء التعديلات التالية:<br/><br/><div style="padding: 12px 16px; background: #fffbeb; border-right: 4px solid #f59e0b; border-radius: 8px; font-weight: 700; color: #92400e;">${reqData.dept_manager_notes || "يرجى مراجعة وتحديث مبررات الطلب"}</div>`;
    } else if (action === "dept_manager_rejected") {
      targetEmail = reqData.requester_email;
      targetName = reqData.requester_name;
      subject = `عدم الموافقة على طلب الشراء المباشر: ${reqData.request_title}`;
      headerTitle = "رفض مبرر الشراء المباشر";
      bodyText = `نود إفادتكم بأنه تم رفض طلب الشراء المباشر رقم <strong>${reqData.request_number}</strong> من قِبل مدير الإدارة.<br/><br/><div style="padding: 12px 16px; background: #fef2f2; border-right: 4px solid #ef4444; border-radius: 8px; font-weight: 700; color: #991b1b;">أسباب وتبريرات الرفض: ${reqData.dept_manager_notes || "غير معتمد"}</div>`;
    } else if (action === "admin_approved") {
      targetEmail = reqData.requester_email;
      targetName = reqData.requester_name;
      subject = `تم الاعتماد النهائي للطلب: ${reqData.request_title}`;
      headerTitle = "الاعتماد النهائي لمبرر الشراء المباشر";
      bodyText = `نود إفادتكم بأنه تم الاعتماد النهائي لمبرر الشراء المباشر رقم <strong>${reqData.request_number}</strong> بنجاح.`;
    }

    if (!targetEmail) {
      return NextResponse.json({ success: true, message: "No target email specified" });
    }

    const sendResult = await resend.emails.send({
      from: RESEND_FROM_EMAIL,
      to: targetEmail,
      subject: subject,
      html: `
        <div dir="rtl" style="font-family: 'Segoe UI', Tahoma, Arial, sans-serif; background-color: #F8FAFC; padding: 32px 16px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width: 520px; margin: 0 auto; background: #ffffff; border-radius: 20px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 12px rgba(0,0,0,0.03);">
            <tr>
              <td style="background-color: #0D4435; padding: 28px 24px; text-align: center;">
                <h2 style="color: #ffffff; font-size: 20px; font-weight: 900; margin: 0 0 6px;">نظام قيّم</h2>
                <p style="color: #C5A059; font-size: 13px; font-weight: 700; margin: 0;">${headerTitle}</p>
              </td>
            </tr>
            <tr>
              <td style="padding: 32px 24px;">
                <p style="font-size: 15px; color: #111827; font-weight: 700; margin: 0 0 16px;">مرحباً <strong>${targetName}</strong>،</p>
                <p style="font-size: 13px; color: #374151; line-height: 1.8; margin: 0 0 24px;">
                  ${bodyText}
                </p>
                
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background: #F8FAFC; border: 1px solid #e2e8f0; border-radius: 12px; margin-bottom: 24px;">
                  <tr>
                    <td style="padding: 12px 16px; font-size: 12px; color: #64748b; font-weight: 700;">رقم الطلب</td>
                    <td style="padding: 12px 16px; font-size: 13px; color: #0D4435; font-weight: 900; text-align: left;">${reqData.request_number}</td>
                  </tr>
                  <tr>
                    <td style="padding: 12px 16px; font-size: 12px; color: #64748b; font-weight: 700; border-top: 1px solid #e2e8f0;">عنوان الطلب</td>
                    <td style="padding: 12px 16px; font-size: 13px; color: #1e293b; font-weight: 800; text-align: left; border-top: 1px solid #e2e8f0;">${reqData.request_title}</td>
                  </tr>
                  <tr>
                    <td style="padding: 12px 16px; font-size: 12px; color: #64748b; font-weight: 700; border-top: 1px solid #e2e8f0;">التكلفة التقديرية</td>
                    <td style="padding: 12px 16px; font-size: 13px; color: #C5A059; font-weight: 900; text-align: left; border-top: 1px solid #e2e8f0;">${Number(reqData.estimated_cost).toLocaleString()} ريال</td>
                  </tr>
                  <tr>
                    <td style="padding: 12px 16px; font-size: 12px; color: #64748b; font-weight: 700; border-top: 1px solid #e2e8f0;">صاحب الطلب</td>
                    <td style="padding: 12px 16px; font-size: 13px; color: #1e293b; font-weight: 700; text-align: left; border-top: 1px solid #e2e8f0;">${reqData.requester_name} (${reqData.department || ""})</td>
                  </tr>
                </table>

                <div style="text-align: center; margin: 32px 0 16px;">
                  <a href="${requestLink}" target="_blank" style="background-color: #0D4435; color: #ffffff; padding: 14px 32px; border-radius: 12px; font-size: 14px; font-weight: 800; text-decoration: none; display: inline-block; box-shadow: 0 2px 6px rgba(13, 68, 53, 0.2);">
                    عرض الطلب واتخاذ الإجراء
                  </a>
                </div>
              </td>
            </tr>
            <tr>
              <td style="padding: 16px 24px; background: #F8FAFC; text-align: center; border-top: 1px solid #e2e8f0; font-size: 11px; color: #94a3b8; font-weight: 600;">
                هذا البريد تم إرساله تلقائياً من نظام قيّم لإدارة المشتريات والعقود.
              </td>
            </tr>
          </table>
        </div>
      `,
    });

    return NextResponse.json({ success: true, sendResult });
  } catch (err: any) {
    console.error("Direct purchase notification error:", err);
    return NextResponse.json({ error: err?.message || "Failed to send notification" }, { status: 500 });
  }
}
