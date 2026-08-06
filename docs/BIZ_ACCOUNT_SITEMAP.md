# 開戶文件通｜Sitemap（MVP）

```text
/
├── /services
├── /legal/privacy
├── /legal/terms
├── /workspace/login             # ★ 開戶文件通專屬客戶登入／註冊（非 SME）
├── /workspace
│   ├── /apply/classify
│   ├── /apply/confirm-class
│   ├── /apply/applicant
│   ├── /apply/company
│   ├── /apply/people
│   ├── /apply/documents
│   ├── /apply/interview
│   ├── /apply/regions
│   ├── /apply/review
│   ├── /documents
│   ├── /supplements
│   ├── /progress
│   └── /account
└── /biz-admin
    ├── /login                   # 後台 biz_admin（與客戶登入分離）
    ├── /
    ├── /applications
    ├── /applications/[id]
    ├── /supplements
    ├── /whatsapp
    └── /audit
```

SME LoanFlow 客戶／管理員登入維持 `/auth/login`，**版面與開戶文件通完全分開**。

舊路徑 `/workspace/apply/company-docs|personal-docs|business-proof` → `/workspace/apply/documents`。
