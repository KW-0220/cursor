import OpenAI from "openai";

export function getOpenAI() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("MISSING_OPENAI_API_KEY");
  }
  return new OpenAI({ apiKey });
}

export const OPENAI_MODEL =
  process.env.OPENAI_MODEL?.trim() || "gpt-4o-mini";
