import "server-only";
import {
  getTwilioAuth,
  toE164,
  twilioBasicAuthHeader,
} from "@/lib/twilio";
import type { WhatsAppSendStatus } from "@/lib/bizdoc/types";

export type WhatsAppProvider = "twilio" | "meta" | "webhook" | "none";

export type WhatsAppSendResult =
  | {
      ok: true;
      provider: Exclude<WhatsAppProvider, "none">;
      messageId?: string;
      status: Extract<WhatsAppSendStatus, "sent" | "queued">;
    }
  | {
      ok: false;
      provider: WhatsAppProvider;
      error: string;
      status: Extract<
        WhatsAppSendStatus,
        "failed" | "invalid_number" | "undeliverable" | "queued"
      >;
    };

function digitsOnly(phone: string) {
  return phone.replace(/[^\d+]/g, "");
}

export function normalizeWhatsAppPhone(phone: string): string | null {
  const raw = digitsOnly(phone.trim());
  if (!raw) return null;
  try {
    const e164 = toE164(raw);
    if (!/^\+[1-9]\d{7,14}$/.test(e164)) return null;
    return e164;
  } catch {
    return null;
  }
}

export function getWhatsAppProvider(): WhatsAppProvider {
  if (
    process.env.WHATSAPP_TOKEN?.trim() &&
    process.env.WHATSAPP_PHONE_NUMBER_ID?.trim()
  ) {
    return "meta";
  }
  const waFrom = process.env.TWILIO_WHATSAPP_FROM?.trim();
  const hasTwilioCreds = Boolean(
    (process.env.TWILIO_ACCOUNT_SID?.trim() &&
      process.env.TWILIO_AUTH_TOKEN?.trim()) ||
      (process.env.TWILIO_API_KEY_SID?.trim() &&
        process.env.TWILIO_API_KEY_SECRET?.trim()) ||
      getTwilioAuth(),
  );
  if (waFrom && hasTwilioCreds) {
    return "twilio";
  }
  if (process.env.WHATSAPP_WEBHOOK_URL?.trim()) {
    return "webhook";
  }
  return "none";
}

export function whatsappConfigured() {
  return getWhatsAppProvider() !== "none";
}

export function getReviewerWhatsAppNumbers(): string[] {
  const raw =
    process.env.BIZ_REVIEWER_WHATSAPP?.trim() ||
    process.env.BIZ_ADMIN_WHATSAPP?.trim() ||
    "";
  if (!raw) return [];
  return raw
    .split(/[,;\s]+/)
    .map((p) => normalizeWhatsAppPhone(p))
    .filter((p): p is string => Boolean(p));
}

export function getPublicAppBaseUrl() {
  return (
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    process.env.BIZ_APP_URL?.trim() ||
    "https://hk-bank-account.vercel.app"
  );
}

export function getWhatsAppStatusSummary() {
  const provider = getWhatsAppProvider();
  return {
    configured: provider !== "none",
    provider,
    reviewers: getReviewerWhatsAppNumbers(),
    publicBaseUrl: getPublicAppBaseUrl(),
    hints:
      provider === "none"
        ? [
            "尚未設定 WhatsApp provider。請擇一：",
            "Meta：WHATSAPP_TOKEN + WHATSAPP_PHONE_NUMBER_ID",
            "Twilio：TWILIO_WHATSAPP_FROM（whatsapp:+E.164）+ Twilio 憑證",
            "Webhook：WHATSAPP_WEBHOOK_URL（Make/n8n/自建）",
            "審核員：BIZ_REVIEWER_WHATSAPP=+852xxxxxxxx",
          ]
        : [],
  };
}

async function sendViaTwilio(
  to: string,
  body: string,
): Promise<WhatsAppSendResult> {
  const from = process.env.TWILIO_WHATSAPP_FROM!.trim();

  const apiKey = process.env.TWILIO_API_KEY_SID?.trim();
  const apiSecret = process.env.TWILIO_API_KEY_SECRET?.trim();
  const accountSidEnv = process.env.TWILIO_ACCOUNT_SID?.trim();
  const authToken = process.env.TWILIO_AUTH_TOKEN?.trim();
  const verifyAuth = getTwilioAuth();

  let username: string | null = null;
  let password: string | null = null;
  let accountSid: string | null = accountSidEnv || null;

  if (apiKey && apiSecret) {
    username = apiKey;
    password = apiSecret;
  } else if (accountSidEnv && authToken) {
    username = accountSidEnv;
    password = authToken;
  } else if (verifyAuth) {
    username = verifyAuth.username;
    password = verifyAuth.password;
    accountSid = accountSid || verifyAuth.accountSid;
  }

  if (!username || !password || !accountSid) {
    return {
      ok: false,
      provider: "twilio",
      error: "Twilio 憑證未就緒（需要 Account SID + Auth Token／API Key）",
      status: "failed",
    };
  }

  const fromAddr = from.startsWith("whatsapp:") ? from : `whatsapp:${from}`;
  const toAddr = to.startsWith("whatsapp:") ? to : `whatsapp:${to}`;
  const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
  const form = new URLSearchParams({
    From: fromAddr,
    To: toAddr,
    Body: body,
  });

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: twilioBasicAuthHeader({ username, password }),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: form,
  });
  const data = (await res.json().catch(() => ({}))) as {
    sid?: string;
    message?: string;
    error_message?: string;
    code?: number;
  };
  if (!res.ok) {
    const err =
      data.message || data.error_message || `Twilio HTTP ${res.status}`;
    const invalid = /not a valid|invalid.*number|21211|21614/i.test(err);
    return {
      ok: false,
      provider: "twilio",
      error: err,
      status: invalid ? "invalid_number" : "failed",
    };
  }
  return {
    ok: true,
    provider: "twilio",
    messageId: data.sid,
    status: "sent",
  };
}

async function sendViaMeta(
  to: string,
  body: string,
): Promise<WhatsAppSendResult> {
  const token = process.env.WHATSAPP_TOKEN!.trim();
  const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID!.trim();
  const version = process.env.WHATSAPP_API_VERSION?.trim() || "v21.0";
  const toDigits = to.replace(/^\+/, "");
  const template = process.env.WHATSAPP_TEMPLATE_NAME?.trim();

  const payload = template
    ? {
        messaging_product: "whatsapp",
        to: toDigits,
        type: "template",
        template: {
          name: template,
          language: {
            code: process.env.WHATSAPP_TEMPLATE_LANG?.trim() || "zh_HK",
          },
          components: [
            {
              type: "body",
              parameters: [{ type: "text", text: body.slice(0, 1024) }],
            },
          ],
        },
      }
    : {
        messaging_product: "whatsapp",
        to: toDigits,
        type: "text",
        text: { preview_url: true, body },
      };

  const res = await fetch(
    `https://graph.facebook.com/${version}/${phoneId}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    },
  );
  const data = (await res.json().catch(() => ({}))) as {
    messages?: Array<{ id?: string }>;
    error?: { message?: string; code?: number };
  };
  if (!res.ok) {
    const err = data.error?.message || `Meta HTTP ${res.status}`;
    const invalid = /invalid.*user|not a whatsapp|131026|131009/i.test(err);
    return {
      ok: false,
      provider: "meta",
      error: err,
      status: invalid ? "invalid_number" : "failed",
    };
  }
  return {
    ok: true,
    provider: "meta",
    messageId: data.messages?.[0]?.id,
    status: "sent",
  };
}

async function sendViaWebhook(
  to: string,
  body: string,
  meta?: Record<string, unknown>,
): Promise<WhatsAppSendResult> {
  const url = process.env.WHATSAPP_WEBHOOK_URL!.trim();
  const secret = process.env.WHATSAPP_WEBHOOK_SECRET?.trim();
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(secret ? { Authorization: `Bearer ${secret}` } : {}),
    },
    body: JSON.stringify({
      channel: "whatsapp",
      to,
      message: body,
      text: body,
      ...meta,
    }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    return {
      ok: false,
      provider: "webhook",
      error: text.slice(0, 200) || `Webhook HTTP ${res.status}`,
      status: "failed",
    };
  }
  const data = (await res.json().catch(() => ({}))) as { id?: string };
  return {
    ok: true,
    provider: "webhook",
    messageId: data.id,
    status: "sent",
  };
}

/** 實際發送一則 WhatsApp；未設定 provider 時回傳 queued／failed 說明 */
export async function sendWhatsAppMessage(params: {
  to: string;
  body: string;
  meta?: Record<string, unknown>;
}): Promise<WhatsAppSendResult> {
  const to = normalizeWhatsAppPhone(params.to);
  if (!to) {
    return {
      ok: false,
      provider: getWhatsAppProvider(),
      error: "WhatsApp 號碼無效（請用含國碼格式，例如 +85291234567）",
      status: "invalid_number",
    };
  }

  const provider = getWhatsAppProvider();
  if (provider === "none") {
    return {
      ok: false,
      provider: "none",
      error:
        "WhatsApp 未接駁：請設定 Meta／Twilio／WHATSAPP_WEBHOOK_URL 其中一組環境變數",
      status: "queued",
    };
  }

  try {
    if (provider === "twilio") return await sendViaTwilio(to, params.body);
    if (provider === "meta") return await sendViaMeta(to, params.body);
    return await sendViaWebhook(to, params.body, params.meta);
  } catch (err) {
    return {
      ok: false,
      provider,
      error: err instanceof Error ? err.message : String(err),
      status: "failed",
    };
  }
}
