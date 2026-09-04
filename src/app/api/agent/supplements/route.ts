import { NextRequest, NextResponse } from "next/server";
import { requireAgentApiKey } from "@/lib/agent-api-auth";
import { listSupplements } from "@/lib/supplements-registry";
import type { SupplementRecord } from "@/lib/supplements-registry";

export const runtime = "nodejs";

/** GET /api/agent/supplements — 補件紀錄（只讀） */
export async function GET(req: NextRequest) {
  const gate = requireAgentApiKey(req);
  if (!gate.ok) return gate.response;

  try {
    const status = req.nextUrl.searchParams.get("status")?.trim() as
      | SupplementRecord["status"]
      | undefined;
    const supplements = await listSupplements(
      status ? { status } : undefined,
    );
    const limit = Math.min(
      Number(req.nextUrl.searchParams.get("limit") || "200") || 200,
      1000,
    );
    return NextResponse.json({
      ok: true,
      count: supplements.length,
      supplements: supplements.slice(0, limit),
    });
  } catch (err) {
    return NextResponse.json(
      {
        error: "SUPPLEMENTS_FAILED",
        message: err instanceof Error ? err.message : "UNKNOWN",
      },
      { status: 500 },
    );
  }
}
