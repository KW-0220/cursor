# Backend Integrations Architecture

## OpenAI API Key — Backend only

- `OPENAI_API_KEY` **只存在於 server env**（`.env.local` / Vercel Environment Variables）
- 唯一入口：`src/lib/openai.ts`（`import "server-only"`）
- Frontend **禁止** `new OpenAI()` / 直連 `api.openai.com`
- 前端只打自家 API：
  - `POST /api/chat`
  - `POST /api/analyze-document`（alias `/api/documents/analyze`；單檔／BR）
  - `POST /api/analyze-documents-batch`（銀行月結 6 份或 Audited 1–3 份 → **同一個 Manus task**）

若在 Client Component import `@/lib/openai`，`server-only` 會於 build 直接炸掉。

```text
Browser ──► /api/chat | /api/analyze-document | /api/analyze-documents-batch
                │
                ├──► manusRespond() ──► Manus Responses（每 batch／BR 一個 task）
                └──► getRagKnowledgeBase() ──► KB (stub → live)
```

批次策略：銀行月結 6→1 task；Audited 1–3→1 task；BR 獨立 1 task。單項「重新上載及分析」仍走單檔 API。

## RAG Knowledge Base（預留）

| 層 | 位置 |
| --- | --- |
| Interface | `src/lib/integrations/rag.ts` → `RagKnowledgeBase` |
| HTTP | `GET/POST /api/rag` · `POST /api/rag/search` · `POST /api/rag/upsert` |
| Env | `RAG_PROVIDER` · `RAG_API_URL` · `RAG_API_KEY` · `RAG_INDEX` |

現況：`stub-in-memory`。接 Pinecone / pgvector / Azure AI Search 時實作同一 interface 即可。

`/api/chat` 已會先 `search()` 再把 chunks 注入 system prompt。

## CRM API（預留）

| 層 | 位置 |
| --- | --- |
| Interface | `src/lib/integrations/crm.ts` → `CrmClient` |
| HTTP | `GET/POST /api/crm` · `POST /api/crm/leads` · `GET /api/crm/leads/:id` · `POST /api/crm/applications/sync` |
| Env | `CRM_PROVIDER` · `CRM_API_URL` · `CRM_API_KEY` · `CRM_PIPELINE_ID` |

現況：memory stub。接 HubSpot / Salesforce / 自建 CRM 時替換 `getCrmClient()`。

## 適合度規則（參考）

`companyAge >= 2 && monthlyRevenue >= 100000 && debtRatio < 50` → `Suitable`  
（`src/lib/suitability.ts` · `POST /api/suitability/evaluate`）
