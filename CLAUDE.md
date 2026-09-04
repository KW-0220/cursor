@AGENTS.md

# SME LoanFlow — Claude Code

香港中小企貸款智能申請（Next.js App Router）。客戶端 + `/admin` 審批台。AI 只做資料收集／文件初篩／預審，**不直接批貸**。

## 必守

- 寫任何 Next.js 前先讀 `node_modules/next/dist/docs/`（此版 API 與訓練資料不同）
- App LLM key 只放 Backend：`GEMINI_API_KEY`。禁止 `NEXT_PUBLIC_*` API key
- GitHub `@claude` Action 用 repo secret `ANTHROPIC_API_KEY` 或 `CLAUDE_CODE_OAUTH_TOKEN`（與 App 的 Gemini key 分開）
- 唯一 LLM 入口：`src/lib/openai.ts` → `manusRespond()`（現接 Gemini `generateContent`）
- 前端只打自家 API：`POST /api/chat`、`POST /api/analyze-document`、`POST /api/analyze-documents-batch`
- UI 文案用繁體中文

## 常用指令

```bash
npm run lint
npm run build
npm run dev          # 0.0.0.0:3000
```

本機請開 http://127.0.0.1:3000/ 。

## MCP

專案 MCP 在 `.mcp.json`（Claude Code）與 `.cursor/mcp.json`（Cursor），目前接 Supabase。
