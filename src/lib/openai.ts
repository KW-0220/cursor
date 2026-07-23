import "server-only";
import OpenAI from "openai";

/**
 * OpenAI 只允許在 Backend（Route Handlers / Server Components / Server Actions）使用。
 * 前端必須經由 /api/* 代理，不可直接持有或呼叫 OPENAI_API_KEY。
 */
export function getOpenAI() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("MISSING_OPENAI_API_KEY");
  }
  return new OpenAI({ apiKey });
}

export const OPENAI_MODEL =
  process.env.OPENAI_MODEL?.trim() || "gpt-5-mini";

export function hasOpenAIKey() {
  return Boolean(process.env.OPENAI_API_KEY?.trim());
}
