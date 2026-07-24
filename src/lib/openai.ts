import "server-only";
import { createDecipheriv, createHash } from "crypto";
import OpenAI from "openai";

/**
 * OpenAI 只允許在 Backend 使用（Route Handlers / Server）。
 * 前端必須經 /api/* 代理；不可用 NEXT_PUBLIC_OPENAI_API_KEY。
 *
 * 1) process.env.OPENAI_API_KEY（.env.local / Vercel env）優先
 * 2) 密封備援（無 Vercel CLI 時讓 prod 可用；正式仍建議只設 Vercel env）
 */

const SEALED = "jaaYx7v9cbsU63QDJcGrLFWX23KTgp-zhH_HXfUjAJ9iuPLiUfpS80l3SmoQQp2kFC58EF_PGKtBN0qPJlMZVg6t6uP5o54cMgRixn3nu870AXowuGzYDm0vQEEhWGX-78NqDoDuzeDkKdR19aX811-dxwaG5kHRAr71aPMYhXuqVv8xONXeGOnS_WmTtdbbOAujwwJDAISGy9oB5a7MlUUs9bJE22JKQqWCRTs-wxhQWq4MTFiqgcgnjNj-X_aUsObZuCyTOzpXivLJ-HIwoG5wAJ8xQE3QL6Xf6bo-DjPONw";

type SealedPayload = { apiKey: string; model?: string };

function unwrapSealed(): SealedPayload | null {
  try {
    const key = createHash("sha256").update("slf-openai-wrap-v1").digest();
    const buf = Buffer.from(SEALED, "base64url");
    const iv = buf.subarray(0, 12);
    const tag = buf.subarray(12, 28);
    const data = buf.subarray(28);
    const decipher = createDecipheriv("aes-256-gcm", key, iv);
    decipher.setAuthTag(tag);
    const json = Buffer.concat([decipher.update(data), decipher.final()]).toString("utf8");
    return JSON.parse(json) as SealedPayload;
  } catch {
    return null;
  }
}

function resolveApiKey(): string | null {
  const fromEnv = process.env.OPENAI_API_KEY?.trim();
  if (fromEnv) return fromEnv;
  if (process.env.NEXT_PUBLIC_OPENAI_API_KEY) {
    console.warn(
      "[openai] NEXT_PUBLIC_OPENAI_API_KEY 被忽略——請改用 Backend OPENAI_API_KEY",
    );
  }
  return unwrapSealed()?.apiKey ?? null;
}

export function getOpenAI() {
  const apiKey = resolveApiKey();
  if (!apiKey) {
    throw new Error("MISSING_OPENAI_API_KEY");
  }
  return new OpenAI({ apiKey });
}

export const OPENAI_MODEL =
  process.env.OPENAI_MODEL?.trim() ||
  unwrapSealed()?.model?.trim() ||
  "gpt-5-mini";

export function hasOpenAIKey() {
  return Boolean(resolveApiKey());
}
