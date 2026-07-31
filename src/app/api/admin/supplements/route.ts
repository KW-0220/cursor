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
import {
  buildSupplementEmailHtml,
  buildSupplementEmailSubject,
  buildSupplementEmailText,
} from "@/lib/supplement-email";
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
  /** 常用原因模板（下拉原文） */
  reasonTemplate: z.string().min(1),
  /** 補交原因（可人手修改） */
  reason: z.string().min(1),
  detail: z.string().optional().default(""),
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

    const emailFields = {
      applicationId: app.id,
      documentType: parsed.data.documentType.trim(),
      reasonTemplate: parsed.data.reasonTemplate.trim(),
      reason: parsed.data.reason.trim(),
      detail: parsed.data.detail?.trim() || "",
      dueDate: parsed.data.dueDate.trim(),
      required: parsed.data.required,
      needOcr: parsed.data.needOcr,
      applicantNameZh,
      companyNameZh,
    };
    const emailSubject = buildSupplementEmailSubject(emailFields);
    const emailHtml = buildSupplementEmailHtml(emailFields);
    const emailText = buildSupplementEmailText(emailFields);

    const createdBy =
      (
        gate.data.jwtClaims as { email?: string } | null
      )?.email ?? null;

    const record = await createSupplement({
      applicationId: app.id,
      documentType: emailFields.documentType,
      reasonTemplate: emailFields.reasonTemplate,
      reason: emailFields.reason,
      detail: emailFields.detail,
      dueDate: emailFields.dueDate,
      required: parsed.data.required,
      needOcr: parsed.data.needOcr,
      notifyChannels: channels,
      toEmail,
      customerId,
      companyNameZh,
      applicantNameZh,
      emailSubject,
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
          subject: emailSubject,
          html: emailHtml,
          text: emailText,
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
        emailSubject,
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
        emailSubject,
        pushStatus,
      },
      emailPreview: {
        subject: emailSubject,
        text: emailText,
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
            ? "已按選項生成客製化電郵並經 Resend 寄出（App Push 已佇列）"
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
