import { NextRequest, NextResponse } from "next/server";
import {
  getRagKnowledgeBase,
  type RagSearchQuery,
  type RagUpsertDocument,
} from "@/lib/integrations/rag";

export const runtime = "nodejs";

/**
 * RAG Knowledge Base — Backend only.
 * Frontend: POST /api/rag/search | /api/rag/upsert
 * 不可直連向量庫或 OpenAI embeddings。
 */

export async function GET() {
  return NextResponse.json({
    ok: true,
    interface: "RagKnowledgeBase",
    endpoints: {
      search: "POST /api/rag/search",
      upsert: "POST /api/rag/upsert",
    },
    env: ["RAG_PROVIDER", "RAG_API_URL", "RAG_API_KEY", "RAG_INDEX"],
    provider: process.env.RAG_PROVIDER || "stub",
  });
}

export async function POST(req: NextRequest) {
  // convenience: same as /search when body has query
  const body = (await req.json()) as RagSearchQuery & {
    docs?: RagUpsertDocument[];
  };
  const rag = getRagKnowledgeBase();
  if (body.docs) {
    const result = await rag.upsert(body.docs);
    return NextResponse.json({ ok: true, ...result });
  }
  if (!body.query?.trim()) {
    return NextResponse.json(
      { error: "query required (or docs for upsert)" },
      { status: 400 },
    );
  }
  const result = await rag.search(body);
  return NextResponse.json({ ok: true, result });
}
