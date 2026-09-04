import "server-only";
import { timingSafeEqual } from "crypto";
import { NextRequest, NextResponse } from "next/server";

/**
 * Claude Code／agent 只讀後台 API 認證。
 * Header（擇一）：
 * - Authorization: Bearer <AGENT_API_KEY>
 * - X-Agent-Api-Key: <AGENT_API_KEY>
 *
 * Env：AGENT_API_KEY 或 ADMIN_AGENT_API_KEY
 */

export function getAgentApiKey(): string | null {
  return (
    process.env.AGENT_API_KEY?.trim() ||
    process.env.ADMIN_AGENT_API_KEY?.trim() ||
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
