# SME LoanFlow

香港中小企貸款智能申請 App（MVP 原型）  
客戶端 mobile-first Web + 內部 Desktop 審批控制台 + Design System + UX 文件。

> AI 不做最終批核。核心是減文件錯漏、補件與人工初篩時間。

## Quick start

```bash
cd ~/Projects/sme-loanflow
npm install
npm run dev
```

- 客戶端：http://localhost:3000  
- 示範首頁（已有申請）：http://localhost:3000/app  
- 申請 Wizard：http://localhost:3000/apply  
- 內部控制台：http://localhost:3000/admin  

## 已覆蓋

### 客戶端

- Splash / Onboarding / Login
- 身份與公司登記
- Dashboard（案件進度 + 待辦）
- AI 助理（快速選項、免責、轉介顧問）
- 有抵押／無抵押申請分流（金額、物業／債務、文件、OCR 確認、摘要、授權、提交）
- 申請進度時間線、補件中心、通知、帳戶／私隱入口

### 內部控制台

- KPI 案件總覽 + 篩選 + 列表
- 一頁式財務簡報（趨勢圖、現金流、債務、抵押）
- 三色燈初篩（圖示 + 原因 + 下一步）
- 文件檢視器（左原文／右 OCR）
- 補件管理模板、初篩規則審計欄位、Audit Log

### 文件

- [`docs/SITEMAP.md`](docs/SITEMAP.md)
- [`docs/USER_FLOWS.md`](docs/USER_FLOWS.md)
- [`docs/DESIGN_SYSTEM.md`](docs/DESIGN_SYSTEM.md)
- [`docs/BRIEF_REVIEW.md`](docs/BRIEF_REVIEW.md) ← 產品盲點建議預設

## Stack

- Next.js 16 App Router + TypeScript + Tailwind CSS 4
- lucide-react / recharts
- Mock data only（無真實 OCR／LLM／推播）

## 下一步（真後端時）

1. Auth（OTP／電郵）+ 角色 RBAC  
2. 文件上傳（加密物件儲存）+ OCR pipeline  
3. 申請狀態機 + 補件通知（Push／Email／SMS）  
4. 初篩規則引擎 + 完整 Audit Log  
5. Expo／RN 殼包裝同一 API（可選）
