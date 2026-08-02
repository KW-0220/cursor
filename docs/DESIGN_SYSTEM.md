# SME LoanFlow｜Design System

## 原則

專業金融科技、可信、簡潔。避免鈔票／金幣／「即批即借」視覺。避免 AI 常見紫漸層、奶油底+陶土色、報紙風。

## Tokens

| Token | Value | 用途 |
| --- | --- | --- |
| `--navy-900` | `#12304a` | 主色、主 CTA |
| `--teal-500` | `#14919b` | 輔助／科技感、進度 |
| `--success-600` | `#1f7a4d` | 成功 |
| `--warning-600` | `#b86a00` | 提醒／補件 |
| `--danger-600` | `#b42318` | 重大提示（少用大面積） |
| `--surface-0` | `#f5f7fa` | 頁面背景 |
| `--text-primary` | `#243447` | 正文（非純黑） |

## Typography

- 中文／全域：Noto Sans TC
- 數據：`.tabular`（tabular-nums）
- 客戶端容器：`.client-shell`／`.mobile-shell` — 流動 max-width 430px；桌面網頁放寬至 ~920px（`--wide` 1100px）

## Components（`src/components/ui`）

| Component | 用途 |
| --- | --- |
| `Button` | primary / secondary / outline / ghost / danger |
| `Field` / `Input` / `Select` / `Textarea` | 表單 |
| `StatusTag` / `DocStatusTag` / `TrafficLight` | 狀態與初篩 |
| `Card` / `PageHeader` / `SectionHeader` | 版面 |
| `EmptyState` / `StateBanner` / `Disclaimer` / `ProgressBar` | 狀態與合規文案 |

## 狀態設計 Checklist

每個主要頁需覆蓋：Loading、Empty、Success、Warning、Error、Offline、Session Timeout、Permission Denied。

## Motion

- `animate-fade-up`：頁面進入
- `animate-pulse-soft`：載入暗示
- `skeleton`：列表佔位

## Admin vs App

- App（流動）：mobile-first、底部四 Tab、大 CTA、分步表單（430px frame）
- App（網頁版）：同一套路由／API／資料；桌面 TopNav + 放寬內容寬度；`.client-sticky-bar` 跟殼寬
- Admin：desktop sidebar、數據表、圖表、左右文件檢視器（獨立 `AdminShell`，不與客戶端殼共用）
- 共用：Backend、Supabase、Object Storage、AI 分析、Authentication、申請／文件／草稿／進度／授權／審批結果