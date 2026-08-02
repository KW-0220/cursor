import { z } from "zod";
import {
  ebitdaFromComponents,
  ebitdaFromPbt,
  FORMULA_DEFINITIONS,
  gearingRatio,
  resolveEarningBeforeTax,
  tangibleNetWorth,
  dscr,
  yoyChange,
  annualDebtServiceFromMonthly,
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
    /** 4.4 資產負債（通常取最近年度結算） */
    total_assets: looseNum,
    current_assets: looseNum,
    cash_and_bank: looseNum,
    total_liabilities: looseNum,
    current_liabilities: looseNum,
    borrowings: looseNum,
    shareholders_equity: looseNum,
    intangible_assets: looseNum,
    goodwill: looseNum,
    /** 來源頁碼／附註提示（字串即可） */
    ebitda_source_pages: looseStr,
    balance_sheet_source_pages: looseStr,
    extract_confidence: looseNum,
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
  /** 政策公式：PBT + finance + D + A */
  ebitdaPolicy: number | null;
  financeCosts: number | null;
  depreciation: number | null;
  amortisation: number | null;
  ebitdaDisclosed: number | null;
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

欄位說明（4.4 資產負債 — 取最近年度 Balance Sheet／Statement of Financial Position）：
- total_assets, current_assets, cash_and_bank, total_liabilities, current_liabilities, borrowings, shareholders_equity, intangible_assets, goodwill
- ebitda_source_pages／balance_sheet_source_pages：頁碼或附註字串
- extract_confidence：0–1

金額為純數字（不要貨幣符號／逗號）。括號負數轉成負號，例如 (12,345) → -12345。
若 amount_unit=thousands，years／資產負債數字仍填報表上見到的數字（唔好自己 ×1000）；系統會處理。
不要猜測。缺資料填 null。years 至少應含有本期；有上期比較就一併放入。
JSON 必須另含 total_assets／current_assets／cash_and_bank／total_liabilities／current_liabilities／borrowings／shareholders_equity／intangible_assets／goodwill／ebitda_source_pages／balance_sheet_source_pages／extract_confidence（缺則 null）。`;

export function buildAuditedExtractUserText(input: {
  fileName?: string;
  companyNameHint?: string;
  pastedText?: string;
}) {
  return [
    "這是 Audited Report／經審計財務報表。請抽取 4.1 基本資料、4.2 最多三年 years[]，以及 4.4 最近年度資產負債。",
    "【關鍵】一定要讀損益表／全面收益表頁的 Turnover／營業額、Profit before tax／除稅前溢利、Profit for the year／淨利潤。只有公司名同核數師唔算完成。",
    "若有本期／上期兩欄，請分成 years 兩年（新→舊）。",
    "EBITDA：有披露填 ebitda_disclosed；並抽 PBT／finance_costs／D&A／net_profit／tax。資產負債抽總資產／總負債／權益／無形／商譽等。",
    input.fileName ? `檔名：${input.fileName}` : null,
    input.companyNameHint ? `申請公司提示：${input.companyNameHint}` : null,
    input.pastedText
      ? `文件文字／OCR：\n---\n${input.pastedText.slice(0, 120_000)}\n---`
      : "（無文字層或文字不足，請根據附上的頁面影像辨識——影像應為損益表／資產負債相關頁）",
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
    total_assets: null,
    current_assets: null,
    cash_and_bank: null,
    total_liabilities: null,
    current_liabilities: null,
    borrowings: null,
    shareholders_equity: null,
    intangible_assets: null,
    goodwill: null,
    ebitda_source_pages: null,
    balance_sheet_source_pages: null,
    extract_confidence: null,
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
    total_assets: mul(data.total_assets),
    current_assets: mul(data.current_assets),
    cash_and_bank: mul(data.cash_and_bank),
    total_liabilities: mul(data.total_liabilities),
    current_liabilities: mul(data.current_liabilities),
    borrowings: mul(data.borrowings),
    shareholders_equity: mul(data.shareholders_equity),
    intangible_assets: mul(data.intangible_assets),
    goodwill: mul(data.goodwill),
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

/**
 * 文字啟發式：當 Manus 只抽到封面時，從 PDF text 補營業額／PBT／淨利。
 * 支援「Label  current  prior」兩欄常見格式。
 */
export function heuristicExtractYearsFromText(
  text: string,
): AuditedYearExtract[] {
  const body = text.replace(/\u00a0/g, " ");
  if (!body || body.length < 40) return [];

  const lineAmount =
    String.raw`(?:\((?:HK\$|US\$|\$)?[\d,]+\)|(?:HK\$|US\$|\$)?[\d,]+(?:\.\d+)?)`;
  const pairRe = (labels: string) =>
    new RegExp(
      `(?:${labels})[^\\d\\n]{0,40}(${lineAmount})(?:[^\\d\\n(]{0,20}(${lineAmount}))?`,
      "im",
    );

  const pick = (labels: string): [number | null, number | null] => {
    const m = body.match(pairRe(labels));
    if (!m) return [null, null];
    return [parseAuditedAmount(m[1]), parseAuditedAmount(m[2] ?? null)];
  };

  const [rev0, rev1] = pick(
    "turnover|revenue|營業額|收益(?!表)",
  );
  const [gp0, gp1] = pick("gross\\s*profit|毛利");
  const [op0, op1] = pick("operating\\s*profit|經營溢利");
  const [pbt0, pbt1] = pick(
    "profit\\s*before\\s*tax(?:ation)?|除稅前(?:溢利|盈利)?|pbt",
  );
  const [np0, np1] = pick(
    "profit\\s*for\\s*the\\s*year|net\\s*profit|net\\s*income|年度溢利|純利|淨利潤|淨溢利",
  );
  const [fc0, fc1] = pick(
    "finance\\s*costs?|interest\\s*expense|財務費用|利息支出",
  );
  const [tax0, tax1] = pick(
    "(?<!before\\s)taxation\\b|income\\s*tax(?:\\s*expense)?|tax\\s*expense|利得稅",
  );
  const [da0, da1] = pick("depreciation|amortisation|amortization|折舊|攤銷");

  if (
    rev0 == null &&
    pbt0 == null &&
    np0 == null &&
    rev1 == null &&
    pbt1 == null &&
    np1 == null
  ) {
    return [];
  }

  // 試搵兩個年度標籤
  const yearHits = [
    ...body.matchAll(
      /(?:year\s*ended|截至|financial\s*year|fy)\s*:?\s*([0-9]{1,2}\s+\w+\s+20\d{2}|20\d{2})/gi,
    ),
  ]
    .map((m) => m[1]!.replace(/\s+/g, " ").trim())
    .filter(Boolean);
  const y0 = yearHits[0] || null;
  const y1 = yearHits[1] || null;

  const years: AuditedYearExtract[] = [
    {
      financial_year: y0,
      year_end_date: y0,
      revenue: rev0,
      gross_profit: gp0,
      operating_profit: op0,
      profit_before_tax: pbt0,
      net_profit: np0,
      finance_costs: fc0,
      depreciation: da0,
      amortisation: null,
      tax: tax0,
      ebitda_disclosed: null,
    },
  ];
  if (
    rev1 != null ||
    pbt1 != null ||
    np1 != null ||
    gp1 != null ||
    fc1 != null
  ) {
    years.push({
      financial_year: y1,
      year_end_date: y1,
      revenue: rev1,
      gross_profit: gp1,
      operating_profit: op1,
      profit_before_tax: pbt1,
      net_profit: np1,
      finance_costs: fc1,
      depreciation: da1,
      amortisation: null,
      tax: tax1,
      ebitda_disclosed: null,
    });
  }
  return years;
}

/** Manus 結果缺損益時，用文字啟發式補上 */
export function enrichAuditedWithTextHeuristics(
  data: AuditedReportExtract,
  text: string,
): AuditedReportExtract {
  if (!auditedFinancialsIncomplete(data)) return data;
  const guessed = heuristicExtractYearsFromText(text);
  if (!guessed.length) return data;

  if (!data.years.length) {
    return { ...data, years: guessed.slice(0, 3) };
  }

  // 合併入現有 years（多數只有 year label 冇數字）
  const merged = data.years.map((y, i) => {
    const g = guessed[i] ?? guessed[0];
    if (!g) return y;
    return {
      ...y,
      revenue: y.revenue ?? g.revenue,
      gross_profit: y.gross_profit ?? g.gross_profit,
      operating_profit: y.operating_profit ?? g.operating_profit,
      profit_before_tax: y.profit_before_tax ?? g.profit_before_tax,
      net_profit: y.net_profit ?? g.net_profit,
      finance_costs: y.finance_costs ?? g.finance_costs,
      depreciation: y.depreciation ?? g.depreciation,
      amortisation: y.amortisation ?? g.amortisation,
      tax: y.tax ?? g.tax,
      financial_year: y.financial_year ?? g.financial_year,
      year_end_date: y.year_end_date ?? g.year_end_date,
    };
  });
  if (merged.length < guessed.length) {
    for (let i = merged.length; i < guessed.length && i < 3; i++) {
      merged.push(guessed[i]!);
    }
  }
  return { ...data, years: merged };
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
  if (y.ebitda_disclosed != null) return y.ebitda_disclosed;
  const ebt = resolveEarningBeforeTax(
    y.profit_before_tax,
    y.net_profit,
    y.tax,
  );
  const computed = ebitdaFromComponents(
    ebt,
    y.finance_costs,
    y.tax,
    y.depreciation,
    y.amortisation,
  );
  if (computed != null) return computed;
  return ebitdaFromPbt(
    ebt,
    y.finance_costs,
    y.depreciation,
    y.amortisation,
    y.tax,
  );
}

function yearEbitdaPolicy(y: AuditedYearExtract): number | null {
  if (y.ebitda_disclosed != null) return y.ebitda_disclosed;
  const ebt = resolveEarningBeforeTax(
    y.profit_before_tax,
    y.net_profit,
    y.tax,
  );
  return ebitdaFromPbt(
    ebt,
    y.finance_costs,
    y.depreciation,
    y.amortisation,
    y.tax,
  );
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
    ebitdaPolicy: yearEbitdaPolicy(y),
    financeCosts: y.finance_costs,
    depreciation: y.depreciation,
    amortisation: y.amortisation,
    ebitdaDisclosed: y.ebitda_disclosed,
  }));
}

export type AuditedCreditMetrics = {
  latestEbitda: number | null;
  latestEbitdaPolicy: number | null;
  ebitdaComponents: {
    profitBeforeTax: number | null;
    financeCosts: number | null;
    depreciation: number | null;
    amortisation: number | null;
    disclosed: number | null;
    sourcePages: string | null;
    confidence: number | null;
    humanModified: boolean;
  };
  balanceSheet: {
    totalAssets: number | null;
    currentAssets: number | null;
    cashAndBank: number | null;
    totalLiabilities: number | null;
    currentLiabilities: number | null;
    borrowings: number | null;
    shareholdersEquity: number | null;
    intangibleAssets: number | null;
    goodwill: number | null;
    sourcePages: string | null;
  };
  tangibleNetWorth: number | null;
  gearing: number | null;
  gearingThreshold: number;
  gearingStatus: "pass" | "fail" | "unknown";
  annualDebtService: number | null;
  dscr: number | null;
  dscrStatus: "pass" | "amber" | "fail" | "unknown";
  dscrNote: string;
  revenueYoY: Array<{
    from: string;
    to: string;
    prev: number | null;
    curr: number | null;
    changePct: number | null;
  }>;
  consecutiveDecline: boolean;
  insufficientYears: boolean;
  formulaNotes: string[];
};

/** 4.3–4.7 衍生指標（系統公式；AI 只抽原料） */
export function buildAuditedCreditMetrics(
  extract: AuditedReportExtract,
  opts?: {
    monthlyDebtPayments?: number | null;
    gearingThreshold?: number;
    humanModified?: boolean;
  },
): AuditedCreditMetrics {
  const rows = buildAuditedComparisonRows(extract);
  const latest = rows[0];
  const monthly = opts?.monthlyDebtPayments ?? null;
  const annualDebt =
    monthly == null
      ? null
      : annualDebtServiceFromMonthly([monthly]);
  const tnw = tangibleNetWorth(
    extract.shareholders_equity,
    extract.intangible_assets,
    extract.goodwill,
  );
  const gearing = gearingRatio(extract.total_liabilities, tnw);
  const threshold = opts?.gearingThreshold ?? 4;
  let gearingStatus: AuditedCreditMetrics["gearingStatus"] = "unknown";
  if (gearing != null && Number.isFinite(gearing)) {
    gearingStatus = gearing < threshold ? "pass" : "fail";
  }

  const ebitdaForDscr = latest?.ebitdaPolicy ?? latest?.ebitda ?? null;
  let dscrVal: number | null = null;
  let dscrStatus: AuditedCreditMetrics["dscrStatus"] = "unknown";
  let dscrNote = "尚未提供現有每月供款，未能計算完整 DSCR。";
  if (monthly == null) {
    if (ebitdaForDscr != null && ebitdaForDscr > 0) {
      dscrStatus = "amber";
      dscrNote =
        "EBITDA 為正數，但債務供款未完整——顯示黃燈，需人工跟進；不可顯示完整通過。";
    } else if (ebitdaForDscr != null && ebitdaForDscr <= 0) {
      dscrStatus = "fail";
      dscrNote = "EBITDA 非正數，且缺乏債務供款資料。";
    }
  } else if (annualDebt != null && annualDebt <= 0) {
    dscrStatus = "pass";
    dscrNote = "已申報每月供款為 0；請再次確認。";
  } else {
    dscrVal = dscr(ebitdaForDscr, annualDebt);
    if (dscrVal != null && ebitdaForDscr != null && annualDebt != null) {
      if (ebitdaForDscr > annualDebt) {
        dscrStatus = "pass";
        dscrNote = `DSCR ${dscrVal.toFixed(2)}x（EBITDA > 一年總債務支出）。`;
      } else {
        dscrStatus = "fail";
        dscrNote = `DSCR ${dscrVal.toFixed(2)}x（EBITDA 未能覆蓋一年總債務支出）。`;
      }
    }
  }

  const revenueYoY: AuditedCreditMetrics["revenueYoY"] = [];
  for (let i = 0; i < rows.length - 1; i++) {
    const curr = rows[i]!;
    const prev = rows[i + 1]!;
    revenueYoY.push({
      from: prev.financialYear,
      to: curr.financialYear,
      prev: prev.revenue,
      curr: curr.revenue,
      changePct:
        prev.revenue != null && curr.revenue != null
          ? yoyChange(prev.revenue, curr.revenue)
          : null,
    });
  }
  const consecutiveDecline =
    revenueYoY.length >= 2 &&
    revenueYoY.every((y) => y.changePct != null && y.changePct < 0);

  return {
    latestEbitda: latest?.ebitda ?? null,
    latestEbitdaPolicy: latest?.ebitdaPolicy ?? null,
    ebitdaComponents: {
      profitBeforeTax: latest?.profitBeforeTax ?? null,
      financeCosts: latest?.financeCosts ?? null,
      depreciation: latest?.depreciation ?? null,
      amortisation: latest?.amortisation ?? null,
      disclosed: latest?.ebitdaDisclosed ?? null,
      sourcePages: extract.ebitda_source_pages,
      confidence: extract.extract_confidence,
      humanModified: Boolean(opts?.humanModified),
    },
    balanceSheet: {
      totalAssets: extract.total_assets,
      currentAssets: extract.current_assets,
      cashAndBank: extract.cash_and_bank,
      totalLiabilities: extract.total_liabilities,
      currentLiabilities: extract.current_liabilities,
      borrowings: extract.borrowings,
      shareholdersEquity: extract.shareholders_equity,
      intangibleAssets: extract.intangible_assets,
      goodwill: extract.goodwill,
      sourcePages: extract.balance_sheet_source_pages,
    },
    tangibleNetWorth: tnw,
    gearing,
    gearingThreshold: threshold,
    gearingStatus,
    annualDebtService: annualDebt,
    dscr: dscrVal,
    dscrStatus,
    dscrNote,
    revenueYoY,
    consecutiveDecline,
    insufficientYears: rows.length < 3,
    formulaNotes: [
      "EBITDA = Earning before tax + Interest + Tax + Depreciation + Amortisation（有披露則優先披露值）",
      FORMULA_DEFINITIONS.ebitda,
      FORMULA_DEFINITIONS.tangibleNetWorth,
      FORMULA_DEFINITIONS.gearing,
      FORMULA_DEFINITIONS.dscr,
      FORMULA_DEFINITIONS.yoy,
    ],
  };
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

    if (base.total_assets == null && e.total_assets != null)
      base.total_assets = e.total_assets;
    if (base.current_assets == null && e.current_assets != null)
      base.current_assets = e.current_assets;
    if (base.cash_and_bank == null && e.cash_and_bank != null)
      base.cash_and_bank = e.cash_and_bank;
    if (base.total_liabilities == null && e.total_liabilities != null)
      base.total_liabilities = e.total_liabilities;
    if (base.current_liabilities == null && e.current_liabilities != null)
      base.current_liabilities = e.current_liabilities;
    if (base.borrowings == null && e.borrowings != null)
      base.borrowings = e.borrowings;
    if (base.shareholders_equity == null && e.shareholders_equity != null)
      base.shareholders_equity = e.shareholders_equity;
    if (base.intangible_assets == null && e.intangible_assets != null)
      base.intangible_assets = e.intangible_assets;
    if (base.goodwill == null && e.goodwill != null) base.goodwill = e.goodwill;
    if (!base.ebitda_source_pages && e.ebitda_source_pages)
      base.ebitda_source_pages = e.ebitda_source_pages;
    if (!base.balance_sheet_source_pages && e.balance_sheet_source_pages)
      base.balance_sheet_source_pages = e.balance_sheet_source_pages;
    if (base.extract_confidence == null && e.extract_confidence != null)
      base.extract_confidence = e.extract_confidence;

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
