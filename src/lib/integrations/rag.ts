import "server-only";

/**
 * RAG Knowledge Base 接口（預留）
 * 前端不可直連向量庫；一律經 Backend /api/rag/* 或 server lib 呼叫。
 */

export interface KnowledgeChunk {
  id: string;
  content: string;
  source: string;
  score: number;
  metadata?: Record<string, string | number | boolean | null>;
}

export interface RagSearchQuery {
  query: string;
  topK?: number;
  /** 例如 product=sme-loan | docType=policy */
  filters?: Record<string, string>;
}

export interface RagUpsertDocument {
  id?: string;
  content: string;
  source: string;
  metadata?: Record<string, string | number | boolean | null>;
}

export interface RagSearchResult {
  provider: string;
  mode: "stub" | "live";
  chunks: KnowledgeChunk[];
  query: string;
}

export interface RagKnowledgeBase {
  readonly provider: string;
  search(input: RagSearchQuery): Promise<RagSearchResult>;
  upsert(docs: RagUpsertDocument[]): Promise<{ upserted: number; mode: "stub" | "live" }>;
}

/** 內建示範知識（stub）；接上 Pinecone / pgvector / Azure AI Search 時替換 */
const STUB_CORPUS: KnowledgeChunk[] = [
  {
    id: "kb-suitability",
    content:
      "初步適合度規則（非正式批核）：companyAge >= 2 且 monthlyRevenue >= 100000 且 debtRatio < 50 → Suitable。",
    source: "internal://policy/suitability",
    score: 1,
    metadata: { docType: "policy" },
  },
  {
    id: "kb-docs",
    content:
      "申請一般需：身份證正反面、近3個月住址證明、有效BR、NAR1（董事及持股）、銀行月結單（加總入賬計算平均每月營業額）。",
    source: "internal://guides/documents",
    score: 1,
    metadata: { docType: "guide" },
  },
  {
    id: "kb-role",
    content:
      "AI 為財務助理＋文件分析引擎，只做資料收集與預審條件核對，不可承諾批核或利率。",
    source: "internal://compliance/ai-role",
    score: 1,
    metadata: { docType: "compliance" },
  },
];

class StubRagKnowledgeBase implements RagKnowledgeBase {
  readonly provider = "stub-in-memory";

  async search(input: RagSearchQuery): Promise<RagSearchResult> {
    const q = input.query.toLowerCase();
    const topK = input.topK ?? 3;
    const scored = STUB_CORPUS.map((c) => {
      const hay = `${c.content} ${c.source}`.toLowerCase();
      const hit =
        q.split(/\s+/).filter(Boolean).some((t) => hay.includes(t)) ||
        hay.includes(q);
      return { ...c, score: hit ? 0.82 : 0.25 };
    })
      .sort((a, b) => b.score - a.score)
      .slice(0, topK);

    return {
      provider: this.provider,
      mode: "stub",
      chunks: scored,
      query: input.query,
    };
  }

  async upsert(docs: RagUpsertDocument[]) {
    // 預留：接上真實向量庫時寫入 embedding store
    return { upserted: docs.length, mode: "stub" as const };
  }
}

/**
 * 工廠：之後可用 RAG_PROVIDER=pinecone|pgvector|azure 切換實作。
 * Env 預留：RAG_API_URL / RAG_API_KEY / RAG_INDEX
 */
export function getRagKnowledgeBase(): RagKnowledgeBase {
  const provider = process.env.RAG_PROVIDER?.trim() || "stub";
  if (provider !== "stub") {
    // 真實 provider 尚未接線；回退 stub 並在結果標明
    return new StubRagKnowledgeBase();
  }
  return new StubRagKnowledgeBase();
}

export function buildRagContextBlock(chunks: KnowledgeChunk[]) {
  if (!chunks.length) return "";
  return chunks
    .map(
      (c, i) =>
        `[KB${i + 1} | ${c.source} | score=${c.score.toFixed(2)}]\n${c.content}`,
    )
    .join("\n\n");
}
