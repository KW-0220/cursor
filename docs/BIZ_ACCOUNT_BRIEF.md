# 開戶文件通｜產品 Brief（開發版）

> 完整 UI／UX Brief 已整合。本文件為開發落地摘要；細節以本 repo 程式常數與狀態機為準。

## 產品定位

**協助客戶整理、提交及追蹤公司成立與商業戶口文件的數碼申請工作空間。**

非銀行審批系統。文件收齊 ≠ 開戶成功。

## MVP 範圍（第一階段）

- 電郵註冊／登入（沿用 `/auth/login`）
- 客戶控制台（狀態、完成度、尚欠項目、下一步）
- 八步申請表單 + 自動／手動儲存
- 分類文件上載（公司／個人／業務證明）
- 提交前檢查 + 正式提交
- 進度 Timeline + 補件中心
- WhatsApp 通知紀錄（提交／補件／收齊）
- 後台申請列表／詳情／逐項審核／確認文件已收齊（**Supabase `biz_applications`**）
- 角色預留 + 操作紀錄結構

## Supabase

| 項目 | 值 |
| --- | --- |
| Project | `szftkaipvrdvzgcurofa`（SME） |
| Table | `public.biz_applications` |
| Admin API | `/api/biz/admin/applications`（需 `app_metadata.role=admin`） |
| Client sync | `POST /api/biz/applications` |

Migration：`supabase/migrations/20260806075714_create_biz_applications.sql`

## 路由

| 區域 | Path |
| --- | --- |
| 行銷首頁 | `/` |
| 服務介紹 | `/services` |
| 客戶工作台 | `/workspace` |
| 分步申請 | `/workspace/apply/[step]` |
| 進度／補件／文件中心 | `/workspace/progress` · `/workspace/supplements` · `/workspace/documents` |
| 後台申請 | `/biz-admin` · `/biz-admin/[id]` |

貸款產品既有路由（`/app`、`/apply`、`/admin` 案件）保留不變。

## 設計方向

**Premium Corporate × Modern Digital Service**  
Token：深墨綠 `--forest-*` + 暖金 `--gold-*`（方向 A），與貸款產品海軍藍區隔。

## 文案地雷

禁止暗示「文件齊全＝戶口已批」。狀態須區分：文件已收齊 → 下一階段 → 已提交相關機構 → 機構處理中。
