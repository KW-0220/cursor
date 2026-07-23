import { NextRequest, NextResponse } from "next/server";
import {
  getRagKnowledgeBase,
  type RagSearchQuery,
} from "@/lib/integrations/rag";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as RagSearchQuery;
    if (!body.query?.trim()) {
      return NextResponse.json({ error: "query required" }, { status: 400 });
    }
    const result = await getRagKnowledgeBase().search({
      query: body.query,
      topK: body.topK ?? 3,
      filters: body.filters,
    });
    return NextResponse.json({ ok: true, result });
  } catch (err) {
    return NextResponse.json(
      {
        error: "RAG_SEARCH_FAILED",
        message: err instanceof Error ? err.message : "UNKNOWN",
      },
      { status: 500 },
    );
  }
}
