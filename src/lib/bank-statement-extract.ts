import { z } from "zod";
import type { FinancialExtract } from "./financial-extract";

/**
 * 單月銀行月結 AI 抽取 — 對應申請頁 6 大現金流資訊
 */

const CreditSourceSchema = z.object({
  source: z.string(),
  total_hkd: z.number().nullable(),
  count: z.number().nullable(),
  frequency: z.string().nullable(),
});

const AnomalySchema = z.object({
  kind: z.string().nullable(),
  date: z.string().nullable(),
  description: z.string(),
  amount_hkd: z.number().nullable(),
});

const DailyBalanceSchema = z.object({
  date: z.string(),
  balance_hkd: z.number(),
});

export const BankStatementExtractSchema = z.object({
  month: z
    .union([z.string(), z.number()])
    .nullable()
    .transform((v) => (v == null ? null : String(v))),
  bank_name: z.string().nullable(),
  account_holder: z.string().nullable(),
  account_last4: z.string().nullable(),
  opening_balance: z.number().nullable(),
  closing_balance: z.number().nullable(),
  average_daily_balance: z.number().nullable(),
  min_daily_balance: z.number().nullable(),
  total_credits: z.number().nullable(),
  total_debits: z.number().nullable(),
  operating_credits: z.number().nullable(),
  credit_count: z.number().nullable(),
  credit_days: z.number().nullable(),
  net_cashflow: z.number().nullable(),
  credit_sources: z.array(CreditSourceSchema).default([]),
  anomalies: z.array(AnomalySchema).default([]),
  daily_balances: z.array(DailyBalanceSchema).default([]),
  cashflow_summary: z.string().nullable(),
  repayment_capacity: z
    .object({
      assessment: z.string().nullable(),
      notes: z.string().nullable(),
    })
    .nullable()
    .optional(),
});

export type BankStatementExtract = z.infer<typeof BankStatementExtractSchema>;

export const BANK_STATEMENT_SYSTEM_PROMPT = `你是香港中小企貸款預審助手，專門閱讀銀行月結單。

請從本月月結單抽取現金流資訊（只根據提供文字／影像，禁止上網）。

必須輸出 JSON（不要其他文字）：
{
  "month": "YYYY-MM" | null,
  "bank_name": string | null,
  "account_holder": string | null,
  "account_last4": string | null,
  "opening_balance": number | null,
  "closing_balance": number | null,
  "average_daily_balance": number | null,
  "min_daily_balance": number | null,
  "total_credits": number | null,
  "total_debits": number | null,
  "operating_credits": number | null,
  "credit_count": number | null,
  "credit_days": number | null,
  "net_cashflow": number | null,
  "credit_sources": [{"source": string, "total_hkd": number|null, "count": number|null, "frequency": string|null}],
  "anomalies": [{"kind": string|null, "date": string|null, "description": string, "amount_hkd": number|null}],
  "daily_balances": [{"date": "YYYY-MM-DD", "balance_hkd": number}],
  "cashflow_summary": string | null,
  "repayment_capacity": {"assessment": "adequate"|"tight"|"weak"|"unknown", "notes": string|null} | null
}

抽取指引：
1. 公司現金流：total_credits / total_debits / net_cashflow（存入−支出；找不到就 null）+ cashflow_summary（1–2 句繁中）
2. 每月及每日戶口結餘：opening／closing；若月結有每日結餘或可重建，填 daily_balances（最多 31 筆）及 average_daily_balance／min_daily_balance；無法計就 null
3. 營業進帳：operating_credits＝估計營業相關存入（排除股東注資、貸款、明顯轉帳）；total_credits＝全部存入
4. 進帳頻率及來源：credit_sources 列主要對手／來源（最多 8 個），frequency 例如「每週」「不定期」「本月3次」；credit_count／credit_days
5. 戶口異常：退票、自動轉帳失敗、透支、扣款失敗、異常大額等 → anomalies（沒有則 []）
6. 基本還款能力：repayment_capacity.assessment 依結餘穩定性＋淨現金流粗判（adequate／tight／weak／unknown），notes 一句；不可承諾批核

金額純數字 HKD，無逗號。缺資料填 null／[]。立即回 JSON，不要研究。`;

export function buildBankStatementUserText(input: {
  fileName?: string;
  statementMonth?: string;
  companyNameHint?: string;
  pastedText?: string;
}) {
  return [
    "請分析這份銀行月結單，抽取現金流／結餘／進帳／異常／還款能力。",
    input.statementMonth ? `預期月份：${input.statementMonth}` : null,
    input.fileName ? `檔名：${input.fileName}` : null,
    input.companyNameHint ? `申請公司提示：${input.companyNameHint}` : null,
    input.pastedText
      ? `以下為月結文字／OCR（可能不完整）：\n---\n${input.pastedText.slice(0, 100_000)}\n---`
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
  return {
    ...base,
    ...raw,
    month: raw.month ?? monthHint ?? null,
    credit_sources: raw.credit_sources ?? [],
    anomalies: raw.anomalies ?? [],
    daily_balances: raw.daily_balances ?? [],
    repayment_capacity: raw.repayment_capacity ?? null,
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
  };
}

export type BankCashflowBrief = {
  /** 1 公司現金流 */
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
  /** 2 每月及每日戶口結餘 */
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
  /** 3 營業進帳 */
  operatingInflows: {
    months: Array<{
      month: string;
      operatingCredits: number | null;
      totalCredits: number | null;
    }>;
    sixMonthOperating: number | null;
    monthlyAvgOperating: number | null;
  };
  /** 4 進帳頻率及來源 */
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
  /** 5 戶口異常紀錄 */
  anomalies: Array<{
    month: string | null;
    kind: string | null;
    date: string | null;
    description: string;
    amountHkd: number | null;
  }>;
  /** 6 公司基本還款能力 */
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

function sumNullable(nums: Array<number | null | undefined>): number | null {
  const xs = nums.filter((n): n is number => n != null);
  if (!xs.length) return null;
  return xs.reduce((a, b) => a + b, 0);
}

function avgNullable(nums: Array<number | null | undefined>): number | null {
  const xs = nums.filter((n): n is number => n != null);
  if (!xs.length) return null;
  return xs.reduce((a, b) => a + b, 0) / xs.length;
}

function rankAssessment(
  a: string | null | undefined,
): number {
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
    netCashflow: m.net_cashflow,
    summary: m.cashflow_summary,
  }));

  const sixMonthTotalCredits = sumNullable(
    months.map((m) => m.total_credits),
  );
  const sixMonthTotalDebits = sumNullable(months.map((m) => m.total_debits));
  const sixMonthNet =
    sixMonthTotalCredits != null && sixMonthTotalDebits != null
      ? sixMonthTotalCredits - sixMonthTotalDebits
      : sumNullable(months.map((m) => m.net_cashflow));

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
      sharePct: totalSource > 0 ? (v.total / totalSource) * 100 : 0,
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
    overall =
      worst === 0 ? "weak" : worst === 1 ? "tight" : "adequate";
  }

  const sixMonthOperating = sumNullable(
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
        "已合併六個月月結現金流摘要（缺欄＝文件未見）。",
    },
    balances: {
      months: balanceMonths,
      sixMonthAvgDaily: avgNullable(
        months.map((m) => m.average_daily_balance),
      ),
      sixMonthMinDaily: mins.length ? Math.min(...mins) : null,
    },
    operatingInflows: {
      months: months.map((m) => ({
        month: m.month ?? "—",
        operatingCredits: m.operating_credits,
        totalCredits: m.total_credits,
      })),
      sixMonthOperating,
      monthlyAvgOperating:
        sixMonthOperating != null && months.length
          ? sixMonthOperating / months.length
          : null,
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
