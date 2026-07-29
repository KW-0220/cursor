# Backend Integrations Architecture

## OpenAI API Key — Backend only

- `GEMINI_API_KEY` **只存在於 server env**（`.env.local` / Vercel Environment Variables）
- 唯一入口：`src/lib/openai.ts`（`import "server-only"`）→ `manusRespond()` 實際呼叫 **Gemini generateContent**
- Frontend **禁止** 直連 Google／OpenAI
- 前端只打自家 API：
  - `POST /api/chat`
  - `POST /api/analyze-document`（alias `/api/documents/analyze`；單檔／BR）
  - `POST /api/analyze-documents-batch`（銀行月結 6 份或 Audited 1–3 份 → **同一個 task**）

若在 Client Component import `@/lib/openai`，`server-only` 會於 build 直接炸掉。

```text
Browser ──► /api/chat | /api/analyze-document | /api/analyze-documents-batch
                │
                ├──► manusRespond() ──► Gemini generateContent（預設 gemini-3.5-flash）
                └──► getRagKnowledgeBase() ──► KB (stub → live)
```

批次策略：銀行月結 6→1 task；Audited 1–3→1 task；BR 獨立 1 task。單項「重新上載及分析」仍走單檔 API。
Env：`GEMINI_API_KEY` · `GEMINI_MODEL`（預設 `gemini-3.5-flash`）

## RAG Knowledge Base（預留）

| 層 | 位置 |
| --- | --- |
| Interface | `src/lib/integrations/rag.ts` → `RagKnowledgeBase` |
| HTTP | `GET/POST /api/rag` · `POST /api/rag/search` · `POST /api/rag/upsert` |
| Env | `RAG_PROVIDER` · `RAG_API_URL` · `RAG_API_KEY` · `RAG_INDEX` |

現況：`stub-in-memory`。接 Pinecone / pgvector / Azure AI Search 時實作同一 interface 即可。

`/api/chat` 已會先 `search()` 再把 chunks 注入 system prompt。

## MySQL（客戶／帳戶持久化）

| 層 | 位置 |
| --- | --- |
| Client | `src/lib/db/mysql.ts`（pool + auto schema） |
| Repos | `src/lib/db/auth-mysql.ts` · `src/lib/db/customers-mysql.ts` |
| Schema | `docs/mysql-schema.sql`（`users` · `customers`） |
| Status | `GET /api/auth/status` → `storage: "mysql"` · `durable: true` |
| Env | `MYSQL_HOST` · `MYSQL_USER` · `MYSQL_PASSWORD` · `MYSQL_DATABASE` · `MYSQL_PORT` · 或 `DATABASE_URL`／`MYSQL_URL` |

啟動後首次查詢會 `CREATE TABLE IF NOT EXISTS`。未設定時回退 Redis／`data/*.json`／記憶體。

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
