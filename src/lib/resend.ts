import "server-only";
import { createDecipheriv, createHash } from "crypto";

/**
 * Resend 電郵（Backend only）
 * Key 優先序：RESEND_API_KEY → sealed fallback
 */

type SealedPayload = {
  apiKey: string;
  provider?: string;
  from?: string;
};

/** AES-GCM sealed Resend key（Vercel 未設 env 時後備） */
const SEALED =
  "pAvoAobQCXcjtYxi7Qg4WP8PkPhhIDfOAul-ymRd0A5ioItxeki02YMRa6fJQ4h-GlryA-2Q1UDYCZ1c0UDcsbSb9HSz9wvqWp9lr8hoH0S9euxJoK9gWuGwKGPeaYVlCMwtFJW9yEyFU1k_IqTAvJYLT_WhMXseNTO6UijwI4aEO5dFGSIXTPedeK5OvwA";

function unwrapSealed(): SealedPayload | null {
  try {
    const key = createHash("sha256").update("slf-openai-wrap-v1").digest();
    const buf = Buffer.from(SEALED, "base64url");
    const iv = buf.subarray(0, 12);
    const tag = buf.subarray(12, 28);
    const data = buf.subarray(28);
    const decipher = createDecipheriv("aes-256-gcm", key, iv);
    decipher.setAuthTag(tag);
    const json = Buffer.concat([
      decipher.update(data),
      decipher.final(),
    ]).toString("utf8");
    return JSON.parse(json) as SealedPayload;
  } catch {
    return null;
  }
}

export function resolveResendApiKey(): string | null {
  const fromEnv = process.env.RESEND_API_KEY?.trim();
  if (fromEnv) return fromEnv;
  if (process.env.NEXT_PUBLIC_RESEND_API_KEY) {
    console.warn(
      "[resend] NEXT_PUBLIC_RESEND_API_KEY 被忽略——請改用 Backend RESEND_API_KEY",
    );
  }
  const sealed = unwrapSealed();
  if (sealed?.apiKey && (sealed.provider === "resend" || !sealed.provider)) {
    return sealed.apiKey;
  }
  return null;
}

export function hasResendKey() {
  return Boolean(resolveResendApiKey());
}

export function getResendKeySource(): "env" | "sealed" | "none" {
  if (process.env.RESEND_API_KEY?.trim()) return "env";
  if (unwrapSealed()?.apiKey) return "sealed";
  return "none";
}

export function getResendFrom() {
  return (
    process.env.RESEND_FROM_EMAIL?.trim() ||
    unwrapSealed()?.from?.trim() ||
    "SME LoanFlow <onboarding@resend.dev>"
  );
}

export type SendEmailInput = {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
};

export type SendEmailResult =
  | { ok: true; id: string; from: string }
  | { ok: false; error: string; status?: number };

/** 經 Resend REST API 寄信（唔依賴 SDK 版本漂移） */
export async function sendEmail(
  input: SendEmailInput,
): Promise<SendEmailResult> {
  const apiKey = resolveResendApiKey();
  if (!apiKey) {
    return { ok: false, error: "MISSING_RESEND_API_KEY" };
  }

  const to = (Array.isArray(input.to) ? input.to : [input.to])
    .map((s) => s.trim())
    .filter(Boolean);
  if (!to.length) {
    return { ok: false, error: "MISSING_TO" };
  }

  const from = getResendFrom();
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      accept: "application/json",
    },
    body: JSON.stringify({
      from,
      to,
      subject: input.subject,
      html: input.html,
      ...(input.text ? { text: input.text } : {}),
      ...(input.replyTo ? { reply_to: input.replyTo } : {}),
    }),
    cache: "no-store",
  });

  const data = (await res.json().catch(() => ({}))) as {
    id?: string;
    message?: string;
    name?: string;
    error?: string;
  };

  if (!res.ok) {
    return {
      ok: false,
      status: res.status,
      error:
        data.message ||
        data.error ||
        data.name ||
        `RESEND_HTTP_${res.status}`,
    };
  }

  return {
    ok: true,
    id: data.id || `resend-${Date.now()}`,
    from,
  };
}
