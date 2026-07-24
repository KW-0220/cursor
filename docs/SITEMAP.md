# SME LoanFlow｜Sitemap

```text
/
├── /onboarding
├── /auth/login
├── /register/identity
├── /register/company
├── /app                         # 案件管理首頁（有申請後）
│   ├── /applications
│   │   └── /[id]                # 進度時間線
│   ├── /supplements             # 補件中心
│   ├── /notifications
│   ├── /ai                      # AI 助理／需求分析
│   └── /account
├── /apply                       # 申請 Wizard（有抵押／無抵押分流）
└── /admin
    ├── /                        # 案件總覽 KPI + 列表
    ├── /cases/[id]              # 一頁式財務簡報 + AI 初篩
    │   └── /documents           # 文件檢視器
    ├── /supplements
    ├── /rules
    └── /audit
```

## 底部導覽（客戶端）

| Tab | Route |
| --- | --- |
| 首頁 | `/app` |
| 申請 | `/app/applications` |
| AI 助理 | `/app/ai` |
| 我的帳戶 | `/app/account` |

## 對應 Brief 頁面代碼

| Code | Route / 實作位置 |
| --- | --- |
| P01 Splash | `/` |
| P02 Onboarding | `/onboarding` |
| P03 Login | `/auth/login` |
| P04 Identity | `/register/identity` |
| P05 Company | `/register/company` |
| P06 Dashboard | `/app` |
| P07 AI 需求分析 | `/app/ai` |
| P08–P17 Apply | `/apply`（step 0–7） |
| N01–N07 債務／聲明／初批 | `/apply/debts` → `declarations` → `confirm` → `analyzing` → `result` |
| KYC／BR／NAR1／月結單預審 | `/apply/kyc-docs` → `company-docs` → `statements` → `prescreen`（舊流） |
| **必須文件 hub（修正）** | `/apply/documents` → br / nar1 / bank-statements / identity / supplements / cross-check |
| **銀行現金流分析** | `/apply/cashflow` |
| Lead 預審轉介 | `/admin/leads/[id]` |
| N09–N12 政策核對 | `/admin/policy/[id]` |
| 現金流審批規則 | `/admin/cashflow-rules` |
| P12–P14 AI 文件分析 | `/app/document-analysis` · `POST /api/analyze-document` |
| 預審引擎 API | `GET/POST /api/prescreen/evaluate` |
| 現金流引擎 API | `GET/POST /api/cashflow/evaluate` · `GET/PUT /api/cashflow/rules` |
| 政策引擎 API | `GET/POST /api/policy/evaluate` |
| 適合度 API | `GET/POST /api/suitability/evaluate` |
| Chat（Backend OpenAI） | `POST /api/chat` |
| RAG KB（預留） | `/api/rag` · `/api/rag/search` · `/api/rag/upsert` |
| CRM（預留） | `/api/crm` · `/api/crm/leads` · `/api/crm/applications/sync` |
| P18 Progress | `/app/applications/[id]` |
| P19 Supplements | `/app/supplements` |
| P20 Notifications | `/app/notifications` |
| D02–D08 Admin | `/admin/*` |
