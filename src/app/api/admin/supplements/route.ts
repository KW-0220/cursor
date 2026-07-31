import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getApplication } from "@/lib/applications-registry";
import { getCustomer, getCustomerByEmail } from "@/lib/customer-registry";
import {
  getResendFrom,
  getResendKeySource,
  hasResendKey,
  sendEmail,
} from "@/lib/resend";
import { requireAdminContext } from "@/lib/supabase/context";
import {
  createSupplement,
  listSupplements,
  type SupplementNotifyChannel,
  updateSupplement,
} from "@/lib/supplements-registry";

export const runtime = "nodejs";

const notifySchema = z.enum(["app_push", "email"]);

const createSchema = z.object({
  applicationId: z.string().min(1),
  documentType: z.string().min(1),
  reason: z.string().min(1),
  detail: z.string().min(1),
  dueDate: z.string().min(1),
  required: z.boolean().default(true),
  needOcr: z.boolean().default(true),
  notifyChannels: z
    .array(notifySchema)
    .min(1)
    .default(["app_push", "email"]),
  /** 可覆寫收件電郵；否則用申請／客戶電郵 */
  toEmail: z.string().email().optional().nullable(),
});

function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function buildSupplementEmailHtml(input: {
  applicationId: string;
  documentType: string;
  reason: string;
  detail: string;
  dueDate: string;
  required: boolean;
  applicantNameZh?: string | null;
}) {
  const name = input.applicantNameZh?.trim() || "客戶";
  return `<!DOCTYPE html>
<html lang="zh-Hant">
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color:#0f172a; line-height:1.6;">
  <p>${escapeHtml(name)} 您好，</p>
  <p>我們需要您為貸款申請 <strong>${escapeHtml(input.applicationId)}</strong> 補交文件。</p>
  <ul>
    <li><strong>文件類型：</strong>${escapeHtml(input.documentType)}</li>
    <li><strong>原因：</strong>${escapeHtml(input.reason)}</li>
    <li><strong>說明：</strong>${escapeHtml(input.detail)}</li>
    <li><strong>截止日期：</strong>${escapeHtml(input.dueDate)}</li>
    <li><strong>必要文件：</strong>${input.required ? "是" : "否"}</li>
  </ul>
  <p>請登入 SME LoanFlow 客戶端，於申請詳情頁上載補件。</p>
  <p style="color:#64748b;font-size:12px;">此郵件由系統自動發送（Resend）。如有疑問請回覆顧問跟進。</p>
</body>
</html>`;
}

/**
 * GET /api/admin/supplements
 * ?status=open｜全部
 * 健康：?health=1 → Resend 接駁狀態
 */
export async function GET(req: NextRequest) {
  const gate = await requireAdminContext(req);
  if (gate.error || !gate.data) {
    return NextResponse.json(
      { error: gate.error?.message || "UNAUTHORIZED" },
      { status: "status" in gate ? gate.status : 401 },
    );
  }

  if (req.nextUrl.searchParams.get("health") === "1") {
    return NextResponse.json({
      ok: hasResendKey(),
      resend: {
        configured: hasResendKey(),
        keySource: getResendKeySource(),
        from: getResendFrom(),
      },
      notifyChannels: ["app_push", "email"],
      note: "已移除 SMS；通知方式僅 App Push + 電郵（Resend）",
    });
  }

  const status = req.nextUrl.searchParams.get("status");
  const items = await listSupplements(
    status === "open" || status === "fulfilled" || status === "cancelled"
      ? { status }
      : undefined,
  );
  return NextResponse.json({ ok: true, items });
}

/**
 * POST /api/admin/supplements
 * 建立補件要求並按通知方式發送（App Push 佇列 + Resend 電郵）
 */
export async function POST(req: NextRequest) {
  const gate = await requireAdminContext(req);
  if (gate.error || !gate.data) {
    return NextResponse.json(
      { error: gate.error?.message || "UNAUTHORIZED" },
      { status: "status" in gate ? gate.status : 401 },
    );
  }

  try {
    const raw = await req.json();
    const parsed = createSchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "INVALID_BODY", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const channels = [
      ...new Set(parsed.data.notifyChannels),
    ] as SupplementNotifyChannel[];
    // 硬性禁止 SMS
    if ((channels as string[]).includes("sms")) {
      return NextResponse.json(
        { error: "SMS_REMOVED", message: "通知方式已移除 SMS，請用 App Push／電郵" },
        { status: 400 },
      );
    }

    const app = await getApplication(parsed.data.applicationId.trim());
    if (!app) {
      return NextResponse.json(
        { error: "APPLICATION_NOT_FOUND", message: "找不到該申請編號" },
        { status: 404 },
      );
    }

    let toEmail =
      parsed.data.toEmail?.trim().toLowerCase() ||
      app.email?.trim().toLowerCase() ||
      null;
    let customerId = app.customerId ?? null;
    let companyNameZh = app.companyNameZh ?? null;
    let applicantNameZh = app.applicantNameZh ?? null;

    if (customerId) {
      const c = await getCustomer(customerId).catch(() => null);
      if (c) {
        toEmail = toEmail || c.email.trim().toLowerCase();
        companyNameZh = companyNameZh || c.companyNameZh;
        applicantNameZh = applicantNameZh || c.applicantNameZh;
      }
    } else if (toEmail) {
      const c = await getCustomerByEmail(toEmail).catch(() => null);
      if (c) {
        customerId = c.id;
        companyNameZh = companyNameZh || c.companyNameZh;
        applicantNameZh = applicantNameZh || c.applicantNameZh;
      }
    }

    const wantEmail = channels.includes("email");
    const wantPush = channels.includes("app_push");

    if (wantEmail && !toEmail) {
      return NextResponse.json(
        {
          error: "MISSING_EMAIL",
          message: "此申請未有電郵，請先補上客戶電郵或改用僅 App Push",
        },
        { status: 400 },
      );
    }

    let emailStatus: "skipped" | "sent" | "failed" | "pending" = wantEmail
      ? "pending"
      : "skipped";
    let emailId: string | null = null;
    let emailError: string | null = null;
    let pushStatus: "skipped" | "queued" | "failed" = wantPush
      ? "queued"
      : "skipped";

    const createdBy =
      (
        gate.data.jwtClaims as { email?: string } | null
      )?.email ?? null;

    const record = await createSupplement({
      applicationId: app.id,
      documentType: parsed.data.documentType.trim(),
      reason: parsed.data.reason.trim(),
      detail: parsed.data.detail.trim(),
      dueDate: parsed.data.dueDate.trim(),
      required: parsed.data.required,
      needOcr: parsed.data.needOcr,
      notifyChannels: channels,
      toEmail,
      customerId,
      companyNameZh,
      applicantNameZh,
      emailStatus,
      emailId,
      emailError,
      pushStatus,
      createdBy,
    });

    if (wantEmail && toEmail) {
      if (!hasResendKey()) {
        emailStatus = "failed";
        emailError = "MISSING_RESEND_API_KEY";
      } else {
        const sent = await sendEmail({
          to: toEmail,
          subject: `【SME LoanFlow】補件通知｜${app.id}｜${parsed.data.documentType}`,
          html: buildSupplementEmailHtml({
            applicationId: app.id,
            documentType: parsed.data.documentType,
            reason: parsed.data.reason,
            detail: parsed.data.detail,
            dueDate: parsed.data.dueDate,
            required: parsed.data.required,
            applicantNameZh,
          }),
          text: [
            `申請 ${app.id} 需要補件`,
            `文件：${parsed.data.documentType}`,
            `原因：${parsed.data.reason}`,
            `說明：${parsed.data.detail}`,
            `截止：${parsed.data.dueDate}`,
          ].join("\n"),
        });
        if (sent.ok) {
          emailStatus = "sent";
          emailId = sent.id;
        } else {
          emailStatus = "failed";
          emailError = sent.error;
        }
      }
      await updateSupplement(record.id, {
        emailStatus,
        emailId,
        emailError,
      });
    }

    const updated = (await listSupplements()).find((s) => s.id === record.id);

    return NextResponse.json({
      ok: emailStatus !== "failed",
      item: updated ?? {
        ...record,
        emailStatus,
        emailId,
        emailError,
        pushStatus,
      },
      resend: {
        configured: hasResendKey(),
        keySource: getResendKeySource(),
        from: getResendFrom(),
      },
      message:
        emailStatus === "failed"
          ? `補件已建立，但電郵發送失敗：${emailError}`
          : wantEmail
            ? "補件要求已發送（App Push 已佇列＋電郵已經 Resend 寄出）"
            : "補件要求已建立（僅 App Push）",
    });
  } catch (err) {
    return NextResponse.json(
      {
        error: "CREATE_FAILED",
        message: err instanceof Error ? err.message : "UNKNOWN",
      },
      { status: 500 },
    );
  }
}
