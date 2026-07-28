import { z } from "zod";
import type { FinancialExtract } from "./financial-extract";

const looseStr = z
  .union([z.string(), z.number(), z.null(), z.undefined()])
  .transform((v): string | null => {
    if (v == null || v === "") return null;
    return String(v).trim() || null;
  });

export const BrExtractSchema = z
  .object({
    company_name_zh: looseStr,
    company_name_en: looseStr,
    br_number: looseStr,
    business_address: looseStr,
    business_nature: looseStr,
    effective_date: looseStr,
    expiry_date: looseStr,
  })
  .passthrough();

export type BrExtract = z.infer<typeof BrExtractSchema>;

export const BR_EXTRACT_SYSTEM_PROMPT = `你是香港中小企貸款預審助手，專門閱讀商業登記證（BR / Business Registration Certificate）。

只根據提供文字／影像抽取，禁止上網。立刻只回 JSON（不要其他文字）。

必須輸出：
{
  "company_name_zh": string | null,
  "company_name_en": string | null,
  "br_number": string | null,
  "business_address": string | null,
  "business_nature": string | null,
  "effective_date": string | null,
  "expiry_date": string | null
}

欄位說明：
1. company_name_zh：公司中文名稱（無則 null）
2. company_name_en：公司英文名稱（無則 null）
3. br_number：商業登記號碼（含分支編號若有，例如 12345678-000-07-25-A）
4. business_address：業務地址（完整地址字串）
5. business_nature：業務性質／Nature of business（文件有列出才填，否則 null）
6. effective_date：生效日期／Valid from／Commencement（原文日期字串即可）
7. expiry_date：屆滿日期／Expiry date（原文日期字串即可）

不要輸出 revenue／EBITDA／financial_year。不要猜測。缺資料填 null。`;

export function buildBrExtractUserText(input: {
  fileName?: string;
  companyNameHint?: string;
  pastedText?: string;
}) {
  return [
    "這是香港商業登記證（BR）。請抽取中文名、英文名、商業登記號碼、業務地址、業務性質、生效日期、屆滿日期。",
    "不要輸出 company_name/revenue/EBITDA 財務報表格式。",
    input.fileName ? `檔名：${input.fileName}` : null,
    input.companyNameHint ? `申請公司提示：${input.companyNameHint}` : null,
    input.pastedText
      ? `文件文字／OCR：\n---\n${input.pastedText.slice(0, 80_000)}\n---`
      : "（無文字層，請根據附上的頁面影像辨識）",
  ]
    .filter(Boolean)
    .join("\n\n");
}

export function emptyBrExtract(): BrExtract {
  return {
    company_name_zh: null,
    company_name_en: null,
    br_number: null,
    business_address: null,
    business_nature: null,
    effective_date: null,
    expiry_date: null,
  };
}

export function toBrExtract(
  raw: Partial<BrExtract> | null | undefined,
): BrExtract {
  return { ...emptyBrExtract(), ...(raw ?? {}) };
}

/** 寬鬆解析；兼容誤回嘅 { company_name } */
export function parseBrExtract(
  raw: unknown,
): { ok: true; data: BrExtract } | { ok: false; error: string } {
  const parsed = BrExtractSchema.safeParse(raw);
  if (parsed.success) {
    const data = toBrExtract(parsed.data);
    // 若模型只填咗一邊名稱，接受
    if (
      data.company_name_zh ||
      data.company_name_en ||
      data.br_number ||
      data.business_address
    ) {
      return { ok: true, data };
    }
  }

  if (raw && typeof raw === "object") {
    const o = raw as Record<string, unknown>;
    const company = looseStr.parse(
      o.company_name_en ?? o.company_name ?? o.companyName,
    );
    const companyZh = looseStr.parse(
      o.company_name_zh ?? o.chinese_name ?? o.companyNameZh,
    );
    const br = looseStr.parse(
      o.br_number ?? o.brNumber ?? o.business_registration_number,
    );
    if (company || companyZh || br) {
      return {
        ok: true,
        data: toBrExtract({
          company_name_zh: companyZh,
          company_name_en: company,
          br_number: br,
          business_address: looseStr.parse(
            o.business_address ?? o.address ?? o.businessAddress,
          ),
          business_nature: looseStr.parse(
            o.business_nature ?? o.nature ?? o.businessNature,
          ),
          effective_date: looseStr.parse(
            o.effective_date ?? o.valid_from ?? o.commencement_date,
          ),
          expiry_date: looseStr.parse(
            o.expiry_date ?? o.expiry ?? o.expiration_date,
          ),
        }),
      };
    }
  }

  return {
    ok: false,
    error:
      parsed.success === false
        ? parsed.error.issues
            .slice(0, 3)
            .map((i) => `${i.path.join(".")}: ${i.message}`)
            .join("; ")
        : "BR_EXTRACT_EMPTY",
  };
}

export function brExtractToFinancial(b: BrExtract): FinancialExtract {
  return {
    company_name: b.company_name_en || b.company_name_zh,
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

export function brExtractHint(b: BrExtract): string | null {
  const filled = [
    b.company_name_zh && "中文名",
    b.company_name_en && "英文名",
    b.br_number && "登記號碼",
    b.business_address && "地址",
    b.business_nature && "業務性質",
    b.effective_date && "生效日",
    b.expiry_date && "屆滿日",
  ].filter(Boolean);

  if (!filled.length) {
    return "未能從 BR 抽出登記資料。請上清晰成張證 JPG／PNG，或可搜尋文字版 PDF。";
  }
  if (!b.br_number || (!b.company_name_zh && !b.company_name_en)) {
    return `已讀到部分 BR 欄位（${filled.join("、")}）；建議核對原件。`;
  }
  return `已抽取 BR：${filled.join("、")}。`;
}
