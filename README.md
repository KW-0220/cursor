# SME LoanFlow

香港中小企貸款智能申請 App（MVP 原型）  
客戶端 mobile-first Web + 內部 Desktop 審批控制台 + Design System + UX 文件。

> AI 是財務助理 + 文件分析引擎：資料收集 → 資格預審 → Lead 轉介準備。**不直接決定批核貸款。**

## 永久公開試用（Vercel）

**正式網址：** https://sme-loanflow.vercel.app

### AI 資料收集／預審流程（第一階段修正）

| 步驟 | URL |
| --- | --- |
| 必須文件 hub（BR／NAR1／6 個月 PDF／身份） | `/apply/documents` |
| 交叉核對 | `/apply/documents/cross-check` |
| 銀行現金流（ADB／進帳／異常） | `/apply/cashflow` |
| 客戶端初步結果 | `/apply/result` |
| 現金流審批規則（後台） | `/admin/cashflow-rules` |
| 引擎 API | `GET/POST /api/cashflow/evaluate` |

詳見 [`docs/PHASE1_CASHFLOW.md`](docs/PHASE1_CASHFLOW.md)。第一階段**不以三年 Audited Report 為必須**；EBITDA／Gearing 屬第二階段。

### AI 資料收集／預審流程（舊示範頁仍保留）

| 步驟 | URL |
| --- | --- |
| 身份證正反面 + 近 3 個月住址證明 | `/apply/kyc-docs` |
| BR 有效期 + NAR1 董事／股東 | `/apply/company-docs` |
| 月結單入賬加總 → 平均每月營業額 | `/apply/statements` |
| 預審條件／Lead 轉介準備 | `/apply/prescreen` |
| 內部 Lead 預審 | `/admin/leads/SLF-2026-00482` |
| 引擎 API | `GET/POST /api/prescreen/evaluate` |

### AI 十項政策審批（補充 Brief）

| 流程 | URL |
| --- | --- |
| 債務申報 | `/apply/debts` |
| 資格聲明 | `/apply/declarations` |
| AI 分析中 | `/apply/analyzing` |
| 客戶初果 | `/apply/result` |
| 內部十項核對 | `/admin/policy/SLF-2026-00482` |
| 引擎 API | `GET/POST /api/policy/evaluate` |

平均每月營業額＝各月結單**所有入賬加總 ÷ 月數**。BR 必須未過期；NAR1 需顯示董事及持股。

```bash
cd ~/Projects/sme-loanflow
npx vercel --prod --yes
# 設定 AI（Dashboard → Settings → Environment Variables，或 CLI）：
npx vercel env add GEMINI_API_KEY production
npx vercel env add GEMINI_MODEL production   # 可選：gemini-3.5-flash
npx vercel --prod --yes   # 加完 env 再 deploy 一次
```

未設 `GEMINI_API_KEY` 時，App 可瀏覽，但文件 AI 初篩會回 503。

### 臨時本機公開（唔推薦長期）

```bash
npm run dev          # Terminal 1
npm run dev:public   # Terminal 2 → 網址會變而且會過期
```

本機瀏覽器請用：http://127.0.0.1:3000/（唔好用 localhost，避免 IPv6 拒連）


## Gemini／AI 接入（Backend only）

> **`GEMINI_API_KEY` 只放 Backend。Frontend 不可直連 Google。** 詳見 [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)

| 項目 | 說明 |
| --- | --- |
| Env | `GEMINI_API_KEY`（必要）、`GEMINI_MODEL`（預設 `gemini-3.5-flash`） |
| Chat | `POST /api/chat`（內部先 RAG search，再叫 OpenAI） |
| Docs | `POST /api/analyze-document`（alias：`/api/documents/analyze`） |
| RAG | `POST /api/rag/search` · `POST /api/rag/upsert`（接口已預留，現為 stub） |
| CRM | `POST /api/crm/leads` · `POST /api/crm/applications/sync`（接口已預留，現為 stub） |
| MySQL | `users`／`customers`（設 `MYSQL_*` 或 `DATABASE_URL`）；狀態見 `GET /api/auth/status` |
| 合規 | 客戶端不顯示「必定批核／拒絕」；內部可看綠／黃／紅燈 |

```bash
# curl 範例（貼文字）
curl -X POST http://localhost:3000/api/analyze-document \
  -F 'text=公司：智創科技。FY2025 營業額 1620萬，淨利 142萬。近六月平均入數約 150萬，現有月供 4萬。' \
  -F 'loanType=unsecured' \
  -F 'amountHkd=1500000' \
  -F 'purpose=營運資金' \
  -F 'companyName=智創科技有限公司'
```

## 已覆蓋

### 客戶端

- Splash / Onboarding / Login
- 身份與公司登記
- Dashboard（案件進度 + 待辦）
- AI 助理 + **文件 AI 資格初篩**
- 有抵押／無抵押申請分流（含真實文件分析入口）
- 申請進度時間線、補件中心、通知、帳戶／私隱入口

### 內部控制台

- KPI 案件總覽、財務簡報、三色燈、文件檢視器
- **AI 文件初篩（含內部三色燈）**
- 補件管理、初篩規則、Audit Log

### 文件

- [`docs/SITEMAP.md`](docs/SITEMAP.md)
- [`docs/USER_FLOWS.md`](docs/USER_FLOWS.md)
- [`docs/DESIGN_SYSTEM.md`](docs/DESIGN_SYSTEM.md)
- [`docs/BRIEF_REVIEW.md`](docs/BRIEF_REVIEW.md)

## Stack

- Next.js 16 + TypeScript + Tailwind 4
- OpenAI SDK + Zod JSON Schema
- unpdf（文字型 PDF）；圖片走 Vision

## 下一步

1. Auth + RBAC  
2. 物件儲存加密上載 + 正式 OCR pipeline  
3. 接真實 RAG provider（`RAG_PROVIDER`）+ CRM（`CRM_PROVIDER`）  
4. 狀態機 + Push／Email／SMS  
5. 規則引擎與完整 Audit Log  
