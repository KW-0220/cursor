import "server-only";
import { createDecipheriv, createHash } from "crypto";

/**
 * LLM Backend — Google Gemini generateContent
 * （不可用 NEXT_PUBLIC_*）
 *
 * Key 優先序：GEMINI_API_KEY → GOOGLE_API_KEY → sealed fallback → 舊 Manus
 */

type SealedPayload = {
  apiKey: string;
  provider?: string;
  baseURL?: string;
  model?: string;
};

/** AES-GCM sealed Gemini key（Vercel 未設 env 時後備；正式仍建議用 GEMINI_API_KEY） */
const SEALED =
  "0hThznA-kDRteqMSU1YdYEBp4ud0-DBlCrp5Zx9o0BVeB-CU2f6NggSeuVLUwB1tb9HOjnwBz1VefD6gUV_qSF8aaPq_0OWoSe6lSlIq7Qwg_pWChok7EX-f92siPcyLaojbUPqFTZP-8aj-lMXA9fw1bgUsOi3BxDFldVwv5JYjVkhralEVT6-Y43Nc";

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

function resolveGeminiApiKey(): string | null {
  const fromEnv =
    process.env.GEMINI_API_KEY?.trim() ||
    process.env.GOOGLE_GENERATIVE_AI_API_KEY?.trim() ||
    process.env.GOOGLE_API_KEY?.trim();
  if (fromEnv) return fromEnv;
  if (
    process.env.NEXT_PUBLIC_GEMINI_API_KEY ||
    process.env.NEXT_PUBLIC_GOOGLE_API_KEY
  ) {
    console.warn(
      "[llm] NEXT_PUBLIC_* API key 被忽略——請改用 Backend GEMINI_API_KEY",
    );
  }
  const sealed = unwrapSealed();
  if (sealed?.apiKey && (sealed.provider === "gemini" || !sealed.provider)) {
    return sealed.apiKey;
  }
  return null;
}

function resolveLegacyManusKey(): string | null {
  return (
    process.env.MANUS_API_KEY?.trim() ||
    process.env.OPENAI_API_KEY?.trim() ||
    null
  );
}

export function resolveApiKey(): string | null {
  return resolveGeminiApiKey() || resolveLegacyManusKey();
}

export const OPENAI_MODEL =
  process.env.GEMINI_MODEL?.trim() ||
  process.env.OPENAI_ANALYZE_MODEL?.trim() ||
  process.env.OPENAI_MODEL?.trim() ||
  unwrapSealed()?.model?.trim() ||
  "gemini-3.5-flash";

export function hasOpenAIKey() {
  return Boolean(resolveApiKey());
}

export function getLlmProvider(): "gemini" | "manus" {
  if (resolveGeminiApiKey()) return "gemini";
  return "manus";
}

function stripJsonFence(text: string) {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced?.[1]) return fenced[1].trim();
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start >= 0 && end > start) return text.slice(start, end + 1);
  return text.trim();
}

function parseDataUrl(url: string): { mimeType: string; data: string } | null {
  const m = url.match(/^data:([^;]+);base64,(.+)$/i);
  if (!m) return null;
  return { mimeType: m[1]!, data: m[2]! };
}

type GeminiPart =
  | { text: string }
  | { inline_data: { mime_type: string; data: string } };

type GeminiResponse = {
  candidates?: Array<{
    content?: { parts?: Array<{ text?: string }> };
    finishReason?: string;
  }>;
  error?: { message?: string; code?: number; status?: string };
  modelVersion?: string;
  responseId?: string;
};

function geminiModelId() {
  const raw = OPENAI_MODEL.replace(/^models\//, "");
  // 舊 manus 名自動改用 Gemini
  if (raw.includes("manus")) return "gemini-3.5-flash";
  return raw || "gemini-3.5-flash";
}

async function geminiGenerateContent(params: {
  system?: string;
  userText: string;
  imageUrls?: string[];
}): Promise<{ text: string; model: string; id: string; status: string }> {
  const apiKey = resolveGeminiApiKey();
  if (!apiKey) throw new Error("MISSING_GEMINI_API_KEY");

  const model = geminiModelId();
  const parts: GeminiPart[] = [];
  if (params.userText.trim()) {
    parts.push({ text: params.userText.trim() });
  }

  const images = [...new Set(params.imageUrls ?? [])].slice(0, 3);
  for (const url of images) {
    const parsed = parseDataUrl(url);
    if (!parsed) continue;
    parts.push({
      inline_data: {
        mime_type: parsed.mimeType,
        data: parsed.data,
      },
    });
  }

  if (!parts.length) {
    throw new Error("EMPTY_MODEL_REQUEST");
  }

  const body: Record<string, unknown> = {
    contents: [{ role: "user", parts }],
    generationConfig: {
      temperature: 0.2,
      maxOutputTokens: 8192,
    },
  };
  if (params.system?.trim()) {
    body.systemInstruction = {
      parts: [{ text: params.system.trim() }],
    };
  }

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;
  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      accept: "application/json",
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
    cache: "no-store",
  });

  const data = (await res.json()) as GeminiResponse;
  if (!res.ok) {
    const msg =
      data.error?.message ||
      data.error?.status ||
      `GEMINI_HTTP_${res.status}`;
    if (res.status === 429) throw new Error(`GEMINI_QUOTA: ${msg}`);
    throw new Error(msg);
  }

  const text = (data.candidates ?? [])
    .flatMap((c) => c.content?.parts ?? [])
    .map((p) => p.text || "")
    .join("\n")
    .trim();

  if (!text) {
    throw new Error("EMPTY_MODEL_RESPONSE");
  }

  return {
    text,
    model: data.modelVersion || model,
    id: data.responseId || `gemini-${Date.now()}`,
    status: "completed",
  };
}

/** @deprecated 僅供舊程式路徑；實際已轉 Gemini */
export function getOpenAI() {
  throw new Error(
    "getOpenAI() 已停用：請改用 manusRespond()／Gemini（GEMINI_API_KEY）",
  );
}

/**
 * 統一 LLM 呼叫（函式名保留 manusRespond 以兼容現有 API routes）
 * 有 GEMINI_API_KEY 時走 Gemini；否則回退舊 Manus（若仍設 MANUS_API_KEY）
 */
export async function manusRespond(params: {
  system?: string;
  userText: string;
  imageUrl?: string;
  imageUrls?: string[];
  pollMs?: number;
  maxWaitMs?: number;
}): Promise<{ text: string; model: string; id: string; status: string }> {
  const imageUrls = [
    ...(params.imageUrls ?? []),
    ...(params.imageUrl ? [params.imageUrl] : []),
  ].filter(Boolean);

  if (resolveGeminiApiKey()) {
    return geminiGenerateContent({
      system: params.system,
      userText: params.userText,
      imageUrls,
    });
  }

  // —— 舊 Manus fallback（過渡期）——
  const manusKey = resolveLegacyManusKey();
  if (!manusKey) {
    throw new Error("MISSING_GEMINI_API_KEY");
  }

  const base = (
    process.env.OPENAI_BASE_URL?.trim() ||
    process.env.MANUS_BASE_URL?.trim() ||
    "https://api.manus.im/v1"
  ).replace(/\/$/, "");

  const content: Array<Record<string, string>> = [
    {
      type: "input_text",
      text: [params.system?.trim(), params.userText.trim()]
        .filter(Boolean)
        .join("\n\n"),
    },
  ];
  for (const image_url of [...new Set(imageUrls)].slice(0, 3)) {
    content.push({ type: "input_image", image_url });
  }

  const createRes = await fetch(`${base}/responses`, {
    method: "POST",
    headers: {
      accept: "application/json",
      "content-type": "application/json",
      API_KEY: manusKey,
    },
    body: JSON.stringify({
      input: [{ role: "user", content }],
      task_mode: "chat",
      agent_profile: "manus-1.6",
    }),
    cache: "no-store",
  });
  const created = (await createRes.json()) as {
    id?: string;
    status?: string;
    model?: string;
    output?: Array<{
      role?: string;
      content?: Array<{ type?: string; text?: string | null }>;
    }>;
    error_msg?: string;
    message?: string;
    error?: string;
  };
  if (!createRes.ok) {
    throw new Error(
      created.error_msg ||
        created.message ||
        created.error ||
        `MANUS_HTTP_${createRes.status}`,
    );
  }

  const pollMs = params.pollMs ?? 2500;
  const maxWaitMs = params.maxWaitMs ?? 55_000;
  let current = created;
  const id = created.id!;
  const started = Date.now();
  while (
    (current.status === "running" ||
      current.status === "queued" ||
      current.status === "pending") &&
    Date.now() - started < maxWaitMs
  ) {
    await new Promise((r) => setTimeout(r, pollMs));
    const poll = await fetch(`${base}/responses/${id}`, {
      headers: { accept: "application/json", API_KEY: manusKey },
      cache: "no-store",
    });
    current = (await poll.json()) as typeof created;
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
  const chunks: string[] = [];
  for (const msg of current.output ?? []) {
    for (const part of msg.content ?? []) {
      if (part?.text) chunks.push(part.text);
    }
  }
  const text = chunks.join("\n").trim();
  if (!text) throw new Error("EMPTY_MODEL_RESPONSE");
  return {
    text,
    model: current.model || "manus-1.6",
    id,
    status: String(current.status),
  };
}

export function parseModelJsonObject(text: string): unknown {
  return JSON.parse(stripJsonFence(text));
}
