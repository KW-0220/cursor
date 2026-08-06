import "server-only";
import type {
  BizApplication,
  BizWhatsAppMessage,
  WhatsAppSendStatus,
} from "@/lib/bizdoc/types";
import {
  getPublicAppBaseUrl,
  getReviewerWhatsAppNumbers,
  sendWhatsAppMessage,
} from "@/lib/bizdoc/whatsapp";

export type BizNotifyEvent =
  | "submitted"
  | "supplement"
  | "docs_complete"
  | "reviewer_new_application"
  | "reviewer_resubmit";

function msgId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
}

async function deliver(
  phone: string,
  content: string,
  type: BizWhatsAppMessage["type"],
  role: "customer" | "reviewer",
  meta?: Record<string, unknown>,
): Promise<BizWhatsAppMessage> {
  const sentAt = new Date().toISOString();
  const result = await sendWhatsAppMessage({
    to: phone,
    body: content,
    meta: { role, type, ...meta },
  });
  return {
    id: msgId(role === "reviewer" ? "w-rev" : "w"),
    type,
    content,
    phone,
    sentAt,
    status: result.status as WhatsAppSendStatus,
    failReason: result.ok ? undefined : result.error,
    recipientRole: role,
    providerMessageId: result.ok ? result.messageId : undefined,
    provider: result.provider,
  };
}

export function buildCustomerSubmittedContent(app: BizApplication) {
  const base = getPublicAppBaseUrl();
  return `【開戶文件通】我們已收到你的申請（${app.id}｜${app.company.nameZh || "未命名公司"}）。團隊現正檢查文件。進度：${base}/workspace/progress`;
}

export function buildCustomerSupplementContent(
  app: BizApplication,
  detail?: string,
) {
  const base = getPublicAppBaseUrl();
  const extra = detail ? `原因：${detail}。` : "";
  return `【開戶文件通】你的申請（${app.id}｜${app.company.nameZh || "未命名公司"}）需要補交／重新上載文件。${extra}請登入查看：${base}/workspace/supplements`;
}

export function buildCustomerDocsCompleteContent(app: BizApplication) {
  const base = getPublicAppBaseUrl();
  return `【開戶文件通】你的申請（${app.id}｜${app.company.nameZh || "未命名公司"}）所需文件已初步收齊，將進入下一階段。文件收齊 ≠ 開戶獲批。進度：${base}/workspace/progress`;
}

export function buildReviewerNewContent(app: BizApplication) {
  const base = getPublicAppBaseUrl();
  return `【開戶文件通·審核】新申請待處理：${app.id}｜${app.company.nameZh || "未命名"}｜聯絡人 ${app.applicant.name || "—"} ${app.applicant.whatsapp || ""}。後台：${base}/biz-admin/applications/${encodeURIComponent(app.id)}`;
}

export function buildReviewerResubmitContent(app: BizApplication) {
  const base = getPublicAppBaseUrl();
  return `【開戶文件通·審核】客戶已重新上載補件：${app.id}｜${app.company.nameZh || "未命名"}。請覆核：${base}/biz-admin/applications/${encodeURIComponent(app.id)}`;
}

/** 發送客戶 + 審核員通知，回傳所有訊息紀錄 */
export async function notifyBizWhatsApp(params: {
  app: BizApplication;
  event: BizNotifyEvent;
  supplementDetail?: string;
}): Promise<BizWhatsAppMessage[]> {
  const { app, event, supplementDetail } = params;
  const out: BizWhatsAppMessage[] = [];

  if (event === "submitted") {
    if (app.applicant.whatsapp) {
      out.push(
        await deliver(
          app.applicant.whatsapp,
          buildCustomerSubmittedContent(app),
          "submitted",
          "customer",
          { applicationId: app.id },
        ),
      );
    }
    for (const phone of getReviewerWhatsAppNumbers()) {
      out.push(
        await deliver(
          phone,
          buildReviewerNewContent(app),
          "custom",
          "reviewer",
          { applicationId: app.id, event: "reviewer_new_application" },
        ),
      );
    }
  }

  if (event === "supplement") {
    if (app.applicant.whatsapp) {
      out.push(
        await deliver(
          app.applicant.whatsapp,
          buildCustomerSupplementContent(app, supplementDetail),
          "supplement",
          "customer",
          { applicationId: app.id },
        ),
      );
    }
  }

  if (event === "docs_complete") {
    if (app.applicant.whatsapp) {
      out.push(
        await deliver(
          app.applicant.whatsapp,
          buildCustomerDocsCompleteContent(app),
          "docs_complete",
          "customer",
          { applicationId: app.id },
        ),
      );
    }
  }

  if (event === "reviewer_resubmit") {
    for (const phone of getReviewerWhatsAppNumbers()) {
      out.push(
        await deliver(
          phone,
          buildReviewerResubmitContent(app),
          "custom",
          "reviewer",
          { applicationId: app.id, event: "reviewer_resubmit" },
        ),
      );
    }
  }

  return out;
}

export function mergeWhatsAppStatus(
  messages: BizWhatsAppMessage[],
): WhatsAppSendStatus {
  if (messages.some((m) => m.status === "sent" || m.status === "delivered")) {
    return "sent";
  }
  if (messages.some((m) => m.status === "queued")) return "queued";
  if (messages.some((m) => m.status === "invalid_number")) {
    return "invalid_number";
  }
  if (messages.some((m) => m.status === "failed")) return "failed";
  return "queued";
}
