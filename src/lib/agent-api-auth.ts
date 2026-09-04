import "server-only";
import { createDecipheriv, createHash, timingSafeEqual } from "crypto";
import { NextRequest, NextResponse } from "next/server";

/**
 * Claude Code／agent 只讀後台 API 認證。
 * Header（擇一）：
 * - Authorization: Bearer <AGENT_API_KEY>
 * - X-Agent-Api-Key: <AGENT_API_KEY>
 *
 * Env：AGENT_API_KEY 或 ADMIN_AGENT_API_KEY
 * （未設時用 sealed fallback，正式仍建議 Vercel 設 env）
 */

type SealedAgent = { agentApiKey: string };

/** AES-GCM sealed agent key（Vercel 未設 Dashboard env 時） */
const SEALED =
  "eZZAtIxnNcjlRumGR-gc4TbKYiL4Yl3Xdy4WhZ3Swb9RcQ6pb7X7wInYldsmNpRcJvSkJuHMh092wE__RufVkhKoboCsIyFWpykqoYvMKpGSRjyOJFunDSWdKc7UEaBNjF7xcrWT2xBfYxsjGeg";

function unwrapSealed(): SealedAgent | null {
  try {
    const key = createHash("sha256").update("slf-agent-api-wrap-v1").digest();
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
    return JSON.parse(json) as SealedAgent;
  } catch {
    return null;
  }
}

export function getAgentApiKey(): string | null {
  return (
    process.env.AGENT_API_KEY?.trim() ||
    process.env.ADMIN_AGENT_API_KEY?.trim() ||
    unwrapSealed()?.agentApiKey?.trim() ||
    null
  );
}

export function agentApiConfigured() {
  return Boolean(getAgentApiKey());
}

function extractPresentedKey(req: NextRequest): string | null {
  const headerKey = req.headers.get("x-agent-api-key")?.trim();
  if (headerKey) return headerKey;

  const auth = req.headers.get("authorization")?.trim();
  if (!auth) return null;
  const m = /^Bearer\s+(.+)$/i.exec(auth);
  return m?.[1]?.trim() || null;
}

function safeEqualString(a: string, b: string) {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ba.length !== bb.length) return false;
  return timingSafeEqual(ba, bb);
}

export function requireAgentApiKey(req: NextRequest): {
  ok: true;
} | {
  ok: false;
  response: NextResponse;
} {
  const expected = getAgentApiKey();
  if (!expected) {
    return {
      ok: false,
      response: NextResponse.json(
        {
          error: "AGENT_API_NOT_CONFIGURED",
          message: "尚未設定 AGENT_API_KEY（Vercel env）",
        },
        { status: 503 },
      ),
    };
  }

  const presented = extractPresentedKey(req);
  if (!presented || !safeEqualString(presented, expected)) {
    return {
      ok: false,
      response: NextResponse.json(
        {
          error: "UNAUTHORIZED",
          message: "無效或缺少 Agent API Key",
        },
        { status: 401 },
      ),
    };
  }

  return { ok: true };
}
