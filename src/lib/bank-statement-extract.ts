import { z } from "zod";
import type { FinancialExtract } from "./financial-extract";
import {
  applyHardcodedBankFormulas,
  avgNumbers,
  avgMonthlyTurnover,
  netCashflow,
  sharePct,
  sumNumbers,
} from "./formulas";

/**
 * 單月銀行月結 AI 抽取 — 對應申請頁 6 大現金流資訊
 * Schema 刻意寬鬆：Manus 常回字串數字／缺陣列。
 */

const looseNum = z
  .union([z.number(), z.string(), z.null(), z.undefined()])
  .transform((v): number | null => {
    if (v == null || v === "") return null;
    if (typeof v === "number") return Number.isFinite(v) ? v : null;
    const n = Number(String(v).replace(/[,$\s]|HKD|hkd/gi, ""));
    return Number.isFinite(n) ? n : null;
  });

const looseStr = z
  .union([z.string(), z.number(), z.null(), z.undefined()])
  .transform((v): string | null => {
    if (v == null || v === "") return null;
    return String(v);
  });

const CreditSourceSchema = z
  .object({
    source: looseStr.transform((s) => s ?? "未分類"),
    total_hkd: looseNum,
    count: looseNum,
    frequency: looseStr,
  })
  .passthrough();

const AnomalySchema = z
  .object({
    kind: looseStr,
    date: looseStr,
    description: looseStr.transform((s) => s ?? ""),
    amount_hkd: looseNum,
  })
  .passthrough();

const DailyBalanceSchema = z
  .object({
    date: looseStr.transform((s) => s ?? ""),
    balance_hkd: looseNum.transform((n) => n ?? 0),
  })
  .passthrough();

function parseLooseNumber(v: unknown): number | null {
  if (v == null || v === "") return null;
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  const n = Number(String(v).replace(/[,$\s]|HKD|hkd/gi, ""));
  return Number.isFinite(n) ? n : null;
}

/** Gemini 常回 number[]／{balance}／{date:bal} map — 一律正規化 */
function coerceDailyBalanceItem(
  item: unknown,
): { date: string; balance_hkd: number } | null {
  if (item == null) return null;
  if (typeof item === "number" || typeof item === "string") {
    const n = parseLooseNumber(item);
    if (n == null) return null;
    return { date: "", balance_hkd: n };
  }
  if (typeof item !== "object") return null;
  if (Array.isArray(item)) {
    // ["2026-01-01", 12000] 或 [12000]
    if (item.length >= 2 && typeof item[0] === "string") {
      const bal = parseLooseNumber(item[1]);
      if (bal == null) return null;
      return { date: String(item[0]), balance_hkd: bal };
    }
    const bal = parseLooseNumber(item[0]);
    if (bal == null) return null;
    return { date: "", balance_hkd: bal };
  }
  const o = item as Record<string, unknown>;
  const date = String(
    o.date ?? o.Date ?? o.day ?? o.statement_date ?? o.as_of ?? "",
  );
  const bal = parseLooseNumber(
    o.balance_hkd ??
      o.balanceHkd ??
      o.balance ??
      o.closing_balance ??
      o.closingBalance ??
      o.amount_hkd ??
      o.amount ??
      o.value ??
      o.ledger_balance,
  );
  if (bal == null) return null;
  return { date, balance_hkd: bal };
}

function normalizeDailyBalancesInput(v: unknown): unknown[] {
  if (v == null) return [];
  if (Array.isArray(v)) {
    return v
      .map(coerceDailyBalanceItem)
      .filter((x): x is { date: string; balance_hkd: number } => x != null);
  }
  // { "2026-01-01": 1000, "2026-01-02": 1100 }
  if (typeof v === "object") {
    return Object.entries(v as Record<string, unknown>)
      .map(([date, balance]) => coerceDailyBalanceItem({ date, balance_hkd: balance }))
      .filter((x): x is { date: string; balance_hkd: number } => x != null);
  }
  return [];
}

function looseArray<T extends z.ZodTypeAny>(item: T) {
  return z.preprocess((v) => {
    if (v == null) return [];
    if (!Array.isArray(v)) return [];
    return v;
  }, z.array(item).catch([]));
}

const DailyBalancesField = z.preprocess(
  normalizeDailyBalancesInput,
  z.array(DailyBalanceSchema).catch([]),
);

export const BankStatementExtractSchema = z
  .object({
    month: looseStr,
    bank_name: looseStr,
    account_holder: looseStr,
    account_last4: looseStr,
    opening_balance: looseNum,
    closing_balance: looseNum,
    average_daily_balance: looseNum,
    min_daily_balance: looseNum,
    total_credits: looseNum,
    total_debits: looseNum,
    operating_credits: looseNum,
    credit_count: looseNum,
    credit_days: looseNum,
    net_cashflow: looseNum,
    credit_sources: looseArray(CreditSourceSchema),
    anomalies: looseArray(AnomalySchema),
    daily_balances: DailyBalancesField,
    cashflow_summary: looseStr,
    repayment_capacity: z
      .preprocess((v) => {
        if (v == null || v === "") return null;
        if (typeof v === "string") {
          return { assessment: v, notes: null };
        }
        return v;
      }, z
        .union([
          z
            .object({
              assessment: looseStr,
              notes: looseStr,
            })
            .passthrough(),
          z.null(),
        ])
        .catch(null)),
  })
  .passthrough();

export type BankStatementExtract = z.infer<typeof BankStatementExtractSchema>;

export const BANK_STATEMENT_SYSTEM_PROMPT = `你是香港中小企貸款預審助手，專門閱讀銀行月結單。

只根據提供文字／影像抽取，禁止上網。立刻只回 JSON（不要 markdown 以外文字）。

JSON 欄位（金額用純數字）：
{
  "month": "YYYY-MM",
  "bank_name": string|null,
  "account_holder": string|null,
  "account_last4": string|null,
  "opening_balance": number|null,
  "closing_balance": number|null,
  "average_daily_balance": number|null,
  "min_daily_balance": number|null,
  "total_credits": number|null,
  "total_debits": number|null,
  "operating_credits": number|null,
  "credit_count": number|null,
  "credit_days": number|null,
  "net_cashflow": number|null,
  "credit_sources": [{"source":string,"total_hkd":number|null,"count":number|null,"frequency":string|null}],
  "anomalies": [{"kind":string|null,"date":string|null,"description":string,"amount_hkd":number|null}],
  "daily_balances": [{"date":"YYYY-MM-DD","balance_hkd":number}],
  "cashflow_summary": string|null,
  "repayment_capacity": {"assessment":"adequate"|"tight"|"weak"|"unknown","notes":string|null}
}

重點：
1) 現金流：只抽取文件上的 total_credits／total_debits；net_cashflow 由系統公式重算（credits−debits），你可填 null
2) 結餘：opening_balance／closing_balance；若可見日結餘請填 daily_balances（物件陣列，欄位 date + balance_hkd）。看不到日結餘就填 []，切勿用字串或其他結構。average_daily_balance／min_daily_balance 由系統重算，無日結餘則可填文件列示值或 null——勿自行估算
3) 營業進帳 operating_credits：只填可合理歸類為營業相關入賬；唔好估；唔確定就 null
4) 來源頻率：credit_sources 最多 6 個；credit_count／credit_days
5) 異常：退票／自動轉帳失敗／透支 → anomalies，無則 []
6) 還款能力：repayment_capacity（不可承諾批核）
缺資料用 null／[]。禁止把審計報告 revenue／EBITDA 當月結數字。`;

/** 六個月（或多份）月結 → 同一個 Manus task */
export const BANK_BATCH_SYSTEM_PROMPT = `你是香港中小企貸款預審助手，專門一次閱讀多份銀行月結單。

只根據提供文字／影像抽取，禁止上網。立刻只回一個 JSON（不要其他文字）。

必須輸出：
{
  "statements": [
    {
      "month": "YYYY-MM",
      "bank_name": string|null,
      "account_holder": string|null,
      "account_last4": string|null,
      "opening_balance": number|null,
      "closing_balance": number|null,
      "average_daily_balance": number|null,
      "min_daily_balance": number|null,
      "total_credits": number|null,
      "total_debits": number|null,
      "operating_credits": number|null,
      "credit_count": number|null,
      "credit_days": number|null,
      "net_cashflow": number|null,
      "credit_sources": [{"source":string,"total_hkd":number|null,"count":number|null,"frequency":string|null}],
      "anomalies": [{"kind":string|null,"date":string|null,"description":string,"amount_hkd":number|null}],
      "daily_balances": [],
      "cashflow_summary": string|null,
      "repayment_capacity": {"assessment":"adequate"|"tight"|"weak"|"unknown","notes":string|null}
    }
  ]
}

規則：
- statements 必須對應每一個提供的預期月份（可按月份排序）；某月讀唔到仍要出物件，金額填 null
- net_cashflow／ADB／min_daily 可由系統重算，你可填 null
- 禁止把審計報告數字當月結
- 一次處理全部月份，唔好只回一份`;

export function buildBankBatchUserText(input: {
  companyNameHint?: string;
  months: string[];
  parts: Array<{ month: string; fileName: string; text: string }>;
}) {
  const blocks = input.parts.map(
    (p, i) =>
      `【月結 ${i + 1}｜預期月份 ${p.month}｜檔名 ${p.fileName}】\n${p.text.slice(0, 40_000) || "（無文字層）"}`,
  );
  return [
    `請一次抽取以下 ${input.parts.length} 份銀行月結，輸出 { "statements": [ ... ] }。`,
    `預期月份列表：${input.months.join("、")}`,
    input.companyNameHint ? `申請公司提示：${input.companyNameHint}` : null,
    blocks.join("\n\n====\n\n"),
  ]
    .filter(Boolean)
    .join("\n\n");
}

export function parseBankStatementBatch(
  raw: unknown,
  monthHints: string[],
): {
  ok: true;
  data: BankStatementExtract[];
} | {
  ok: false;
  error: string;
} {
  let list: unknown[] = [];
  if (Array.isArray(raw)) {
    list = raw;
  } else if (raw && typeof raw === "object") {
    const o = raw as Record<string, unknown>;
    if (Array.isArray(o.statements)) list = o.statements;
    else if (Array.isArray(o.months)) list = o.months;
    else if ("total_credits" in o || "opening_balance" in o) {
      // 誤回單月
      list = [o];
    }
  }
  if (!list.length) {
    return { ok: false, error: "BANK_BATCH_EMPTY" };
  }

  const byMonth = new Map<string, BankStatementExtract>();
  const errors: string[] = [];
  for (let i = 0; i < list.length; i++) {
    const hint = monthHints[i];
    const parsed = parseBankStatementExtract(list[i], hint);
    if (!parsed.ok) {
      errors.push(`#${i + 1}: ${parsed.error}`);
      continue;
    }
    const key = (parsed.data.month || hint || `idx-${i}`).trim();
    byMonth.set(key, parsed.data);
  }

  const ordered = monthHints.map((m) => {
    if (byMonth.has(m)) return byMonth.get(m)!;
    // fuzzy：month 欄可能係 2024/01
    for (const [k, v] of byMonth) {
      if (k.replace(/[/-]/g, "").startsWith(m.replace(/[/-]/g, ""))) {
        return { ...v, month: m };
      }
    }
    return toBankStatementExtract(null, m);
  });

  const anyData = ordered.some(
    (s) =>
      s.total_credits != null ||
      s.opening_balance != null ||
      s.closing_balance != null,
  );
  if (!anyData) {
    return {
      ok: false,
      error: errors[0] || "BANK_BATCH_NO_AMOUNTS",
    };
  }
  return { ok: true, data: ordered };
}

export function buildBankStatementUserText(input: {
  fileName?: string;
  statementMonth?: string;
  companyNameHint?: string;
  pastedText?: string;
}) {
  return [
    "這是銀行月結單。請輸出銀行現金流 JSON（total_credits、opening_balance 等），不要輸出 company_name/revenue/EBITDA 那種財務報表格式。",
    input.statementMonth ? `預期月份：${input.statementMonth}` : null,
    input.fileName ? `檔名：${input.fileName}` : null,
    input.companyNameHint ? `申請公司提示：${input.companyNameHint}` : null,
    input.pastedText
      ? `月結文字／OCR：\n---\n${input.pastedText.slice(0, 100_000)}\n---`
      : "（無文字層，請根據附上的頁面影像辨識）",
  ]
    .filter(Boolean)
    .join("\n\n");
}

export function emptyBankStatementExtract(
  monthHint?: string,
): BankStatementExtract {
  return {
    month: monthHint ?? null,
    bank_name: null,
    account_holder: null,
    account_last4: null,
    opening_balance: null,
    closing_balance: null,
    average_daily_balance: null,
    min_daily_balance: null,
    total_credits: null,
    total_debits: null,
    operating_credits: null,
    credit_count: null,
    credit_days: null,
    net_cashflow: null,
    credit_sources: [],
    anomalies: [],
    daily_balances: [],
    cashflow_summary: null,
    repayment_capacity: null,
  };
}

export function toBankStatementExtract(
  raw: Partial<BankStatementExtract> | null | undefined,
  monthHint?: string,
): BankStatementExtract {
  const base = emptyBankStatementExtract(monthHint);
  if (!raw) return base;
  const merged: BankStatementExtract = {
    ...base,
    ...raw,
    month: raw.month ?? monthHint ?? null,
    credit_sources: raw.credit_sources ?? [],
    anomalies: raw.anomalies ?? [],
    daily_balances: raw.daily_balances ?? [],
    repayment_capacity: raw.repayment_capacity ?? null,
  };
  // 衍生指標一律硬編碼重算，唔信 AI 估數
  return applyHardcodedBankFormulas(merged);
}

/** 抽出可能包喺 wrapper 入面嘅銀行 JSON */
function unwrapBankPayload(raw: unknown): unknown {
  if (!raw || typeof raw !== "object") return raw;
  const o = raw as Record<string, unknown>;
  if (o.statement && typeof o.statement === "object") return o.statement;
  if (o.bank_statement && typeof o.bank_statement === "object") {
    return o.bank_statement;
  }
  if (o.data && typeof o.data === "object" && !Array.isArray(o.data)) {
    return o.data;
  }
  // { statements: [ one ] } → 取第一份
  if (Array.isArray(o.statements) && o.statements.length === 1) {
    return o.statements[0];
  }
  return raw;
}

/** 寬鬆解析：接受銀行 schema 或誤回嘅 financial schema */
export function parseBankStatementExtract(
  raw: unknown,
  monthHint?: string,
): { ok: true; data: BankStatementExtract } | { ok: false; error: string } {
  const candidates = [raw, unwrapBankPayload(raw)];

  for (const candidate of candidates) {
    const parsed = BankStatementExtractSchema.safeParse(candidate);
    if (parsed.success) {
      return {
        ok: true,
        data: toBankStatementExtract(parsed.data, monthHint),
      };
    }
  }

  // Gemini 有時誤回舊 financial JSON
  if (raw && typeof raw === "object") {
    const o = unwrapBankPayload(raw) as Record<string, unknown>;
    if (o && typeof o === "object") {
      const looksFinancial =
        "revenue" in o || "EBITDA" in o || "company_name" in o;
      const looksBank =
        "total_credits" in o ||
        "opening_balance" in o ||
        "closing_balance" in o ||
        "operating_credits" in o ||
        "daily_balances" in o;

      if (looksFinancial && !looksBank) {
        return {
          ok: false,
          error:
            "模型回傳財務報表格式（revenue／EBITDA），而非銀行月結現金流。請重試或改上清晰月結 PDF。",
        };
      }

      // 強制清掉易爆陣列再 salvage
      const soft = {
        ...emptyBankStatementExtract(monthHint),
        ...o,
        credit_sources: Array.isArray(o.credit_sources)
          ? o.credit_sources
          : [],
        anomalies: Array.isArray(o.anomalies) ? o.anomalies : [],
        daily_balances: normalizeDailyBalancesInput(o.daily_balances),
      };
      const salvage = BankStatementExtractSchema.safeParse(soft);
      if (salvage.success) {
        return {
          ok: true,
          data: toBankStatementExtract(salvage.data, monthHint),
        };
      }

      // 最後兜底：只保留金額欄，daily_balances 清空
      const minimal = BankStatementExtractSchema.safeParse({
        ...emptyBankStatementExtract(monthHint),
        month: o.month ?? monthHint ?? null,
        bank_name: o.bank_name ?? null,
        account_holder: o.account_holder ?? null,
        account_last4: o.account_last4 ?? null,
        opening_balance: o.opening_balance ?? null,
        closing_balance: o.closing_balance ?? null,
        average_daily_balance: o.average_daily_balance ?? null,
        min_daily_balance: o.min_daily_balance ?? null,
        total_credits: o.total_credits ?? null,
        total_debits: o.total_debits ?? null,
        operating_credits: o.operating_credits ?? null,
        credit_count: o.credit_count ?? null,
        credit_days: o.credit_days ?? null,
        cashflow_summary:
          typeof o.cashflow_summary === "string" ? o.cashflow_summary : null,
        daily_balances: [],
        credit_sources: [],
        anomalies: [],
      });
      if (minimal.success) {
        const hasAmount =
          minimal.data.total_credits != null ||
          minimal.data.opening_balance != null ||
          minimal.data.closing_balance != null;
        if (hasAmount) {
          return {
            ok: true,
            data: toBankStatementExtract(minimal.data, monthHint),
          };
        }
      }
    }
  }

  const parsed = BankStatementExtractSchema.safeParse(raw);
  return {
    ok: false,
    error: parsed.success
      ? "BANK_PARSE_FAILED"
      : parsed.error.issues
          .slice(0, 3)
          .map((i) => `${i.path.join(".")}: ${i.message}`)
          .join("; "),
  };
}

/** 兼容舊 financial extract（合併 JSON 用） */
export function bankExtractToFinancial(
  b: BankStatementExtract,
): FinancialExtract {
  return {
    company_name: b.account_holder,
    financial_year: b.month,
    revenue: b.operating_credits ?? b.total_credits,
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

export type BankCashflowBrief = {
  cashflow: {
    months: Array<{
      month: string;
      totalCredits: number | null;
      totalDebits: number | null;
      netCashflow: number | null;
      summary: string | null;
    }>;
    sixMonthTotalCredits: number | null;
    sixMonthTotalDebits: number | null;
    sixMonthNet: number | null;
    narrative: string;
  };
  balances: {
    months: Array<{
      month: string;
      opening: number | null;
      closing: number | null;
      averageDaily: number | null;
      minDaily: number | null;
      dailyCount: number;
    }>;
    sixMonthAvgDaily: number | null;
    sixMonthMinDaily: number | null;
  };
  operatingInflows: {
    months: Array<{
      month: string;
      operatingCredits: number | null;
      totalCredits: number | null;
    }>;
    sixMonthOperating: number | null;
    monthlyAvgOperating: number | null;
  };
  inflowPattern: {
    months: Array<{
      month: string;
      creditCount: number | null;
      creditDays: number | null;
    }>;
    sources: Array<{
      source: string;
      totalHkd: number;
      sharePct: number;
      frequency: string | null;
    }>;
  };
  anomalies: Array<{
    month: string | null;
    kind: string | null;
    date: string | null;
    description: string;
    amountHkd: number | null;
  }>;
  repaymentCapacity: {
    assessments: Array<{
      month: string;
      assessment: string | null;
      notes: string | null;
    }>;
    overall: "adequate" | "tight" | "weak" | "unknown";
    narrative: string;
  };
};

function rankAssessment(a: string | null | undefined): number {
  if (a === "weak") return 0;
  if (a === "tight") return 1;
  if (a === "adequate") return 2;
  return -1;
}

export function mergeBankStatementExtracts(
  list: BankStatementExtract[],
): BankCashflowBrief {
  const months = [...list].sort((a, b) =>
    String(a.month ?? "").localeCompare(String(b.month ?? "")),
  );

  const cashflowMonths = months.map((m) => ({
    month: m.month ?? "—",
    totalCredits: m.total_credits,
    totalDebits: m.total_debits,
    netCashflow: netCashflow(m.total_credits, m.total_debits) ?? m.net_cashflow,
    summary: m.cashflow_summary,
  }));

  const sixMonthTotalCredits = sumNumbers(months.map((m) => m.total_credits));
  const sixMonthTotalDebits = sumNumbers(months.map((m) => m.total_debits));
  const sixMonthNet =
    netCashflow(sixMonthTotalCredits, sixMonthTotalDebits) ??
    sumNumbers(months.map((m) => m.net_cashflow));

  const balanceMonths = months.map((m) => ({
    month: m.month ?? "—",
    opening: m.opening_balance,
    closing: m.closing_balance,
    averageDaily: m.average_daily_balance,
    minDaily: m.min_daily_balance,
    dailyCount: m.daily_balances?.length ?? 0,
  }));

  const mins = months
    .map((m) => m.min_daily_balance)
    .filter((n): n is number => n != null);

  const sourceMap = new Map<
    string,
    { total: number; frequency: string | null }
  >();
  for (const m of months) {
    for (const s of m.credit_sources ?? []) {
      const key = s.source?.trim() || "未分類";
      const prev = sourceMap.get(key) ?? { total: 0, frequency: null };
      prev.total += s.total_hkd ?? 0;
      if (!prev.frequency && s.frequency) prev.frequency = s.frequency;
      sourceMap.set(key, prev);
    }
  }
  const totalSource = [...sourceMap.values()].reduce((a, b) => a + b.total, 0);
  const sources = [...sourceMap.entries()]
    .map(([source, v]) => ({
      source,
      totalHkd: v.total,
      sharePct: sharePct(v.total, totalSource),
      frequency: v.frequency,
    }))
    .sort((a, b) => b.totalHkd - a.totalHkd)
    .slice(0, 12);

  const anomalies = months.flatMap((m) =>
    (m.anomalies ?? []).map((a) => ({
      month: m.month,
      kind: a.kind,
      date: a.date,
      description: a.description,
      amountHkd: a.amount_hkd,
    })),
  );

  const assessments = months.map((m) => ({
    month: m.month ?? "—",
    assessment: m.repayment_capacity?.assessment
      ? String(m.repayment_capacity.assessment)
      : null,
    notes: m.repayment_capacity?.notes ?? null,
  }));

  let overall: BankCashflowBrief["repaymentCapacity"]["overall"] = "unknown";
  const ranks = assessments
    .map((a) => rankAssessment(a.assessment))
    .filter((r) => r >= 0);
  if (ranks.length) {
    const worst = Math.min(...ranks);
    overall = worst === 0 ? "weak" : worst === 1 ? "tight" : "adequate";
  }

  const sixMonthOperating = sumNumbers(
    months.map((m) => m.operating_credits ?? m.total_credits),
  );

  const narrativeBits = cashflowMonths
    .map((m) => m.summary)
    .filter(Boolean)
    .slice(0, 3);

  return {
    cashflow: {
      months: cashflowMonths,
      sixMonthTotalCredits,
      sixMonthTotalDebits,
      sixMonthNet,
      narrative:
        narrativeBits.join(" ") ||
        "已合併月結現金流摘要（淨額／ADB 由系統公式重算；缺欄＝文件未見）。",
    },
    balances: {
      months: balanceMonths,
      sixMonthAvgDaily: avgNumbers(months.map((m) => m.average_daily_balance)),
      sixMonthMinDaily: mins.length ? Math.min(...mins) : null,
    },
    operatingInflows: {
      months: months.map((m) => ({
        month: m.month ?? "—",
        operatingCredits: m.operating_credits,
        totalCredits: m.total_credits,
      })),
      sixMonthOperating,
      monthlyAvgOperating: avgMonthlyTurnover(
        months.map((m) => m.operating_credits ?? m.total_credits),
      ),
    },
    inflowPattern: {
      months: months.map((m) => ({
        month: m.month ?? "—",
        creditCount: m.credit_count,
        creditDays: m.credit_days,
      })),
      sources,
    },
    anomalies,
    repaymentCapacity: {
      assessments,
      overall,
      narrative:
        overall === "adequate"
          ? "六個月結餘／進帳大致穩定，基本還款能力初步可接受（仍須顧問覆核）。"
          : overall === "tight"
            ? "現金流偏緊，基本還款能力需進一步覆核。"
            : overall === "weak"
              ? "現金流偏弱或波動大，基本還款能力存疑，需人工覆核。"
              : "資料不足，未能判斷基本還款能力。",
    },
  };
}

export function formatHkd(n: number | null | undefined) {
  if (n == null || Number.isNaN(n)) return "—";
  return `HK$${Math.round(n).toLocaleString("en-HK")}`;
}
