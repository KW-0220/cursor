import { z } from "zod";

/**
 * 財務文件抽取 — 輸出格式固定為：
 * {
 *   company_name, financial_year, revenue, EBITDA, net_profit, existing_debt
 * }
 * 缺資料必須 null，不可猜測。
 */
export const FinancialExtractSchema = z.object({
  company_name: z.string().nullable(),
  financial_year: z.string().nullable(),
  revenue: z.number().nullable(),
  EBITDA: z.number().nullable(),
  net_profit: z.number().nullable(),
  existing_debt: z.number().nullable(),
});

export type FinancialExtract = z.infer<typeof FinancialExtractSchema>;

export const financialExtractJsonSchema = {
  name: "financial_document_extract",
  strict: true,
  schema: {
    type: "object",
    additionalProperties: false,
    properties: {
      company_name: { type: ["string", "null"] },
      financial_year: { type: ["string", "null"] },
      revenue: { type: ["number", "null"] },
      EBITDA: { type: ["number", "null"] },
      net_profit: { type: ["number", "null"] },
      existing_debt: { type: ["number", "null"] },
    },
    required: [
      "company_name",
      "financial_year",
      "revenue",
      "EBITDA",
      "net_profit",
      "existing_debt",
    ],
  },
} as const;

export const FINANCIAL_EXTRACT_SYSTEM_PROMPT = `你是一個香港中小企貸款審批助手（文件分析引擎）。

請分析財務文件，並「只以 JSON」輸出以下欄位（不要加其他文字）：

{
  "company_name": string | null,
  "financial_year": string | null,
  "revenue": number | null,
  "EBITDA": number | null,
  "net_profit": number | null,
  "existing_debt": number | null
}

對應抽取：
1. company_name — 公司名稱
2. financial_year — 財政年度（例如 "2025"）
3. revenue — Revenue（港元數字，不要貨幣符號）
4. EBITDA
5. net_profit — Net Profit
6. existing_debt — Existing Debt（現有負債總額）

硬性規則：
- 必須輸出合法 JSON
- 不要猜測不存在的資料；文件沒有就填 null
- 金額為純數字（例如 6200000），不要字串、不要逗號
- 不可承諾批核、不可寫「保證批出／拒絕」`;

export function buildFinancialExtractUserText(input: {
  fileName?: string;
  pastedText?: string;
  companyNameHint?: string;
}) {
  const parts = [
    "請分析這份財務報表，並以指定 JSON 格式輸出。",
    input.fileName ? `檔名：${input.fileName}` : null,
    input.companyNameHint ? `申請公司提示：${input.companyNameHint}` : null,
    input.pastedText
      ? `以下為文件文字／OCR 內容（可能不完整）：\n---\n${input.pastedText.slice(0, 100_000)}\n---`
      : null,
  ].filter(Boolean);
  return parts.join("\n\n");
}

/** 示範 payload（schema 範例） */
export const FINANCIAL_EXTRACT_EXAMPLE: FinancialExtract = {
  company_name: "ABC Limited",
  financial_year: "2025",
  revenue: 6_200_000,
  EBITDA: 850_000,
  net_profit: 420_000,
  existing_debt: 500_000,
};
