import { NextRequest, NextResponse } from "next/server";
import {
  getRagKnowledgeBase,
  type RagUpsertDocument,
} from "@/lib/integrations/rag";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as { docs?: RagUpsertDocument[] };
    if (!body.docs?.length) {
      return NextResponse.json({ error: "docs[] required" }, { status: 400 });
    }
    const result = await getRagKnowledgeBase().upsert(body.docs);
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    return NextResponse.json(
      {
        error: "RAG_UPSERT_FAILED",
        message: err instanceof Error ? err.message : "UNKNOWN",
      },
      { status: 500 },
    );
  }
}
