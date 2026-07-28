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

const looseStr = z.preprocess(
  (v) => (v === undefined ? null : v),
  z
    .union([z.string(), z.number(), z.null()])
    .transform((v): string | null => {
      if (v == null || v === "") return null;
      return String(v).trim() || null;
    }),
);

const looseNum = z.preprocess(
  (v) => (v === undefined ? null : v),
  z
    .union([z.number(), z.string(), z.null()])
    .transform((v): number | null => parseAuditedAmount(v)),
);

const looseBool = z.preprocess(
  (v) => (v === undefined ? null : v),
  z
    .union([z.boolean(), z.string(), z.null()])
    .transform((v): boolean | null => {
      if (v == null || v === "") return null;
      if (typeof v === "boolean") return v;
      const s = String(v).trim().toLowerCase();
      if (["true", "yes", "y", "是", "有"].includes(s)) return true;
      if (["false", "no", "n", "否", "無"].includes(s)) return false;
      return null;
    }),
);

/** 解析港式報表金額：(1,234)、HK$1,234、1 234、千元單位字串等 */
export function parseAuditedAmount(v: unknown): number | null {
  if (v == null || v === "") return null;
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  let s = String(v).trim();
  if (!s || /^[-—–−n/?]+$/i.test(s) || /^n\/?a$/i.test(s)) return null;

  const neg =
    /^\(.*\)$/.test(s) ||
    /^[-−–]/.test(s) ||
    /\(.*\)/.test(s);
  s = s
    .replace(/[()]/g, "")
    .replace(/,/g, "")
    .replace(/\s/g, "")
    .replace(/^(HKD|USD|CNY|HK\$|US\$|\$|€|£|¥|港元|美元)/i, "")
    .replace(/(HKD|USD|港元|美元)$/i, "")
    .replace(/['']000s?$/i, "")
    .replace(/千元?$/i, "");

  const n = Number(s.replace(/[^0-9.-]/g, ""));
  if (!Number.isFinite(n)) return null;
  return neg ? -Math.abs(n) : n;
}

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
    amount_unit: looseStr,
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
  "amount_unit": "as_stated" | "thousands" | null,
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
1. company_name：公司名稱（中／英皆可，盡量完整）
2. year_end_date：本報告財政年度結束日期（例如 31 March 2025）
3. reporting_currency：報告貨幣（HKD／USD 等）
4. auditor_name：核數師名稱
5. audit_opinion_type：核數意見類型（Unqualified／Qualified／Disclaimer／Adverse；或原文）
6. has_qualified_opinion：是否有保留意見（true/false；無明確資訊則 null）
7. going_concern_uncertainty：是否有持續經營重大不確定性
8. has_full_notes：是否包含完整財務報表附註
9. amount_unit：若報表註明「HK$'000／千港元」填 "thousands"；否則 "as_stated"

欄位說明（4.2 營業額及盈利 — years[]，最多 3 個最近年度，由新至舊）：
【最重要】必須從「Statement of Profit or Loss／Statement of Comprehensive Income／Income Statement／損益表／全面收益表」抽取數字。封面、公司資料、核數師報告頁通常沒有營業額——不要只讀封面就完事。

香港報表常見兩欄比較：本期 | 上期。兩欄都要各自成為 years[] 的一年。
- revenue／Turnover／營業額／Revenue
- gross_profit／毛利
- operating_profit／經營溢利
- profit_before_tax／Profit before taxation／除稅前溢利（必填，搵到就要填）
- net_profit／Profit for the year／年度溢利／純利／淨利潤（EBITDA 主項，必填）
- finance_costs／Finance costs／Interest／財務費用／利息
- tax／Taxation／Income tax／利得稅開支（費用用正數）
- depreciation／amortisation：優先 Cash Flow Statement 或 Notes；合併 D&A 可全放 depreciation，amortisation=0
- ebitda_disclosed：文件直接披露先填

金額為純數字（不要貨幣符號／逗號）。括號負數轉成負號，例如 (12,345) → -12345。
若 amount_unit=thousands，years 內數字仍填報表上見到的數字（唔好自己 ×1000）；系統會處理。
不要猜測。缺資料填 null。years 至少應含有本期；有上期比較就一併放入。`;

export function buildAuditedExtractUserText(input: {
  fileName?: string;
  companyNameHint?: string;
  pastedText?: string;
}) {
  return [
    "這是 Audited Report／經審計財務報表。請抽取 4.1 公司及報告基本資料，以及 4.2 最近最多三年營業額及盈利（years）。",
    "【關鍵】一定要讀損益表／全面收益表頁的 Turnover／營業額、Profit before tax／除稅前溢利、Profit for the year／淨利潤。只有公司名同核數師唔算完成。",
    "若有本期／上期兩欄，請分成 years 兩年（新→舊）。",
    "EBITDA 權威算法：Net Profit＋Interest＋Tax＋Depreciation＋Amortisation（D&A 優先 Cash Flow／Notes）。你只抽數字。",
    input.fileName ? `檔名：${input.fileName}` : null,
    input.companyNameHint ? `申請公司提示：${input.companyNameHint}` : null,
    input.pastedText
      ? `文件文字／OCR：\n---\n${input.pastedText.slice(0, 120_000)}\n---`
      : "（無文字層或文字不足，請根據附上的頁面影像辨識——影像應為損益表相關頁）",
  ]
    .filter(Boolean)
    .join("\n\n");
}

/** 1–3 份 Audited Report → 同一個 Manus task */
export function buildAuditedBatchUserText(input: {
  companyNameHint?: string;
  parts: Array<{ fileName: string; text: string }>;
}) {
  const blocks = input.parts.map(
    (p, i) =>
      `【Audited Report ${i + 1}｜檔名 ${p.fileName}】\n${p.text.slice(0, 60_000) || "（無文字層）"}`,
  );
  return [
    `請一次閱讀以下 ${input.parts.length} 份 Audited Report／經審計財務報表，合併抽取 4.1 基本資料 + 4.2 最多三年 years[]。`,
    "【關鍵】每份都要搵損益表數字（營業額／除稅前溢利／淨利潤）；唔好只抽封面公司名。",
    "若多份報告重疊同一財政年度，以較完整數字為準；最終 years 最多 3 個（新→舊）。",
    "EBITDA 組成用 Net Profit＋Interest＋Tax＋D＋A；D&A 優先 Cash Flow／Notes。",
    input.companyNameHint ? `申請公司提示：${input.companyNameHint}` : null,
    blocks.join("\n\n====\n\n"),
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
    amount_unit: null,
    years: [],
  };
}

function normalizeYearRaw(y: unknown): Record<string, unknown> {
  if (!y || typeof y !== "object") return {};
  const r = { ...(y as Record<string, unknown>) };
  if (r.revenue == null && r.turnover != null) r.revenue = r.turnover;
  if (r.revenue == null && r["營業額"] != null) r.revenue = r["營業額"];
  if (
    r.profit_before_tax == null &&
    (r.pbt != null ||
      r.profit_before_taxation != null ||
      r.profitBeforeTax != null)
  ) {
    r.profit_before_tax =
      r.pbt ?? r.profit_before_taxation ?? r.profitBeforeTax;
  }
  if (
    r.net_profit == null &&
    (r.profit_for_the_year != null ||
      r.net_income != null ||
      r.netProfit != null ||
      r["純利"] != null)
  ) {
    r.net_profit =
      r.profit_for_the_year ?? r.net_income ?? r.netProfit ?? r["純利"];
  }
  if (r.finance_costs == null && (r.interest != null || r.finance_cost != null)) {
    r.finance_costs = r.interest ?? r.finance_cost;
  }
  if (r.tax == null && (r.taxation != null || r.income_tax != null)) {
    r.tax = r.taxation ?? r.income_tax;
  }
  return r;
}

/** 兼容模型各種欄位別名／結構偏差 */
export function normalizeAuditedRaw(raw: unknown): unknown {
  if (!raw || typeof raw !== "object") return raw;
  const o = { ...(raw as Record<string, unknown>) };

  let years: unknown = o.years ?? o.Years ?? o.financial_years;
  if (years && !Array.isArray(years) && typeof years === "object") {
    years = Object.entries(years as Record<string, unknown>).map(
      ([k, v]) => ({
        financial_year: k,
        ...normalizeYearRaw(v),
      }),
    );
  }
  if (!Array.isArray(years) || years.length === 0) {
    const hasTop =
      o.revenue != null ||
      o.turnover != null ||
      o.profit_before_tax != null ||
      o.net_profit != null ||
      o.profit_for_the_year != null;
    if (hasTop) {
      years = [
        normalizeYearRaw({
          financial_year: o.financial_year ?? o.year_end_date,
          year_end_date: o.year_end_date,
          revenue: o.revenue ?? o.turnover,
          gross_profit: o.gross_profit,
          operating_profit: o.operating_profit,
          profit_before_tax: o.profit_before_tax ?? o.pbt,
          net_profit: o.net_profit ?? o.profit_for_the_year ?? o.net_income,
          finance_costs: o.finance_costs ?? o.interest,
          depreciation: o.depreciation,
          amortisation: o.amortisation ?? o.amortization,
          tax: o.tax ?? o.taxation,
          ebitda_disclosed: o.ebitda_disclosed ?? o.EBITDA ?? o.ebitda,
        }),
      ];
    }
  }
  if (Array.isArray(years)) {
    o.years = years.map(normalizeYearRaw);
  }
  return o;
}

function applyAmountUnit(data: AuditedReportExtract): AuditedReportExtract {
  const unit = (data.amount_unit || "").toLowerCase();
  const isThousands =
    unit.includes("thousand") ||
    unit === "000" ||
    unit.includes("'000") ||
    unit.includes("千");
  if (!isThousands) return data;
  const mul = (n: number | null | undefined) =>
    n == null ? null : n * 1000;
  return {
    ...data,
    years: data.years.map((y) => ({
      ...y,
      revenue: mul(y.revenue),
      gross_profit: mul(y.gross_profit),
      operating_profit: mul(y.operating_profit),
      profit_before_tax: mul(y.profit_before_tax),
      net_profit: mul(y.net_profit),
      finance_costs: mul(y.finance_costs),
      depreciation: mul(y.depreciation),
      amortisation: mul(y.amortisation),
      tax: mul(y.tax),
      ebitda_disclosed: mul(y.ebitda_disclosed),
    })),
  };
}

export function auditedFinancialsIncomplete(a: AuditedReportExtract): boolean {
  if (!a.years.length) return true;
  return !a.years.some(
    (y) =>
      y.revenue != null ||
      y.profit_before_tax != null ||
      y.net_profit != null,
  );
}

export function parseAuditedExtract(
  raw: unknown,
):
  | { ok: true; data: AuditedReportExtract }
  | { ok: false; error: string } {
  const parsed = AuditedReportExtractSchema.safeParse(
    normalizeAuditedRaw(raw ?? {}),
  );
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues
        .slice(0, 4)
        .map((i) => `${i.path.join(".")}: ${i.message}`)
        .join("; "),
    };
  }
  const data = applyAmountUnit(parsed.data);
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
  const parsed = AuditedReportExtractSchema.safeParse(
    normalizeAuditedRaw(raw ?? {}),
  );
  if (!parsed.success) return emptyAuditedExtract();
  return applyAmountUnit(parsed.data);
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
    if (!base.amount_unit && e.amount_unit) base.amount_unit = e.amount_unit;
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
    (r) =>
      r.revenue != null || r.profitBeforeTax != null || r.netProfit != null,
  );
  let msg = `已抽取 Audited Report：${bits.join("、")}。`;
  if (hasCompare) {
    msg += ` 三年比較可用 ${rows.length} 年。`;
  } else {
    msg +=
      " 但未能抽出營業額／除稅前溢利／淨利潤——多數係只讀到封面。請確認 PDF 含「損益表／Statement of Profit or Loss」，或改上該幾頁清晰掃描後重新分析。";
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
