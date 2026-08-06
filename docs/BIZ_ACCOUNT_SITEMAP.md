# 開戶文件通｜Sitemap（MVP）

```text
/
├── /services                    # 服務介紹／文件清單／FAQ
├── /legal/privacy
├── /legal/terms
├── /auth/login                  # 客戶電郵註冊／登入（及 SME 貸款後台）
├── /workspace                   # 客戶控制台
│   ├── /apply/[step]            # 八步申請
│   ├── /documents               # 文件中心
│   ├── /supplements             # 補件
│   ├── /progress                # Timeline + WhatsApp 紀錄
│   └── /account
└── /biz-admin                   # ★ 獨立後台（非 SME /admin）
    ├── /login                   # biz_admin 專屬登入
    ├── /                        # 總覽 dashboard
    ├── /applications            # 申請列表
    ├── /applications/[id]       # 詳情 Tabs + 文件審核
    ├── /supplements             # 跨申請補件中心
    ├── /whatsapp                # WhatsApp 通知中心
    └── /audit                   # 操作審計
```

貸款產品路由（`/app`、`/apply`、`/admin`）保留，**不與開戶文件通後台共用 UI／導航／角色**。
