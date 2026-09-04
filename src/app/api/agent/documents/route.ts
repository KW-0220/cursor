import { NextRequest, NextResponse } from "next/server";
import { requireAgentApiKey } from "@/lib/agent-api-auth";
import { listDocuments } from "@/lib/documents-registry";

export const runtime = "nodejs";

/** GET /api/agent/documents — 文件 metadata（只讀；唔回 binary） */
export async function GET(req: NextRequest) {
  const gate = requireAgentApiKey(req);
  if (!gate.ok) return gate.response;

  try {
    const applicationId =
      req.nextUrl.searchParams.get("applicationId")?.trim() || undefined;
    const customerId =
      req.nextUrl.searchParams.get("customerId")?.trim() || undefined;

    const documents = await listDocuments({ applicationId, customerId });
    const limit = Math.min(
      Number(req.nextUrl.searchParams.get("limit") || "200") || 200,
      1000,
    );

    return NextResponse.json({
      ok: true,
      count: documents.length,
      documents: documents.slice(0, limit),
    });
  } catch (err) {
    return NextResponse.json(
      {
        error: "DOCUMENTS_FAILED",
        message: err instanceof Error ? err.message : "UNKNOWN",
      },
      { status: 500 },
    );
  }
}
