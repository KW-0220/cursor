import { z } from "zod";

export const EligibilityAnalysisSchema = z.object({
  documentType: z
    .enum([
      "audit_report",
      "bank_statement",
      "facility_letter",
      "br_certificate",
      "property_doc",
      "other",
      "unknown",
    ])
    .describe("AI 判斷的文件類型"),
  overall: z
    .enum(["green", "amber", "red"])
    .describe("內部初篩三色燈，不代表正式批核"),
  summary: z.string().describe("一兩句繁體中文摘要"),
  companyNameGuess: z.string().nullable(),
  extracted: z.object({
    revenueByYear: z
      .array(
        z.object({
          year: z.string(),
          amountHkd: z.number().nullable(),
        }),
      )
      .default([]),
    monthlyInflows: z
      .array(
        z.object({
          month: z.string(),
          amountHkd: z.number().nullable(),
        }),
      )
      .default([]),
    existingDebts: z
      .array(
        z.object({
          lender: z.string(),
          outstandingHkd: z.number().nullable(),
          monthlyPaymentHkd: z.number().nullable(),
        }),
      )
      .default([]),
    bouncedCheques: z.number().nullable(),
    notes: z.array(z.string()).default([]),
  }),
  completeness: z.object({
    ok: z.array(z.string()),
    issues: z.array(z.string()),
  }),
  ruleHits: z.array(
    z.object({
      rule: z.string(),
      status: z.enum(["green", "amber", "red"]),
      detail: z.string(),
      suggestion: z.string(),
    }),
  ),
  confidence: z.number().min(0).max(1),
  needsHumanReview: z.boolean(),
  applicantFacingMessage: z
    .string()
    .describe("給申請人看的中性文案，不可說保證批核或拒絕"),
});

export type EligibilityAnalysis = z.infer<typeof EligibilityAnalysisSchema>;

export const eligibilityJsonSchema = {
  name: "eligibility_analysis",
  strict: true,
  schema: {
    type: "object",
    additionalProperties: false,
    properties: {
      documentType: {
        type: "string",
        enum: [
          "audit_report",
          "bank_statement",
          "facility_letter",
          "br_certificate",
          "property_doc",
          "other",
          "unknown",
        ],
      },
      overall: { type: "string", enum: ["green", "amber", "red"] },
      summary: { type: "string" },
      companyNameGuess: { type: ["string", "null"] },
      extracted: {
        type: "object",
        additionalProperties: false,
        properties: {
          revenueByYear: {
            type: "array",
            items: {
              type: "object",
              additionalProperties: false,
              properties: {
                year: { type: "string" },
                amountHkd: { type: ["number", "null"] },
              },
              required: ["year", "amountHkd"],
            },
          },
          monthlyInflows: {
            type: "array",
            items: {
              type: "object",
              additionalProperties: false,
              properties: {
                month: { type: "string" },
                amountHkd: { type: ["number", "null"] },
              },
              required: ["month", "amountHkd"],
            },
          },
          existingDebts: {
            type: "array",
            items: {
              type: "object",
              additionalProperties: false,
              properties: {
                lender: { type: "string" },
                outstandingHkd: { type: ["number", "null"] },
                monthlyPaymentHkd: { type: ["number", "null"] },
              },
              required: ["lender", "outstandingHkd", "monthlyPaymentHkd"],
            },
          },
          bouncedCheques: { type: ["number", "null"] },
          notes: { type: "array", items: { type: "string" } },
        },
        required: [
          "revenueByYear",
          "monthlyInflows",
          "existingDebts",
          "bouncedCheques",
          "notes",
        ],
      },
      completeness: {
        type: "object",
        additionalProperties: false,
        properties: {
          ok: { type: "array", items: { type: "string" } },
          issues: { type: "array", items: { type: "string" } },
        },
        required: ["ok", "issues"],
      },
      ruleHits: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          properties: {
            rule: { type: "string" },
            status: { type: "string", enum: ["green", "amber", "red"] },
            detail: { type: "string" },
            suggestion: { type: "string" },
          },
          required: ["rule", "status", "detail", "suggestion"],
        },
      },
      confidence: { type: "number" },
      needsHumanReview: { type: "boolean" },
      applicantFacingMessage: { type: "string" },
    },
    required: [
      "documentType",
      "overall",
      "summary",
      "companyNameGuess",
      "extracted",
      "completeness",
      "ruleHits",
      "confidence",
      "needsHumanReview",
      "applicantFacingMessage",
    ],
  },
} as const;

export function buildEligibilitySystemPrompt() {
  return `你是 SME LoanFlow 的香港中小企貸款文件初篩助理。
任務：閱讀上載文件內容，提取關鍵財務資料，並做「初步資格評估」。

硬性規則：
1. 繁體中文回覆（欄位值除外可保留原文）。
2. 你不是最終批核者；overall 三色燈只供內部參考。
3. 禁止使用：保證批核、必定拒絕、即時放款、AI 已批准、百分百成功。
4. applicantFacingMessage 必須中性，例如「需要進一步覆核」「可能需要補充資料」。
5. 資料不足或影像不清時：needsHumanReview=true，overall 傾向 amber，issues 寫清楚缺什麼。
6. 初篩參考（非硬性拒絕）：
   - 月供佔近六月平均入數 >50% → amber/red + 建議人工覆核現金流
   - 連續彈票、缺頁、公司名不一致、審計未簽署 → 列入 issues
   - 營業額連續大跌或連續虧損 → amber/red + 建議資深覆核
7. 金額單位一律解讀為港元 HKD；無法判斷則填 null。
8. suggestion 用「需要由審批人員進一步核實…」，不要寫「建議拒絕」。`;
}

export function buildEligibilityUserPrompt(input: {
  fileName: string;
  loanType?: string;
  amountHkd?: number;
  purpose?: string;
  companyName?: string;
  extractedText: string;
}) {
  return `申請脈絡：
- 檔名：${input.fileName}
- 貸款類型：${input.loanType ?? "未指定"}
- 申請金額：${input.amountHkd != null ? `HKD ${input.amountHkd}` : "未指定"}
- 用途：${input.purpose ?? "未指定"}
- 申請公司：${input.companyName ?? "未指定"}

以下是從文件提取／讀取的內容（可能不完整）：
---
${input.extractedText.slice(0, 100_000)}
---

請輸出 JSON 初篩結果。`;
}
