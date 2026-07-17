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
| P12–P14 GPT 文件初篩 | `/app/document-analysis` · `POST /api/documents/analyze` |
| P18 Progress | `/app/applications/[id]` |
| P19 Supplements | `/app/supplements` |
| P20 Notifications | `/app/notifications` |
| D02–D08 Admin | `/admin/*` |
