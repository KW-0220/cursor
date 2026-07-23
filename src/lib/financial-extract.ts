import { z } from "zod";

/** 財務文件抽取結果 — 缺資料必須 null，不可猜測 */
export const FinancialExtractSchema = z.object({
  companyName: z.string().nullable(),
  fiscalYear: z.string().nullable(),
  revenue: z.number().nullable(),
  ebitda: z.number().nullable(),
  netProfit: z.number().nullable(),
  existingDebt: z.number().nullable(),
  currency: z.string().nullable().default("HKD"),
  notes: z.array(z.string()).default([]),
  confidence: z.number().min(0).max(1),
});

export type FinancialExtract = z.infer<typeof FinancialExtractSchema>;

export const financialExtractJsonSchema = {
  name: "financial_document_extract",
  strict: true,
  schema: {
    type: "object",
    additionalProperties: false,
    properties: {
      companyName: { type: ["string", "null"] },
      fiscalYear: { type: ["string", "null"] },
      revenue: { type: ["number", "null"] },
      ebitda: { type: ["number", "null"] },
      netProfit: { type: ["number", "null"] },
      existingDebt: { type: ["number", "null"] },
      currency: { type: ["string", "null"] },
      notes: { type: "array", items: { type: "string" } },
      confidence: { type: "number" },
    },
    required: [
      "companyName",
      "fiscalYear",
      "revenue",
      "ebitda",
      "netProfit",
      "existingDebt",
      "currency",
      "notes",
      "confidence",
    ],
  },
} as const;

export const FINANCIAL_EXTRACT_SYSTEM_PROMPT = `你是一個香港中小企貸款審批助手（文件分析引擎）。

請分析財務文件，抽取：
1. 公司名稱（companyName）
2. 財政年度（fiscalYear）
3. Revenue（revenue，港元數字，不要貨幣符號）
4. EBITDA（ebitda）
5. Net Profit（netProfit）
6. Existing Debt（existingDebt，現有負債總額）

硬性規則：
- 不要猜測不存在的資料；文件沒有就填 null
- 金額單位盡量解讀為 HKD；不確定在 notes 說明
- 不可承諾批核、不可寫「保證批出／拒絕」
- 以 JSON 回傳（由系統 schema 約束）`;

export function buildFinancialExtractUserText(input: {
  fileName?: string;
  pastedText?: string;
  companyNameHint?: string;
}) {
  const parts = [
    "請分析這份財務報表",
    input.fileName ? `檔名：${input.fileName}` : null,
    input.companyNameHint ? `申請公司提示：${input.companyNameHint}` : null,
    input.pastedText
      ? `以下為文件文字／OCR 內容（可能不完整）：\n---\n${input.pastedText.slice(0, 100_000)}\n---`
      : null,
  ].filter(Boolean);
  return parts.join("\n\n");
}
