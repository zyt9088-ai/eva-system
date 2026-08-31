import { NextRequest, NextResponse } from "next/server";
import { resend, RESEND_FROM_EMAIL } from "@/lib/resend";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { isSecretaryRole } from "@/lib/direct-purchase-types";

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
      return NextResponse.json({
        success: false,
        message: "خدمة البريد غير مهيأة على الخادم (RESEND_API_KEY مفقود)",
      });
    }

    // Always build the link from the public site URL when it's configured —
    // otherwise a notification triggered while testing locally reaches the
    // approver with a `localhost` link they can't open.
    const origin = (process.env.NEXT_PUBLIC_SITE_URL || request.nextUrl.origin).replace(/\/+$/, "");
    // Committee recipients are being asked to work on the minutes themselves,
    // so send them straight to the minutes sheet rather than the overview.
    const goesToMinutes =
      action === "referred_to_committee" ||
      action === "minutes_submitted" ||
      (action === "reminder" &&
        (reqData.status === "pending_committee_secretary" || reqData.status === "pending_committee_approval"));

    const requestLink = goesToMinutes
      ? `${origin}/direct-purchase/${reqData.id}/minutes`
      : `${origin}/direct-purchase/${reqData.id}`;

    let targetEmail = "";
    let targetName = "";
    let subject = "";
    let headerTitle = "طلب اعتماد مبرر شراء مباشر";
    let bodyText = "";
    // Only the reminder path fans out to more than one recipient (a committee,
    // or every admin when the stage isn't owned by a named person).
    let extraRecipients: string[] = [];

    // The minutes are the secretary's job, and the request's own attendee list
    // is empty until the minutes are drafted — so the secretary and their
    // deputy are always resolved from the master committee list.
    const fetchSecretaries = async () => {
      const { data: members } = await supabaseAdmin
        .from("direct_purchase_committee")
        .select("name, email, role");
      return (members || []).filter((m: { role?: string }) => isSecretaryRole(m.role));
    };

    if (action === "referred_to_committee") {
      const secretaries = await fetchSecretaries();

      if (secretaries.length === 0) {
        return NextResponse.json({
          success: false,
          message: "لا يوجد أمين لجنة معيّن — أضِف أمين اللجنة من صفحة لجنة الشراء المباشر",
        });
      }

      targetEmail = secretaries[0].email;
      targetName = secretaries[0].name || "أمين اللجنة";
      extraRecipients = secretaries.slice(1).map((m: { email: string }) => m.email);

      subject = `إحالة طلب شراء مباشر إلى اللجنة: ${reqData.request_title}`;
      headerTitle = "إحالة طلب إلى لجنة الشراء المباشر";
      bodyText = `تمت إحالة طلب الشراء المباشر رقم <strong>${reqData.request_number}</strong> إلى لجنة الشراء المباشر بعد إتمام مراجعة أخصائي المشتريات <strong>${reqData.assigned_specialist_name || ""}</strong>، ويتطلب منكم بصفتكم أمين اللجنة تحديد أعضاء الاجتماع وإعداد محضر اللجنة وتوصيتها.${
        reqData.specialist_notes
          ? `<br/><br/><div style="padding: 12px 16px; background: #f8fafc; border-right: 4px solid #0D4435; border-radius: 8px; font-weight: 700; color: #334155;">ملاحظات الأخصائي: ${reqData.specialist_notes}</div>`
          : ""
      }`;
    }

    if (action === "minutes_submitted") {
      // Everyone the secretary recorded as present has to acknowledge the
      // minutes electronically, so they all get the same message.
      const attendees = (reqData.committee_attendees || [])
        .map((a: { email?: string }) => a?.email)
        .filter(Boolean);

      if (attendees.length === 0) {
        return NextResponse.json({
          success: false,
          message: "لا يوجد أعضاء حضور مسجّلون في المحضر",
        });
      }

      targetEmail = attendees[0];
      targetName = "أعضاء لجنة الشراء المباشر";
      extraRecipients = attendees.slice(1);

      subject = `محضر لجنة الشراء المباشر بانتظار إقراركم: ${reqData.request_title}`;
      headerTitle = "محضر لجنة الشراء المباشر — بانتظار الإقرار";
      bodyText = `قام أمين اللجنة باعتماد محضر اجتماع لجنة الشراء المباشر بشأن الطلب رقم <strong>${reqData.request_number}</strong>، ويتطلب اطلاعكم على المحضر وتوثيق إقراركم الإلكتروني عليه.<br/><br/><div style="padding: 12px 16px; background: ${
        reqData.committee_recommendation === "approved" ? "#ecfdf5" : "#fef2f2"
      }; border-right: 4px solid ${
        reqData.committee_recommendation === "approved" ? "#059669" : "#ef4444"
      }; border-radius: 8px; font-weight: 700; color: #1e293b;">توصية اللجنة: ${
        reqData.committee_recommendation === "approved" ? "الموافقة على الشراء المباشر" : "عدم الموافقة"
      }${reqData.committee_recommendation_reasons ? `<br/>المسوغات: ${reqData.committee_recommendation_reasons}` : ""}</div>`;
    }

    if (action === "committee_completed") {
      // The specialist owns the file, so the committee's verdict goes back to
      // them once every member has signed off.
      targetEmail = reqData.assigned_specialist_email;
      targetName = reqData.assigned_specialist_name || "أخصائي المشتريات";

      if (!targetEmail) {
        return NextResponse.json({
          success: false,
          message: "لا يوجد أخصائي مشتريات مكلّف بهذا الطلب لإبلاغه بقرار اللجنة",
        });
      }

      const approved = reqData.committee_recommendation === "approved";
      subject = `قرار لجنة الشراء المباشر بشأن الطلب: ${reqData.request_title}`;
      headerTitle = "اكتمال قرار لجنة الشراء المباشر";
      bodyText = `اكتملت إقرارات جميع أعضاء لجنة الشراء المباشر على محضر الاجتماع بشأن الطلب رقم <strong>${reqData.request_number}</strong>.<br/><br/><div style="padding: 12px 16px; background: ${
        approved ? "#ecfdf5" : "#fef2f2"
      }; border-right: 4px solid ${approved ? "#059669" : "#ef4444"}; border-radius: 8px; font-weight: 700; color: #1e293b;">قرار اللجنة: ${
        approved ? "الموافقة على الشراء المباشر" : "عدم الموافقة على الشراء المباشر"
      }${reqData.committee_recommendation_reasons ? `<br/>المسوغات: ${reqData.committee_recommendation_reasons}` : ""}</div><br/>يرجى استكمال الإجراءات النظامية بناءً على قرار اللجنة.`;
    }

    if (action === "reminder") {
      // The reminder always targets whoever the request is waiting on *now*,
      // which the status tells us.
      const admins = async () => {
        const { data } = await supabaseAdmin
          .from("profiles")
          .select("email")
          .eq("role", "admin");
        return (data || []).map((p: { email: string }) => p.email).filter(Boolean);
      };

      if (reqData.status === "pending_dept_manager") {
        targetEmail = reqData.dept_manager_email;
        targetName = reqData.dept_manager_name || "مدير الإدارة";
      } else if (reqData.status === "returned_to_requester") {
        targetEmail = reqData.requester_email;
        targetName = reqData.requester_name;
      } else if (reqData.status === "pending_specialist_review") {
        targetEmail = reqData.assigned_specialist_email;
        targetName = reqData.assigned_specialist_name || "أخصائي المشتريات";
      } else if (reqData.status === "pending_committee_secretary") {
        // Nobody is on the attendee list yet at this stage — the request is
        // waiting on the secretary to draft the minutes in the first place.
        const secretaries = await fetchSecretaries();
        targetEmail = secretaries[0]?.email || "";
        targetName = secretaries[0]?.name || "أمين اللجنة";
        extraRecipients = secretaries.slice(1).map((m: { email: string }) => m.email);
      } else if (reqData.status === "pending_committee_approval") {
        // Only chase the members who still haven't acknowledged.
        const pending = (reqData.committee_attendees || [])
          .filter((a: { has_approved?: boolean }) => !a?.has_approved)
          .map((a: { email?: string }) => a?.email)
          .filter(Boolean);
        targetEmail = pending[0] || "";
        targetName = "أعضاء لجنة الشراء المباشر";
        extraRecipients = pending.slice(1);
      } else if (reqData.status === "pending_procurement_assign" || reqData.status === "pending_admin_approval") {
        const adminEmails = await admins();
        targetEmail = adminEmails[0] || "";
        targetName = "مدير المشتريات والعقود";
        extraRecipients = adminEmails.slice(1);
      }

      if (!targetEmail) {
        return NextResponse.json({
          success: false,
          message: "لا يوجد مستلم للتذكير في هذه المرحلة",
        });
      }

      subject = `تذكير بطلب شراء مباشر بانتظار إجراءكم: ${reqData.request_title}`;
      headerTitle = "تذكير بإجراء مطلوب";
      bodyText = `هذا تذكير بأن طلب الشراء المباشر رقم <strong>${reqData.request_number}</strong> ما زال بانتظار إجراءكم، ولم يُتخذ بشأنه قرار حتى الآن. نأمل الاطلاع عليه في أقرب وقت.`;
    }

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
      to: extraRecipients.length > 0 ? [targetEmail, ...extraRecipients] : targetEmail,
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

    // resend.emails.send() resolves with { data, error } instead of throwing,
    // so a rejected send (unverified domain, blocked recipient, rate limit)
    // used to be reported here as a success and vanish silently.
    if (sendResult.error) {
      console.error("Resend rejected the direct purchase notification:", sendResult.error);
      return NextResponse.json(
        {
          success: false,
          error: sendResult.error.message || "تعذّر إرسال البريد",
          to: targetEmail,
        },
        { status: 502 }
      );
    }

    return NextResponse.json({ success: true, sendResult });
  } catch (err: any) {
    console.error("Direct purchase notification error:", err);
    return NextResponse.json({ error: err?.message || "Failed to send notification" }, { status: 500 });
  }
}
