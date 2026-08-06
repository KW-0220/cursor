# 開戶文件通｜Sitemap（MVP）

```text
/
├── /services
├── /legal/privacy
├── /legal/terms
├── /auth/login
├── /workspace
│   ├── /apply/classify           # ★ 申請前分類問卷（身份／年期／關聯公司）
│   ├── /apply/confirm-class     # ★ 確認六類文件類別
│   ├── /apply/applicant
│   ├── /apply/company
│   ├── /apply/people
│   ├── /apply/documents         # ★ 動態文件群組 A–J 上載
│   ├── /apply/interview         # ★ 面簽帶備 Checklist
│   ├── /apply/regions
│   ├── /apply/review
│   ├── /documents
│   ├── /supplements
│   ├── /progress
│   └── /account
└── /biz-admin
    ├── /login
    ├── /
    ├── /applications
    ├── /applications/[id]       # 含申請分類／改類別／文件要求控制
    ├── /supplements
    ├── /whatsapp
    └── /audit
```

舊路徑 `/workspace/apply/company-docs|personal-docs|business-proof` 會 redirect 至 `/workspace/apply/documents`。
