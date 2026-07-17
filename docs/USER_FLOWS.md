# SME LoanFlow｜User Flows

## 客戶端主流程

```mermaid
flowchart TD
  A[Splash] --> B[Onboarding]
  B --> C[Login / Register]
  C --> D[Identity]
  D --> E[Company]
  E --> F[Home Dashboard]
  F --> G[AI 需求分析]
  G --> H[Apply Wizard]
  F --> H
  H --> I{貸款類型}
  I -->|有抵押| J[抵押物業資料]
  I -->|無抵押| K[現有貸款情況]
  J --> L[文件上載 + AI 完整性檢查]
  K --> L
  L --> M[OCR 資料確認]
  M --> N[申請摘要]
  N --> O[聲明授權]
  O --> P[提交成功]
  P --> Q[申請進度]
  Q --> R{需補件?}
  R -->|是| S[補件中心]
  S --> L
  R -->|否| T[顧問跟進 / 送交貸款機構]
  T --> U[正式審批結果]
```

## 有抵押 vs 無抵押差異

| 步驟 | 有抵押 | 無抵押 |
| --- | --- | --- |
| 細節頁 | 物業資料 + 估計淨值 | 現有貸款多筆 |
| 文件 | + 物業證明、按揭資料 | + 授信信 |
| 簡報 | 顯示抵押資產區塊 | 債務比重權重更高 |

## 內部審批流程

```mermaid
flowchart TD
  A[新申請進件] --> B[AI Processing]
  B --> C[一頁式財務簡報]
  C --> D{三色燈}
  D -->|綠| E[優先顧問跟進]
  D -->|黃| F[補件或人工覆核]
  D -->|紅| G[資深審批覆核]
  F --> H[D07 建立補件]
  H --> I[客戶上載]
  I --> B
  E --> J[送交合作機構]
  G --> J
  J --> K[更新狀態 / Audit Log]
```

## AI 對話例外

- 問批核機會／利率／正式條款 → 顯示「聯絡貸款顧問」
- 文件矛盾／投訴／連續兩次無法理解 → 人工轉介
- 每次回覆：直接答案 + 下一步 + 可點擊操作 + 免責

## 錯誤／例外狀態（設計要求）

| 狀態 | 行為 |
| --- | --- |
| Loading | 顯示正在處理任務文案，非純轉圈 |
| Empty | 清楚 CTA |
| Offline | 保存草稿，恢復後續傳 |
| Session Timeout | 敏感資料提醒重新登入 |
| Permission Denied | 說明相機／檔案／通知用途 |
| OCR 低信心 | 不可當確定資料，要求覆核 |
