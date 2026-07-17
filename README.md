# SME LoanFlow

香港中小企貸款智能申請 App（MVP 原型）  
客戶端 mobile-first Web + 內部 Desktop 審批控制台 + Design System + UX 文件。

> AI 不做最終批核。核心是減文件錯漏、補件與人工初篩時間。

## Quick start

```bash
cd ~/Projects/sme-loanflow
npm install
cp .env.example .env.local
# 編輯 .env.local，填入 OPENAI_API_KEY=sk-...
npm run dev
```

- 客戶端：http://localhost:3000  
- 示範首頁：http://localhost:3000/app  
- **ChatGPT 文件初篩（申請人）**：http://localhost:3000/app/document-analysis  
- **ChatGPT 文件初篩（內部，含三色燈）**：http://localhost:3000/admin/ai-analyze  
- 申請 Wizard：http://localhost:3000/apply  
- 內部控制台：http://localhost:3000/admin  

## OpenAI／ChatGPT 接入

| 項目 | 說明 |
| --- | --- |
| Env | `OPENAI_API_KEY`（必要）、`OPENAI_MODEL`（預設 `gpt-4o-mini`） |
| API | `POST /api/documents/analyze`（`multipart/form-data`） |
| 欄位 | `file`、`text`、`loanType`、`amountHkd`、`purpose`、`companyName` |
| 流程 | PDF 抽字／圖片 Vision → GPT JSON Schema → 完整性 + 初篩 |
| 合規 | 客戶端不顯示「必定批核／拒絕」；內部可看綠／黃／紅燈 |

```bash
# curl 範例（貼文字）
curl -X POST http://localhost:3000/api/documents/analyze \
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
- AI 助理 + **文件 ChatGPT 資格初篩**
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
- pdf-parse（文字型 PDF）；圖片走 Vision

## 下一步

1. Auth + RBAC  
2. 物件儲存加密上載 + 正式 OCR pipeline  
3. 狀態機 + Push／Email／SMS  
4. 規則引擎與完整 Audit Log  
