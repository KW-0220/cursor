# 設計規格修正：四項必須文件 + 銀行現金流（第一階段）

對應 Brief「文件上載要求及 AI 銀行月結單分析模組」。

## 產品定位

**第一階段：初步資格及現金流評估**（非正式批核）

1. BR  
2. NAR1  
3. 最近六個月銀行月結單（**僅 PDF**）  
4. 身份證明（董事／股東／擔保人）

輸出：文件完整度、交叉核對、ADB、進帳、異常、綠／黃／紅（內部）／客戶端中性結果。

**第二階段：正式信貸審批** — Audited Report 等補件 → EBITDA／Gearing／DSCR。

## 實作對照（R01–R21 精簡）

| 編號 | 畫面 | Route |
| --- | --- | --- |
| R02 | 文件上載主頁 | `/apply/documents` |
| R03 | BR | `/apply/documents/br` |
| R04 | NAR1 | `/apply/documents/nar1` |
| R05–R06 | 六個月 PDF／完整性 | `/apply/documents/bank-statements` |
| R07–R08 | 人士＋身份 | `/apply/documents/identity` |
| R09 | 補充文件 | `/apply/documents/supplements` |
| R10 | 交叉核對 | `/apply/documents/cross-check` |
| R12–R16 | 銀行現金流分析 | `/apply/cashflow` |
| R17 | 客戶端初步結果 | `/apply/result` |
| R20 | 現金流審批規則 | `/admin/cashflow-rules` |

## 核心 lib／API

- `src/lib/required-docs.ts` — 必須文件狀態、交叉核對  
- `src/lib/bank-cashflow.ts` — ADB（日終帳面）、進帳、異常偵測、規則命中  
- `src/lib/cashflow-rules.ts` — **可配置門檻**（不寫死 UI）  
- `GET/POST /api/cashflow/evaluate`  
- `GET/PUT /api/cashflow/rules`  

## ADB 定義

> 每日平均餘額＝分析期內所有曆日日終結餘總和 ÷ 曆日總數（Ledger Balance）

缺期初／缺頁／無法重建 → **不估算**，黃燈「數據不足」。

## 客戶端文案

不可寫「貸款已批核」。建議：

> 已完成初步資格評估，申請將進入下一階段文件及信貸審批。
