import { NextRequest, NextResponse } from "next/server";
import { requireAgentApiKey } from "@/lib/agent-api-auth";
import {
  getArchivedAnalysis,
  listArchivedAnalyses,
} from "@/lib/analysis-archive-registry";

export const runtime = "nodejs";

/** GET /api/agent/analysis-archive — AI 分析歸檔（只讀） */
export async function GET(req: NextRequest) {
  const gate = requireAgentApiKey(req);
  if (!gate.ok) return gate.response;

  try {
    const id = req.nextUrl.searchParams.get("id")?.trim();
    if (id) {
      const record = await getArchivedAnalysis(id);
      if (!record) {
        return NextResponse.json(
          { error: "NOT_FOUND", message: "找不到歸檔" },
          { status: 404 },
        );
      }
      return NextResponse.json({ ok: true, record });
    }

    const records = await listArchivedAnalyses();
    const limit = Math.min(
      Number(req.nextUrl.searchParams.get("limit") || "100") || 100,
      500,
    );
    return NextResponse.json({
      ok: true,
      count: records.length,
      records: records.slice(0, limit),
    });
  } catch (err) {
    return NextResponse.json(
      {
        error: "ARCHIVE_FAILED",
        message: err instanceof Error ? err.message : "UNKNOWN",
      },
      { status: 500 },
    );
  }
}
