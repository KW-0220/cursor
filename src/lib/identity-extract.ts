import { z } from "zod";
import type { FinancialExtract } from "./financial-extract";

const looseStr = z
  .union([z.string(), z.number(), z.null(), z.undefined()])
  .transform((v): string | null => {
    if (v == null || v === "") return null;
    return String(v).trim() || null;
  });

export const IdentityExtractSchema = z
  .object({
    doc_type: looseStr, // hkid | passport | other
    full_name_zh: looseStr,
    full_name_en: looseStr,
    id_number: looseStr,
    nationality: looseStr,
    date_of_birth: looseStr,
    sex: looseStr,
    expiry_date: looseStr,
    issue_date: looseStr,
  })
  .passthrough();

export type IdentityExtract = z.infer<typeof IdentityExtractSchema>;

export const IDENTITY_EXTRACT_SYSTEM_PROMPT = `你是香港中小企貸款預審助手，專門閱讀身份證明文件（香港身份證 HKID／護照 Passport）。

只根據提供文字／影像抽取，禁止上網。立刻只回 JSON（不要其他文字）。

必須輸出：
{
  "doc_type": "hkid" | "passport" | "other" | null,
  "full_name_zh": string | null,
  "full_name_en": string | null,
  "id_number": string | null,
  "nationality": string | null,
  "date_of_birth": string | null,
  "sex": string | null,
  "expiry_date": string | null,
  "issue_date": string | null
}

欄位說明：
1. doc_type：hkid（香港身份證）／passport（護照）／other
2. full_name_zh：中文姓名（護照可能無）
3. full_name_en：英文姓名
4. id_number：身份證號碼或護照號碼（遮罩部分仍盡量保留可見字元）
5. nationality：國籍（護照）
6. date_of_birth／sex／expiry_date／issue_date：原文日期或性別字串

不要猜測。缺資料填 null。`;

export function buildIdentityExtractUserText(input: {
  fileName?: string;
  personRole?: string;
  pastedText?: string;
}) {
  return [
    "這是身份證明文件（香港身份證或護照）。請抽取姓名、證件號碼、出生日期、屆滿日期等。",
    input.personRole ? `人士角色提示：${input.personRole}` : null,
    input.fileName ? `檔名：${input.fileName}` : null,
    input.pastedText
      ? `文件文字／OCR：\n---\n${input.pastedText.slice(0, 40_000)}\n---`
      : "（無文字層，請根據附上的頁面影像辨識）",
  ]
    .filter(Boolean)
    .join("\n\n");
}

export function emptyIdentityExtract(): IdentityExtract {
  return {
    doc_type: null,
    full_name_zh: null,
    full_name_en: null,
    id_number: null,
    nationality: null,
    date_of_birth: null,
    sex: null,
    expiry_date: null,
    issue_date: null,
  };
}

export function toIdentityExtract(raw: unknown): IdentityExtract {
  const parsed = IdentityExtractSchema.safeParse(raw ?? {});
  if (!parsed.success) return emptyIdentityExtract();
  return { ...emptyIdentityExtract(), ...parsed.data };
}

export function parseIdentityExtract(
  raw: unknown,
): { ok: true; data: IdentityExtract } | { ok: false; error: string } {
  const parsed = IdentityExtractSchema.safeParse(raw ?? {});
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues
        .slice(0, 3)
        .map((i) => i.message)
        .join("; "),
    };
  }
  const data = { ...emptyIdentityExtract(), ...parsed.data };
  if (!data.full_name_zh && !data.full_name_en && !data.id_number) {
    return { ok: false, error: "IDENTITY_EXTRACT_EMPTY" };
  }
  return { ok: true, data };
}

export function identityExtractToFinancial(b: IdentityExtract): FinancialExtract {
  return {
    company_name: b.full_name_zh || b.full_name_en,
    financial_year: null,
    revenue: null,
    EBITDA: null,
    net_profit: null,
    existing_debt: null,
    earning_before_tax: null,
    interest: null,
    tax: null,
    depreciation: null,
    amortisation: null,
    total_debt_payments: null,
  };
}

export function identityExtractHint(b: IdentityExtract): string | null {
  const bits = [
    b.doc_type,
    b.full_name_zh || b.full_name_en,
    b.id_number ? `證件 ${b.id_number}` : null,
  ].filter(Boolean);
  return bits.length ? bits.join(" · ") : null;
}
