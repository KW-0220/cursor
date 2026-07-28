import { z } from "zod";
import {
  ebitdaFromComponents,
  FORMULA_DEFINITIONS,
} from "@/lib/formulas";
import type { FinancialExtract } from "./financial-extract";

/**
 * 最近三年 Audited Report 抽取
 * 4.1 公司及報告基本資料
 * 4.2 營業額及盈利（按年）+ 三年比較表
 */

const looseStr = z
  .union([z.string(), z.number(), z.null(), z.undefined()])
  .transform((v): string | null => {
    if (v == null || v === "") return null;
    return String(v).trim() || null;
  });

const looseNum = z
  .union([z.number(), z.string(), z.null(), z.undefined()])
  .transform((v): number | null => {
    if (v == null || v === "") return null;
    if (typeof v === "number") return Number.isFinite(v) ? v : null;
    const n = Number(String(v).replace(/[%,$,\s]/g, ""));
    return Number.isFinite(n) ? n : null;
  });

const looseBool = z
  .union([z.boolean(), z.string(), z.null(), z.undefined()])
  .transform((v): boolean | null => {
    if (v == null || v === "") return null;
    if (typeof v === "boolean") return v;
    const s = String(v).trim().toLowerCase();
    if (["true", "yes", "y", "是", "有"].includes(s)) return true;
    if (["false", "no", "n", "否", "無"].includes(s)) return false;
    return null;
  });

export const AuditedYearSchema = z
  .object({
    financial_year: looseStr,
    year_end_date: looseStr,
    revenue: looseNum,
    gross_profit: looseNum,
    operating_profit: looseNum,
    profit_before_tax: looseNum,
    net_profit: looseNum,
    finance_costs: looseNum,
    depreciation: looseNum,
    amortisation: looseNum,
    tax: looseNum,
    ebitda_disclosed: looseNum,
  })
  .passthrough();

export type AuditedYearExtract = z.infer<typeof AuditedYearSchema>;

export const AuditedReportExtractSchema = z
  .object({
    company_name: looseStr,
    year_end_date: looseStr,
    reporting_currency: looseStr,
    auditor_name: looseStr,
    audit_opinion_type: looseStr,
    has_qualified_opinion: looseBool,
    going_concern_uncertainty: looseBool,
    has_full_notes: looseBool,
    years: z
      .array(AuditedYearSchema)
      .nullish()
      .transform((v) => v ?? []),
  })
  .passthrough();

export type AuditedReportExtract = z.infer<typeof AuditedReportExtractSchema>;

export type AuditedYearComparisonRow = {
  financialYear: string;
  revenue: number | null;
  profitBeforeTax: number | null;
  netProfit: number | null;
  grossProfit: number | null;
  operatingProfit: number | null;
  ebitda: number | null;
};

export const AUDITED_EXTRACT_SYSTEM_PROMPT = `你是香港中小企貸款預審助手，專門閱讀 Audited Report／經審計財務報表（Audited Financial Statements）。

Audited Report 係計算 EBITDA 最權威數據來源。只根據提供文字／影像抽取，禁止上網。立刻只回 JSON（不要其他文字）。

必須輸出：
{
  "company_name": string | null,
  "year_end_date": string | null,
  "reporting_currency": string | null,
  "auditor_name": string | null,
  "audit_opinion_type": string | null,
  "has_qualified_opinion": boolean | null,
  "going_concern_uncertainty": boolean | null,
  "has_full_notes": boolean | null,
  "years": [
    {
      "financial_year": string | null,
      "year_end_date": string | null,
      "revenue": number | null,
      "gross_profit": number | null,
      "operating_profit": number | null,
      "profit_before_tax": number | null,
      "net_profit": number | null,
      "finance_costs": number | null,
      "depreciation": number | null,
      "amortisation": number | null,
      "tax": number | null,
      "ebitda_disclosed": number | null
    }
  ]
}

欄位說明（4.1 公司及報告基本資料）：
1. company_name：公司名稱
2. year_end_date：本報告財政年度結束日期（例如 31 March 2025）
3. reporting_currency：報告貨幣（HKD／USD 等）
4. auditor_name：核數師名稱
5. audit_opinion_type：核數意見類型（例如 Unqualified／Qualified／Disclaimer／Adverse；原文即可）
6. has_qualified_opinion：是否有保留意見（true/false；無明確資訊則 null）
7. going_concern_uncertainty：是否有持續經營重大不確定性
8. has_full_notes：是否包含完整財務報表附註（可判斷則填）

欄位說明（4.2 營業額及盈利 — years 陣列，最多 3 個最近年度，由新至舊）：
請由 Audited Financial Statements 對應位置抽取：
- revenue／Turnover：損益表
- gross_profit／operating_profit／profit_before_tax：損益表
- net_profit（Net Profit／Net Income）：損益表最底一行（EBITDA 公式主項，必須盡力抽出）
- finance_costs（Interest Expense／財務費用／利息支出）：損益表
- tax（Tax Expense／利得稅開支）：損益表
- depreciation／amortisation（折舊與攤銷）：損益表往往唔會單獨一行（好多時包喺行政／營運成本）；必須優先喺現金流量表（Cash Flow Statement）或財務報表附註（Notes to the Financial Statements）搵實數。若只有合併 D&A，可全部放入 depreciation，amortisation=0
- ebitda_disclosed：文件若直接披露 EBITDA 則填（系統仍會用組成項重算覆核）

系統硬編碼：EBITDA = Net Profit + Interest Expense + Tax Expense + Depreciation + Amortisation
你只負責抽取數字，不要用其他定義自行改寫公式。

金額為純數字，不要貨幣符號／逗號。不要猜測。缺資料填 null。
若一份報告只含一年，years 仍放該年；比較數字若報告有列示「上年比較」亦可一併放入 years。`;

export function buildAuditedExtractUserText(input: {
  fileName?: string;
  companyNameHint?: string;
  pastedText?: string;
}) {
  return [
    "這是 Audited Report／經審計財務報表。請抽取 4.1 公司及報告基本資料，以及 4.2 最近最多三年營業額及盈利資料（years）。",
    "EBITDA 權威算法：Net Profit（損益表最底）＋ Interest（財務費用）＋ Tax（利得稅）＋ Depreciation＋Amortisation（優先 Cash Flow／Notes）。系統會用此公式重算。",
    "折舊／攤銷若損益表無單獨一行，請務必在現金流量表或附註尋找。",
    input.fileName ? `檔名：${input.fileName}` : null,
    input.companyNameHint ? `申請公司提示：${input.companyNameHint}` : null,
    input.pastedText
      ? `文件文字／OCR：\n---\n${input.pastedText.slice(0, 100_000)}\n---`
      : "（無文字層或文字不足，請根據附上的頁面影像辨識）",
  ]
    .filter(Boolean)
    .join("\n\n");
}

export function emptyAuditedExtract(): AuditedReportExtract {
  return {
    company_name: null,
    year_end_date: null,
    reporting_currency: null,
    auditor_name: null,
    audit_opinion_type: null,
    has_qualified_opinion: null,
    going_concern_uncertainty: null,
    has_full_notes: null,
    years: [],
  };
}

export function parseAuditedExtract(
  raw: unknown,
):
  | { ok: true; data: AuditedReportExtract }
  | { ok: false; error: string } {
  const parsed = AuditedReportExtractSchema.safeParse(raw ?? {});
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues
        .slice(0, 4)
        .map((i) => `${i.path.join(".")}: ${i.message}`)
        .join("; "),
    };
  }
  const data = parsed.data;
  if (
    !data.company_name &&
    !data.auditor_name &&
    data.years.every(
      (y) =>
        y.revenue == null &&
        y.profit_before_tax == null &&
        y.net_profit == null,
    )
  ) {
    return { ok: false, error: "AUDITED_EXTRACT_EMPTY" };
  }
  return { ok: true, data };
}

export function toAuditedExtract(raw: unknown): AuditedReportExtract {
  const parsed = AuditedReportExtractSchema.safeParse(raw ?? {});
  return parsed.success ? parsed.data : emptyAuditedExtract();
}

function yearEbitda(y: AuditedYearExtract): number | null {
  const computed = ebitdaFromComponents(
    y.net_profit,
    y.finance_costs,
    y.tax,
    y.depreciation,
    y.amortisation,
  );
  if (computed != null) return computed;
  return y.ebitda_disclosed ?? null;
}

/** 三年比較表列（新→舊，最多 3） */
export function buildAuditedComparisonRows(
  extract: AuditedReportExtract,
): AuditedYearComparisonRow[] {
  const years = [...extract.years]
    .filter((y) => y.financial_year || y.year_end_date || y.revenue != null)
    .slice(0, 3);
  return years.map((y, i) => ({
    financialYear:
      y.financial_year ||
      y.year_end_date ||
      extract.year_end_date ||
      `年度${i + 1}`,
    revenue: y.revenue,
    profitBeforeTax: y.profit_before_tax,
    netProfit: y.net_profit,
    grossProfit: y.gross_profit,
    operatingProfit: y.operating_profit,
    ebitda: yearEbitda(y),
  }));
}

/** 合併多份 Audited Report 抽取（按 fiscal year 去重，保留較完整者） */
export function mergeAuditedExtracts(
  list: AuditedReportExtract[],
): AuditedReportExtract {
  const base = emptyAuditedExtract();
  const yearMap = new Map<string, AuditedYearExtract>();

  for (const e of list) {
    if (!base.company_name && e.company_name) base.company_name = e.company_name;
    if (!base.year_end_date && e.year_end_date)
      base.year_end_date = e.year_end_date;
    if (!base.reporting_currency && e.reporting_currency)
      base.reporting_currency = e.reporting_currency;
    if (!base.auditor_name && e.auditor_name)
      base.auditor_name = e.auditor_name;
    if (!base.audit_opinion_type && e.audit_opinion_type)
      base.audit_opinion_type = e.audit_opinion_type;
    if (base.has_qualified_opinion == null && e.has_qualified_opinion != null)
      base.has_qualified_opinion = e.has_qualified_opinion;
    if (
      base.going_concern_uncertainty == null &&
      e.going_concern_uncertainty != null
    )
      base.going_concern_uncertainty = e.going_concern_uncertainty;
    if (base.has_full_notes == null && e.has_full_notes != null)
      base.has_full_notes = e.has_full_notes;

    for (const y of e.years) {
      const key = (y.financial_year || y.year_end_date || "").toLowerCase();
      if (!key) continue;
      const prev = yearMap.get(key);
      if (!prev) {
        yearMap.set(key, y);
        continue;
      }
      // 合併：缺欄用新值補
      yearMap.set(key, {
        ...prev,
        revenue: prev.revenue ?? y.revenue,
        gross_profit: prev.gross_profit ?? y.gross_profit,
        operating_profit: prev.operating_profit ?? y.operating_profit,
        profit_before_tax: prev.profit_before_tax ?? y.profit_before_tax,
        net_profit: prev.net_profit ?? y.net_profit,
        finance_costs: prev.finance_costs ?? y.finance_costs,
        depreciation: prev.depreciation ?? y.depreciation,
        amortisation: prev.amortisation ?? y.amortisation,
        tax: prev.tax ?? y.tax,
        ebitda_disclosed: prev.ebitda_disclosed ?? y.ebitda_disclosed,
        year_end_date: prev.year_end_date ?? y.year_end_date,
        financial_year: prev.financial_year ?? y.financial_year,
      });
    }
  }

  base.years = [...yearMap.values()]
    .sort((a, b) =>
      String(b.financial_year || b.year_end_date || "").localeCompare(
        String(a.financial_year || a.year_end_date || ""),
      ),
    )
    .slice(0, 3);

  return base;
}

export function auditedExtractToFinancial(
  a: AuditedReportExtract,
): FinancialExtract {
  const latest = a.years[0];
  const ebitda = latest ? yearEbitda(latest) : null;
  return {
    company_name: a.company_name,
    financial_year: latest?.financial_year ?? a.year_end_date,
    revenue: latest?.revenue ?? null,
    EBITDA: ebitda,
    net_profit: latest?.net_profit ?? null,
    existing_debt: null,
    earning_before_tax: latest?.profit_before_tax ?? null,
    interest: latest?.finance_costs ?? null,
    tax: latest?.tax ?? null,
    depreciation: latest?.depreciation ?? null,
    amortisation: latest?.amortisation ?? null,
    total_debt_payments: null,
  };
}

export function auditedExtractHint(a: AuditedReportExtract): string | null {
  const bits = [
    a.company_name && "公司名稱",
    a.auditor_name && "核數師",
    a.audit_opinion_type && "核數意見",
    a.years.length && `${a.years.length} 個財政年度`,
  ].filter(Boolean);
  if (!bits.length) {
    return "未能從 Audited Report 抽出資料。請上完整 PDF（含損益表及核數師報告）。";
  }
  const rows = buildAuditedComparisonRows(a);
  const hasCompare = rows.some(
    (r) => r.revenue != null || r.profitBeforeTax != null,
  );
  let msg = `已抽取 Audited Report：${bits.join("、")}。`;
  if (hasCompare) {
    msg += ` 三年比較可用 ${rows.length} 年。`;
  }
  if (a.has_qualified_opinion === true) {
    msg += " 注意：報告可能有保留意見，需顧問覆核。";
  }
  if (a.going_concern_uncertainty === true) {
    msg += " 注意：存在持續經營重大不確定性。";
  }
  msg += ` EBITDA 公式：${FORMULA_DEFINITIONS.ebitda}`;
  return msg;
}

export function boolLabel(v: boolean | null | undefined) {
  if (v === true) return "是";
  if (v === false) return "否";
  return "—";
}
