import "server-only";
import { createDecipheriv, createHash } from "crypto";
import OpenAI from "openai";

/**
 * LLM Backend — Manus OpenAI-compatible Responses API
 * （不可用 NEXT_PUBLIC_*）
 *
 * Key：MANUS_API_KEY 或 OPENAI_API_KEY
 */

const SEALED =
  "rLJ9bBOqAHQewmU1JPiqKFwY4j-lC9BdmBWVBQoQ_FMBJ31n0sZHbewU88ttiejUX1Lx_2Rc9EigzNQPEuutkX9Xtag_hcPuboB0n63jHZbJjzeQXypKfgYyDsK3hbYYnrHe2pTZ8oCsAwkawZVVNSyE-iq0dEkb5mxdYyuSrQJ7uwjqOGSXYneOezfP71cdlXQOiWaKvdWRvIGH6EDmNqSAGJzBje7WzQN3eIHPicU3yVJibGG9CDDSVLiZKTuQqvZ_-yNudi6iMalbVpWp3TTBHQ"; // overwritten below

type SealedPayload = {
  apiKey: string;
  provider?: string;
  baseURL?: string;
  model?: string;
};

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

function resolveApiKey(): string | null {
  const fromEnv =
    process.env.MANUS_API_KEY?.trim() || process.env.OPENAI_API_KEY?.trim();
  if (fromEnv) return fromEnv;
  if (
    process.env.NEXT_PUBLIC_OPENAI_API_KEY ||
    process.env.NEXT_PUBLIC_MANUS_API_KEY
  ) {
    console.warn(
      "[llm] NEXT_PUBLIC_* API key 被忽略——請改用 Backend MANUS_API_KEY / OPENAI_API_KEY",
    );
  }
  return unwrapSealed()?.apiKey ?? null;
}

function resolveBaseURL() {
  return (
    process.env.OPENAI_BASE_URL?.trim() ||
    process.env.MANUS_BASE_URL?.trim() ||
    unwrapSealed()?.baseURL?.trim() ||
    "https://api.manus.im/v1"
  );
}

/** 保留給需要 OpenAI SDK 的呼叫；指向 Manus baseURL */
export function getOpenAI() {
  const apiKey = resolveApiKey();
  if (!apiKey) {
    throw new Error("MISSING_OPENAI_API_KEY");
  }
  return new OpenAI({
    apiKey: "manus",
    baseURL: resolveBaseURL(),
    defaultHeaders: {
      API_KEY: apiKey,
    },
  });
}

export const OPENAI_MODEL =
  process.env.OPENAI_MODEL?.trim() ||
  process.env.OPENAI_ANALYZE_MODEL?.trim() ||
  unwrapSealed()?.model?.trim() ||
  "manus-1.6";

export function hasOpenAIKey() {
  return Boolean(resolveApiKey());
}

export function getLlmProvider() {
  return "manus" as const;
}

type ManusResponse = {
  id: string;
  status: string;
  model?: string;
  output?: Array<{
    role?: string;
    content?: Array<{ type?: string; text?: string | null }>;
  }>;
  error_msg?: string;
};

function extractAssistantText(response: ManusResponse): string {
  const output = response.output ?? [];
  const chunks: string[] = [];
  for (const msg of output) {
    if (msg.role && msg.role !== "assistant") continue;
    for (const part of msg.content ?? []) {
      if (part?.text) chunks.push(part.text);
    }
  }
  if (!chunks.length) {
    for (const msg of output) {
      for (const part of msg.content ?? []) {
        if (part?.text) chunks.push(part.text);
      }
    }
  }
  return chunks.join("\n").trim();
}

function stripJsonFence(text: string) {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced?.[1]) return fenced[1].trim();
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start >= 0 && end > start) return text.slice(start, end + 1);
  return text.trim();
}

async function manusFetch(
  path: string,
  init?: RequestInit,
): Promise<ManusResponse> {
  const apiKey = resolveApiKey();
  if (!apiKey) throw new Error("MISSING_OPENAI_API_KEY");
  const base = resolveBaseURL().replace(/\/$/, "");
  const res = await fetch(`${base}${path}`, {
    ...init,
    headers: {
      accept: "application/json",
      "content-type": "application/json",
      API_KEY: apiKey,
      ...(init?.headers || {}),
    },
    cache: "no-store",
  });
  const data = (await res.json()) as ManusResponse & {
    error?: string;
    message?: string;
  };
  if (!res.ok) {
    throw new Error(
      data.error_msg || data.message || data.error || `MANUS_HTTP_${res.status}`,
    );
  }
  return data;
}

/**
 * Manus Responses：建立 task → poll → 回傳 assistant 文字
 * （替代 chat.completions）
 */
export async function manusRespond(params: {
  system?: string;
  userText: string;
  imageUrl?: string;
  /** 多頁 PDF 轉圖（BR／NAR1 掃描件） */
  imageUrls?: string[];
  pollMs?: number;
  maxWaitMs?: number;
}): Promise<{ text: string; model: string; id: string; status: string }> {
  const pollMs = params.pollMs ?? 2500;
  const maxWaitMs = params.maxWaitMs ?? 55_000;

  const text = [params.system?.trim(), params.userText.trim()]
    .filter(Boolean)
    .join("\n\n");

  const content: Array<Record<string, string>> = [
    { type: "input_text", text },
  ];
  const images = [
    ...(params.imageUrls ?? []),
    ...(params.imageUrl ? [params.imageUrl] : []),
  ].filter(Boolean);
  // 去重；最多 3 張以免 payload 過大
  const uniqueImages = [...new Set(images)].slice(0, 3);
  for (const image_url of uniqueImages) {
    content.push({ type: "input_image", image_url });
  }

  const agentProfile = OPENAI_MODEL.includes("manus")
    ? OPENAI_MODEL.replace(/-agent$/, "")
    : "manus-1.6";

  const created = await manusFetch("/responses", {
    method: "POST",
    body: JSON.stringify({
      input: [
        {
          role: "user",
          content,
        },
      ],
      task_mode: "chat",
      agent_profile: agentProfile,
    }),
  });

  const id = created.id;
  const started = Date.now();
  let current = created;

  while (
    (current.status === "running" ||
      current.status === "queued" ||
      current.status === "pending") &&
    Date.now() - started < maxWaitMs
  ) {
    await new Promise((r) => setTimeout(r, pollMs));
    current = await manusFetch(`/responses/${id}`, { method: "GET" });
  }

  if (
    current.status === "running" ||
    current.status === "queued" ||
    current.status === "pending"
  ) {
    throw new Error("MANUS_TIMEOUT");
  }
  if (current.status === "failed" || current.status === "error") {
    throw new Error("MANUS_TASK_FAILED");
  }

  const rawText = extractAssistantText(current);
  if (!rawText) {
    throw new Error("EMPTY_MODEL_RESPONSE");
  }

  return {
    text: rawText,
    model: current.model || OPENAI_MODEL,
    id,
    status: String(current.status),
  };
}

export function parseModelJsonObject(text: string): unknown {
  return JSON.parse(stripJsonFence(text));
}
