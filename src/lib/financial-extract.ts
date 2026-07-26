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
  // Manus 有時回 number；統一成 string
  financial_year: z
    .union([z.string(), z.number()])
    .nullable()
    .transform((v) => (v == null ? null : String(v))),
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

/** 對齊產品要求嘅 system prompt（再加 JSON schema 約束） */
export const FINANCIAL_EXTRACT_SYSTEM_PROMPT = `你是一個香港中小企貸款審批助手。

請分析財務文件，抽取：

1. 公司名稱（company_name）
2. 財政年度（financial_year）
3. Revenue（revenue）
4. EBITDA（EBITDA）
5. Net Profit（net_profit）
6. Existing Debt（existing_debt）

重要規則：
- 只根據使用者訊息內提供的文字／圖片抽取，禁止上網搜尋、禁止開啟或下載任何外部檔案。
- 不要猜測不存在的資料。文件沒有的欄位必須填 null。
- 即使資料很少，也要立即回傳 JSON（缺欄位用 null），不要繼續研究。

只以 JSON 輸出（不要加其他文字）：
{
  "company_name": string | null,
  "financial_year": string | null,
  "revenue": number | null,
  "EBITDA": number | null,
  "net_profit": number | null,
  "existing_debt": number | null
}

金額為純數字（例如 6200000），不要貨幣符號、不要逗號、不要字串。
不可承諾批核，不可寫「保證批出／拒絕」。`;

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

/** 示範 payload（schema 範例） */
export const FINANCIAL_EXTRACT_EXAMPLE: FinancialExtract = {
  company_name: "ABC Limited",
  financial_year: "2025",
  revenue: 6_200_000,
  EBITDA: 850_000,
  net_profit: 420_000,
  existing_debt: 500_000,
};

/** 固定輸出順序／欄位（給 UI／下游） */
export function toStructuredExtractJson(
  extract: Partial<FinancialExtract> | null | undefined,
): FinancialExtract {
  return {
    company_name: extract?.company_name ?? null,
    financial_year: extract?.financial_year ?? null,
    revenue: extract?.revenue ?? null,
    EBITDA: extract?.EBITDA ?? null,
    net_profit: extract?.net_profit ?? null,
    existing_debt: extract?.existing_debt ?? null,
  };
}

/** 多份文件抽取合併：後填不覆蓋已有非 null 值 */
export function mergeFinancialExtracts(
  list: Array<Partial<FinancialExtract> | null | undefined>,
): FinancialExtract {
  const out = toStructuredExtractJson(null);
  for (const raw of list) {
    if (!raw) continue;
    const e = toStructuredExtractJson(raw);
    (Object.keys(out) as (keyof FinancialExtract)[]).forEach((k) => {
      if (out[k] == null && e[k] != null) {
        (out as Record<string, unknown>)[k] = e[k];
      }
    });
  }
  return out;
}

export function formatStructuredExtractJson(
  extract: Partial<FinancialExtract> | null | undefined,
  space = 2,
) {
  return JSON.stringify(toStructuredExtractJson(extract), null, space);
}
