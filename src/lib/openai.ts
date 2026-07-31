import "server-only";
import { createDecipheriv, createHash } from "crypto";

/**
 * LLM Backend — Google Gemini generateContent
 * （不可用 NEXT_PUBLIC_*）
 *
 * Key 優先序：GEMINI_API_KEY → GOOGLE_API_KEY → sealed fallback → 舊 Manus
 *
 * 模型：優先 flash-lite（穩定、配額較寬）。gemini-3.5-flash 係 thinking model，
 * 高峰常 429，且 maxOutputTokens 會被 thinking 食晒導致 EMPTY_MODEL_RESPONSE。
 */

type SealedPayload = {
  apiKey: string;
  provider?: string;
  baseURL?: string;
  model?: string;
};

/** AES-GCM sealed Gemini key（Vercel 未設 env 時後備；正式仍建議用 GEMINI_API_KEY） */
const SEALED =
  "wDMz89eCUNH11eFWqwIwcD0AIqj0yE7QhyyjXMFvBvhnl0ua2dcHCHOV1CvnBLADeCaFVWiAvlO7VHV0ltDxkbb05eJiYbUniCJGQk6X6-r5aoelZQK6XsqeIV_sxCJnUKPmuVTE3FeW91-3LDx_r5L3fQMTLJ0iypotP_xlWlFj2QJ48MNDA_M1NzkjffNtwTI";

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

/** 預設用 flash-lite（穩定／配額較寬）；勿預設 3.5-flash（thinking＋易 429） */
export const OPENAI_MODEL =
  process.env.GEMINI_MODEL?.trim() ||
  process.env.OPENAI_ANALYZE_MODEL?.trim() ||
  process.env.OPENAI_MODEL?.trim() ||
  "gemini-3.5-flash-lite";

/** 主 model 失敗（503／429／404／EMPTY）時依序試；lite 優先 */
const DEFAULT_GEMINI_FALLBACKS = [
  "gemini-3.5-flash-lite",
  "gemini-3.1-flash-lite",
  "gemini-flash-lite-latest",
  "gemini-flash-latest",
  "gemini-3.5-flash",
];

function geminiFallbackModels(primary: string): string[] {
  const fromEnv = (process.env.GEMINI_MODEL_FALLBACKS || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const list = [primary, ...fromEnv, ...DEFAULT_GEMINI_FALLBACKS];
  const seen = new Set<string>();
  return list.filter((m) => {
    const id = m.replace(/^models\//, "");
    if (!id || seen.has(id)) return false;
    seen.add(id);
    return true;
  });
}

export function hasOpenAIKey() {
  return Boolean(resolveApiKey());
}

/** 診斷用：key 來源（唔回傳 key 本身） */
export function getLlmKeySource():
  | "env"
  | "sealed"
  | "manus"
  | "none" {
  const fromEnv =
    process.env.GEMINI_API_KEY?.trim() ||
    process.env.GOOGLE_GENERATIVE_AI_API_KEY?.trim() ||
    process.env.GOOGLE_API_KEY?.trim();
  if (fromEnv) return "env";
  const sealed = unwrapSealed();
  if (sealed?.apiKey && (sealed.provider === "gemini" || !sealed.provider)) {
    return "sealed";
  }
  if (resolveLegacyManusKey()) return "manus";
  return "none";
}

export function getLlmProvider(): "gemini" | "manus" {
  if (resolveGeminiApiKey()) return "gemini";
  return "manus";
}

export function getGeminiModel() {
  return geminiModelId();
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
  if (raw.includes("manus")) return "gemini-3.5-flash-lite";
  return raw || "gemini-3.5-flash-lite";
}

export type ChatTurn = {
  role: "user" | "assistant" | "system";
  content: string;
};

function toGeminiContents(
  userText: string,
  imageUrls: string[],
  history?: ChatTurn[],
): Array<{ role: "user" | "model"; parts: GeminiPart[] }> {
  const contents: Array<{ role: "user" | "model"; parts: GeminiPart[] }> = [];

  if (history?.length) {
    for (const turn of history) {
      if (turn.role === "system") continue;
      const text = turn.content.trim();
      if (!text) continue;
      const role = turn.role === "assistant" ? "model" : "user";
      const prev = contents[contents.length - 1];
      if (prev && prev.role === role) {
        prev.parts.push({ text });
      } else {
        contents.push({ role, parts: [{ text }] });
      }
    }
  }

  const last = contents[contents.length - 1];
  // 銀行月結／審計最多帶 4 頁；再多會令 Gemini request 過大
  const images = [...new Set(imageUrls)].slice(0, 4);
  const imageParts: GeminiPart[] = [];
  for (const url of images) {
    const parsed = parseDataUrl(url);
    if (!parsed) continue;
    imageParts.push({
      inline_data: {
        mime_type: parsed.mimeType,
        data: parsed.data,
      },
    });
  }

  if (last?.role === "user" && !imageParts.length) {
    // history 已含最後一則 user
    return contents;
  }

  const userParts: GeminiPart[] = [];
  if (userText.trim()) userParts.push({ text: userText.trim() });
  userParts.push(...imageParts);

  if (!userParts.length && !contents.length) {
    throw new Error("EMPTY_MODEL_REQUEST");
  }

  if (userParts.length) {
    if (last?.role === "user") {
      last.parts.push(...userParts);
    } else {
      contents.push({ role: "user", parts: userParts });
    }
  }

  return contents;
}

async function geminiGenerateContentOnce(params: {
  apiKey: string;
  model: string;
  system?: string;
  contents: Array<{ role: "user" | "model"; parts: GeminiPart[] }>;
  maxOutputTokens?: number;
  temperature?: number;
  /** 文件抽取請開 json，減少 markdown fence／格式漂移 */
  jsonMode?: boolean;
}): Promise<{ text: string; model: string; id: string; status: string }> {
  const model = params.model.replace(/^models\//, "");
  // thinking model：maxOutputTokens 係 thinking＋output 共用預算；文件 JSON 要夠大
  const maxOutputTokens = Math.max(params.maxOutputTokens ?? 8192, 4096);
  const generationConfig: Record<string, unknown> = {
    temperature: params.temperature ?? 0.4,
    maxOutputTokens,
  };
  if (params.jsonMode) {
    generationConfig.responseMimeType = "application/json";
  }
  // Gemini 3.x thinking：文件抽取用 minimal，避免 thinking 食晒 token 回空
  if (/gemini-3/i.test(model)) {
    generationConfig.thinkingConfig = { thinkingLevel: "minimal" };
  }
  const body: Record<string, unknown> = {
    contents: params.contents,
    generationConfig,
  };
  if (params.system?.trim()) {
    body.systemInstruction = {
      parts: [{ text: params.system.trim() }],
    };
  }

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(params.apiKey)}`;
  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      accept: "application/json",
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
    cache: "no-store",
  });

  const data = (await res.json()) as GeminiResponse & {
    error?: { message?: string; status?: string };
  };
  if (!res.ok) {
    const msg =
      data.error?.message ||
      data.error?.status ||
      `GEMINI_HTTP_${res.status}`;
    // thinkingConfig 唔支援時降級重試（呼叫端會再試）
    if (
      res.status === 400 &&
      /thinkingConfig|thinkingLevel|Unknown name/i.test(msg)
    ) {
      const err = new Error(`GEMINI_THINKING_UNSUPPORTED: ${msg}`) as Error & {
        status?: number;
        retryable?: boolean;
        retryWithoutThinking?: boolean;
      };
      err.status = res.status;
      err.retryable = true;
      err.retryWithoutThinking = true;
      throw err;
    }
    const err = new Error(
      res.status === 429 ? `GEMINI_QUOTA: ${msg}` : msg,
    ) as Error & { status?: number; retryable?: boolean };
    err.status = res.status;
    err.retryable =
      res.status === 429 ||
      res.status === 503 ||
      res.status === 404 ||
      res.status === 400 ||
      /high demand|no longer available|not found|invalid argument/i.test(msg);
    throw err;
  }

  const text = (data.candidates ?? [])
    .flatMap((c) => c.content?.parts ?? [])
    .map((p) => p.text || "")
    .join("\n")
    .trim();

  if (!text) {
    const finish = data.candidates?.[0]?.finishReason || "UNKNOWN";
    const err = new Error(
      `EMPTY_MODEL_RESPONSE:${finish}`,
    ) as Error & { retryable?: boolean };
    err.retryable = true;
    throw err;
  }

  return {
    text,
    model: data.modelVersion || model,
    id: data.responseId || `gemini-${Date.now()}`,
    status: "completed",
  };
}

async function geminiGenerateContentOnceNoThinking(params: {
  apiKey: string;
  model: string;
  system?: string;
  contents: Array<{ role: "user" | "model"; parts: GeminiPart[] }>;
  maxOutputTokens?: number;
  temperature?: number;
  jsonMode?: boolean;
}): Promise<{ text: string; model: string; id: string; status: string }> {
  const model = params.model.replace(/^models\//, "");
  const generationConfig: Record<string, unknown> = {
    temperature: params.temperature ?? 0.4,
    maxOutputTokens: Math.max(params.maxOutputTokens ?? 8192, 4096),
  };
  if (params.jsonMode) {
    generationConfig.responseMimeType = "application/json";
  }
  const body: Record<string, unknown> = {
    contents: params.contents,
    generationConfig,
  };
  if (params.system?.trim()) {
    body.systemInstruction = {
      parts: [{ text: params.system.trim() }],
    };
  }
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(params.apiKey)}`;
  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      accept: "application/json",
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
    cache: "no-store",
  });
  const data = (await res.json()) as GeminiResponse & {
    error?: { message?: string; status?: string };
  };
  if (!res.ok) {
    const msg =
      data.error?.message ||
      data.error?.status ||
      `GEMINI_HTTP_${res.status}`;
    throw new Error(res.status === 429 ? `GEMINI_QUOTA: ${msg}` : msg);
  }
  const text = (data.candidates ?? [])
    .flatMap((c) => c.content?.parts ?? [])
    .map((p) => p.text || "")
    .join("\n")
    .trim();
  if (!text) throw new Error("EMPTY_MODEL_RESPONSE");
  return {
    text,
    model: data.modelVersion || model,
    id: data.responseId || `gemini-${Date.now()}`,
    status: "completed",
  };
}

async function geminiGenerateContent(params: {
  system?: string;
  userText: string;
  imageUrls?: string[];
  history?: ChatTurn[];
  maxOutputTokens?: number;
  temperature?: number;
  jsonMode?: boolean;
}): Promise<{ text: string; model: string; id: string; status: string }> {
  const apiKey = resolveGeminiApiKey();
  if (!apiKey) throw new Error("MISSING_GEMINI_API_KEY");

  const contents = toGeminiContents(
    params.userText,
    params.imageUrls ?? [],
    params.history,
  );
  if (!contents.length) throw new Error("EMPTY_MODEL_REQUEST");

  const models = geminiFallbackModels(geminiModelId());
  let lastErr: Error | null = null;
  // jsonMode 唔支援時自動降級再試
  const jsonModes =
    params.jsonMode === false ? [false] : [true, false];

  for (const model of models) {
    for (const jsonMode of jsonModes) {
      try {
        return await geminiGenerateContentOnce({
          apiKey,
          model,
          system: params.system,
          contents,
          maxOutputTokens: params.maxOutputTokens,
          temperature: params.temperature,
          jsonMode,
        });
      } catch (e) {
        lastErr = e instanceof Error ? e : new Error(String(e));
        const msg = lastErr.message;
        if (
          (e as { retryWithoutThinking?: boolean })?.retryWithoutThinking
        ) {
          try {
            return await geminiGenerateContentOnceNoThinking({
              apiKey,
              model,
              system: params.system,
              contents,
              maxOutputTokens: params.maxOutputTokens,
              temperature: params.temperature,
              jsonMode,
            });
          } catch (e2) {
            lastErr = e2 instanceof Error ? e2 : new Error(String(e2));
          }
        }
        const retryable =
          (e as { retryable?: boolean })?.retryable === true ||
          /GEMINI_QUOTA|high demand|EMPTY_MODEL|not found|no longer available|GEMINI_HTTP_5|invalid argument|responseMimeType|GEMINI_THINKING/i.test(
            msg,
          );
        if (!retryable) throw lastErr;
        console.warn(
          `[gemini] ${model} jsonMode=${jsonMode} failed:`,
          msg,
        );
      }
    }
  }

  throw lastErr || new Error("GEMINI_ALL_MODELS_FAILED");
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
  history?: ChatTurn[];
  pollMs?: number;
  maxWaitMs?: number;
  maxOutputTokens?: number;
  temperature?: number;
  /** 文件／結構化抽取請傳 true（Gemini responseMimeType=application/json） */
  jsonMode?: boolean;
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
      history: params.history,
      maxOutputTokens: params.maxOutputTokens,
      temperature: params.temperature,
      jsonMode: params.jsonMode === true,
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
  for (const image_url of [...new Set(imageUrls)].slice(0, 4)) {
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
