# 開戶文件通｜產品 Brief（開發版）

> 完整 UI／UX Brief 已整合。本文件為開發落地摘要；細節以本 repo 程式常數與狀態機為準。

## 產品定位

**協助客戶整理、提交及追蹤公司成立與商業戶口文件的數碼申請工作空間。**

非銀行審批系統。文件收齊 ≠ 開戶成功。

## MVP 範圍（第一階段）

- 電郵註冊／登入（沿用 `/auth/login`）
- **申請前分類問卷**（主要股東身份 × 公司年期 × 關聯公司）→ **六類動態文件清單**
- 客戶控制台（狀態、完成度、尚欠項目、下一步、類別摘要）
- 分步申請 + 自動／手動儲存
- 文件群組 A–J 動態上載（流水月份／發票數量／關聯公司／審計／面簽 Checklist）
- 提交前檢查 + 正式提交
- 進度 Timeline + 補件中心
- WhatsApp 通知紀錄（提交／補件／收齊）
- 獨立後台：申請分類、改類別（需原因）、文件要求覆寫、審核
- 角色 `biz_admin` + 操作紀錄

## 文件分類核心

系統**不可**向所有客戶顯示同一份清單。完成三題分類後才顯示對應文件。詳見 `src/lib/bizdoc/classification.ts`、`documents.ts`。

| 類別 | 身份 | 年期 | 關聯公司 |
| --- | --- | --- | --- |
| 1–2 | 內地／外國 | 未滿一年 | 有／無 |
| 3 | 香港本地 | 未滿一年 | 無 |
| 4–5 | 內地／外國 | 超過一年 | 有／無 |
| 6 | 香港本地 | 超過一年 | 無 |
| 3r／6r | 香港本地 + 有關聯（規格擴充） | | |

## Supabase

| 項目 | 值 |
| --- | --- |
| Project | `szftkaipvrdvzgcurofa`（SME） |
| Table | `public.biz_applications` |
| Admin API | `/api/biz/admin/applications`（需 `app_metadata.role=biz_admin`） |
| Admin bootstrap | `/api/biz/admin/bootstrap`（帳密 `admin@hkbank.com`） |
| Client sync | `POST /api/biz/applications` |

Migration：`supabase/migrations/20260806075714_create_biz_applications.sql`、`20260806111000_biz_admin_role_rls.sql`

## 路由

| 區域 | Path |
| --- | --- |
| 行銷首頁 | `/` |
| 服務介紹 | `/services` |
| 客戶工作台 | `/workspace` |
| 分步申請 | `/workspace/apply/[step]` |
| 進度／補件／文件中心 | `/workspace/progress` · `/workspace/supplements` · `/workspace/documents` |
| **獨立後台登入** | `/biz-admin/login` |
| 後台總覽 | `/biz-admin` |
| 申請管理 | `/biz-admin/applications` · `/biz-admin/applications/[id]` |
| 補件／WhatsApp／審計 | `/biz-admin/supplements` · `/biz-admin/whatsapp` · `/biz-admin/audit` |

貸款產品既有路由（`/app`、`/apply`、`/admin`）保留不變，**與開戶文件通後台完全分離**（不同帳號、角色、UI、API gate）。

## 設計方向

**Premium Corporate × Modern Digital Service**  
Token：深墨綠 `--forest-*` + 暖金 `--gold-*`（方向 A），與貸款產品海軍藍區隔。

## 文案地雷

禁止暗示「文件齊全＝戶口已批」。狀態須區分：文件已收齊 → 下一階段 → 已提交相關機構 → 機構處理中。
