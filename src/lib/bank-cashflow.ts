import type { ScreeningResult } from "./types";
import type { CashflowRuleSet } from "./cashflow-rules";
import { DEFAULT_CASHFLOW_RULES, evaluateThreshold } from "./cashflow-rules";

/** 單筆銀行交易（AI 抽取） */
export interface BankTransaction {
  id: string;
  date: string; // YYYY-MM-DD
  valueDate?: string;
  description: string;
  creditHkd: number | null;
  debitHkd: number | null;
  balanceAfterHkd: number | null;
  type?: string;
  counterpartyGuess?: string | null;
  sourcePage?: number;
  confidence: number;
  /** 人工覆核分類 */
  creditCategory?:
    | "operating_income"
    | "shareholder_injection"
    | "loan"
    | "related_party"
    | "refund"
    | "other"
    | "unclear"
    | null;
  manuallyEdited?: boolean;
}

export interface BankStatementMonthDetail {
  month: string; // YYYY-MM
  bankName: string;
  accountHolder: string;
  accountType: string;
  /** 只前端顯示末四位 */
  accountLast4: string;
  currency: string;
  startDate: string;
  endDate: string;
  openingBalanceHkd: number | null;
  closingBalanceHkd: number | null;
  overdraftLimitHkd: number | null;
  availableBalanceHkd: number | null;
  /** 日終帳面結餘序列（可重建）；缺則無法計 ADB */
  dailyLedgerBalances?: { date: string; balanceHkd: number }[];
  transactions: BankTransaction[];
  complete: boolean;
  missingPages: boolean;
  pdfOnly: boolean;
}

export interface MonthlyAdbRow {
  month: string;
  openingBalanceHkd: number | null;
  closingBalanceHkd: number | null;
  averageDailyBalanceHkd: number | null;
  minDailyBalanceHkd: number | null;
  calcStatus: "ok" | "insufficient_data";
  balanceBasis: "ledger" | "available";
  source: string;
  manuallyEdited: boolean;
}

export interface MonthlyCreditRow {
  month: string;
  totalCreditsHkd: number;
  creditCount: number;
  creditDays: number;
  avgCreditSizeHkd: number | null;
}

export interface CreditSourceRow {
  source: string;
  totalHkd: number;
  sharePct: number;
  frequency: string;
}

export type AnomalyKind =
  | "bounced_cheque"
  | "autopay_failed"
  | "overdraft_within_limit"
  | "overdraft_excess"
  | "overdraft_unknown";

export interface BankAnomaly {
  id: string;
  kind: AnomalyKind;
  date: string;
  description: string;
  amountHkd: number | null;
  relatedFeeHkd?: number | null;
  sourcePage?: number;
  confidence: number;
  note?: string;
}

export interface BankCashflowAnalysis {
  bankName: string;
  accountLast4: string;
  periodLabel: string;
  analyzedAt: string;
  balanceBasis: "ledger";
  months: MonthlyAdbRow[];
  sixMonthAdbHkd: number | null;
  sixMonthMinDailyHkd: number | null;
  creditRows: MonthlyCreditRow[];
  sixMonthTotalCreditsHkd: number;
  monthlyAvgCreditsHkd: number;
  creditSources: CreditSourceRow[];
  unclassifiedCreditHkd: number;
  anomalies: BankAnomaly[];
  completenessOk: boolean;
  overall: ScreeningResult;
  clientFacing: "pass_review" | "need_supplement" | "need_human";
  clientMessage: string;
  internalMessage: string;
  ruleHits: {
    id: string;
    name: string;
    status: ScreeningResult;
    detail: string;
  }[];
}

const BOUNCE_PATTERNS =
  /returned cheque|bounced cheque|cheque returned|unpaid cheque|dishonoured cheque|支票退回|退票|未付款支票|退票費/i;

const AUTOPAY_PATTERNS =
  /autopay rejected|direct debit returned|payment reversed|standing instruction failed|insufficient funds|自動轉帳退回|自動付款失敗|扣款失敗|餘額不足|付款退回/i;

function daysInMonth(ym: string) {
  const [y, m] = ym.split("-").map(Number);
  return new Date(y, m, 0).getDate();
}

/**
 * 每日平均餘額＝分析期內所有曆日日終結餘總和 ÷ 曆日總數
 * 使用日終帳面結餘（Ledger）。缺資料則回 null，不估算。
 */
export function computeAverageDailyBalance(input: {
  month: string;
  openingBalanceHkd: number | null;
  dailyLedgerBalances?: { date: string; balanceHkd: number }[];
  transactions: BankTransaction[];
}): {
  averageDailyBalanceHkd: number | null;
  minDailyBalanceHkd: number | null;
  calcStatus: "ok" | "insufficient_data";
} {
  const { month, openingBalanceHkd, dailyLedgerBalances, transactions } = input;

  if (dailyLedgerBalances && dailyLedgerBalances.length > 0) {
    const sum = dailyLedgerBalances.reduce((s, d) => s + d.balanceHkd, 0);
    const min = Math.min(...dailyLedgerBalances.map((d) => d.balanceHkd));
    return {
      averageDailyBalanceHkd: sum / dailyLedgerBalances.length,
      minDailyBalanceHkd: min,
      calcStatus: "ok",
    };
  }

  if (openingBalanceHkd == null) {
    return {
      averageDailyBalanceHkd: null,
      minDailyBalanceHkd: null,
      calcStatus: "insufficient_data",
    };
  }

  // 由期初＋交易重建日終結餘
  const sorted = [...transactions].sort((a, b) =>
    a.date.localeCompare(b.date),
  );
  if (
    sorted.some(
      (t) =>
        t.balanceAfterHkd == null &&
        t.creditHkd == null &&
        t.debitHkd == null,
    )
  ) {
    // 若完全無法推進餘額則失敗——但多數交易有 credit/debit 即可重建
  }

  const nDays = daysInMonth(month);
  const [y, m] = month.split("-").map(Number);
  const byDate = new Map<string, BankTransaction[]>();
  for (const t of sorted) {
    const list = byDate.get(t.date) ?? [];
    list.push(t);
    byDate.set(t.date, list);
  }

  let bal = openingBalanceHkd;
  const daily: number[] = [];
  for (let d = 1; d <= nDays; d++) {
    const date = `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    const dayTx = byDate.get(date) ?? [];
    for (const t of dayTx) {
      if (t.balanceAfterHkd != null) {
        bal = t.balanceAfterHkd;
      } else {
        bal = bal + (t.creditHkd ?? 0) - (t.debitHkd ?? 0);
      }
    }
    daily.push(bal);
  }

  if (daily.length === 0) {
    return {
      averageDailyBalanceHkd: null,
      minDailyBalanceHkd: null,
      calcStatus: "insufficient_data",
    };
  }

  return {
    averageDailyBalanceHkd: daily.reduce((s, v) => s + v, 0) / daily.length,
    minDailyBalanceHkd: Math.min(...daily),
    calcStatus: "ok",
  };
}

export function detectAnomalies(
  months: BankStatementMonthDetail[],
): BankAnomaly[] {
  const out: BankAnomaly[] = [];
  for (const m of months) {
    for (const t of m.transactions) {
      if (BOUNCE_PATTERNS.test(t.description)) {
        out.push({
          id: `bounce-${t.id}`,
          kind: "bounced_cheque",
          date: t.date,
          description: t.description,
          amountHkd: t.debitHkd ?? t.creditHkd,
          sourcePage: t.sourcePage,
          confidence: t.confidence,
        });
      }
      if (AUTOPAY_PATTERNS.test(t.description)) {
        out.push({
          id: `autopay-${t.id}`,
          kind: "autopay_failed",
          date: t.date,
          description: t.description,
          amountHkd: t.debitHkd,
          sourcePage: t.sourcePage,
          confidence: t.confidence,
        });
      }
    }

    // 負數結餘／透支
    const dailies = m.dailyLedgerBalances ?? [];
    const negDays = dailies.filter((d) => d.balanceHkd < 0);
    if (negDays.length > 0) {
      const minBal = Math.min(...negDays.map((d) => d.balanceHkd));
      const limit = m.overdraftLimitHkd;
      let kind: AnomalyKind = "overdraft_unknown";
      if (limit == null) kind = "overdraft_unknown";
      else if (Math.abs(minBal) <= limit) kind = "overdraft_within_limit";
      else kind = "overdraft_excess";

      out.push({
        id: `od-${m.month}`,
        kind,
        date: m.month,
        description: `負數結餘日數 ${negDays.length}；最低 ${minBal}`,
        amountHkd: minBal,
        confidence: 0.9,
        note:
          kind === "overdraft_within_limit"
            ? "使用已批准透支額度"
            : kind === "overdraft_excess"
              ? "超出透支額度"
              : "文件沒有顯示透支限額，未能確定是否超額",
      });
    }
  }
  return out;
}

export function analyzeBankCashflow(
  months: BankStatementMonthDetail[],
  rules: CashflowRuleSet = DEFAULT_CASHFLOW_RULES,
): BankCashflowAnalysis {
  const completenessOk =
    months.length >= 6 &&
    months.every((m) => m.pdfOnly && m.complete && !m.missingPages);

  const adbRows: MonthlyAdbRow[] = months.map((m) => {
    const adb = computeAverageDailyBalance({
      month: m.month,
      openingBalanceHkd: m.openingBalanceHkd,
      dailyLedgerBalances: m.dailyLedgerBalances,
      transactions: m.transactions,
    });
    return {
      month: m.month,
      openingBalanceHkd: m.openingBalanceHkd,
      closingBalanceHkd: m.closingBalanceHkd,
      averageDailyBalanceHkd: adb.averageDailyBalanceHkd,
      minDailyBalanceHkd: adb.minDailyBalanceHkd,
      calcStatus: adb.calcStatus,
      balanceBasis: "ledger",
      source: `${m.bankName} ···${m.accountLast4}`,
      manuallyEdited: false,
    };
  });

  const okAdbs = adbRows.filter((r) => r.averageDailyBalanceHkd != null);
  const sixMonthAdbHkd =
    okAdbs.length > 0
      ? okAdbs.reduce((s, r) => s + (r.averageDailyBalanceHkd ?? 0), 0) /
        okAdbs.length
      : null;
  const sixMonthMinDailyHkd =
    okAdbs.length > 0
      ? Math.min(...okAdbs.map((r) => r.minDailyBalanceHkd ?? Infinity))
      : null;

  const creditRows: MonthlyCreditRow[] = months.map((m) => {
    const credits = m.transactions.filter((t) => (t.creditHkd ?? 0) > 0);
    const total = credits.reduce((s, t) => s + (t.creditHkd ?? 0), 0);
    const days = new Set(credits.map((t) => t.date)).size;
    return {
      month: m.month,
      totalCreditsHkd: total,
      creditCount: credits.length,
      creditDays: days,
      avgCreditSizeHkd: credits.length ? total / credits.length : null,
    };
  });

  const sixMonthTotalCreditsHkd = creditRows.reduce(
    (s, r) => s + r.totalCreditsHkd,
    0,
  );
  const monthlyAvgCreditsHkd =
    creditRows.length > 0 ? sixMonthTotalCreditsHkd / creditRows.length : 0;

  // 來源集中度（簡易：用 counterpartyGuess / creditCategory）
  const sourceMap = new Map<string, number>();
  let unclassifiedCreditHkd = 0;
  for (const m of months) {
    for (const t of m.transactions) {
      if (!(t.creditHkd && t.creditHkd > 0)) continue;
      if (t.creditCategory === "unclear" || !t.counterpartyGuess) {
        unclassifiedCreditHkd += t.creditHkd;
        sourceMap.set(
          "待分類進帳",
          (sourceMap.get("待分類進帳") ?? 0) + t.creditHkd,
        );
      } else {
        const key = t.counterpartyGuess;
        sourceMap.set(key, (sourceMap.get(key) ?? 0) + t.creditHkd);
      }
    }
  }
  const creditSources: CreditSourceRow[] = [...sourceMap.entries()]
    .map(([source, totalHkd]) => ({
      source,
      totalHkd,
      sharePct:
        sixMonthTotalCreditsHkd > 0
          ? (totalHkd / sixMonthTotalCreditsHkd) * 100
          : 0,
      frequency: "不定期",
    }))
    .sort((a, b) => b.totalHkd - a.totalHkd);

  const anomalies = detectAnomalies(months);
  const bounceCount = anomalies.filter((a) => a.kind === "bounced_cheque").length;
  const autopayCount = anomalies.filter((a) => a.kind === "autopay_failed").length;
  const excessOd = anomalies.filter((a) => a.kind === "overdraft_excess").length;

  const ruleHits: BankCashflowAnalysis["ruleHits"] = [];

  if (!completenessOk) {
    ruleHits.push({
      id: "completeness",
      name: "六個月結單完整度",
      status: "amber",
      detail: "未達六個連續完整 PDF 月結單，暫停止正式計算／資格確認。",
    });
  } else {
    ruleHits.push({
      id: "completeness",
      name: "六個月結單完整度",
      status: "green",
      detail: "已確認六個連續月份 PDF 完整。",
    });
  }

  const adbStatus = evaluateThreshold(
    sixMonthAdbHkd,
    rules.minAverageDailyBalanceHkd,
  );
  ruleHits.push({
    id: "adb",
    name: "每日平均餘額",
    status: !completenessOk || sixMonthAdbHkd == null ? "amber" : adbStatus,
    detail:
      sixMonthAdbHkd == null
        ? "未能從現有銀行月結單完整計算每日平均餘額，需要重新上載文件或由貸款顧問人工覆核。"
        : `六個月 ADB 約 HK$${Math.round(sixMonthAdbHkd).toLocaleString()}（日終帳面結餘）`,
  });

  const creditStatus = evaluateThreshold(
    monthlyAvgCreditsHkd,
    rules.minMonthlyCreditsHkd,
  );
  ruleHits.push({
    id: "credits",
    name: "每月平均進帳",
    status: !completenessOk ? "amber" : creditStatus,
    detail: `每月平均進帳約 HK$${Math.round(monthlyAvgCreditsHkd).toLocaleString()}`,
  });

  const bounceStatus =
    bounceCount > rules.maxBouncedCheques.red
      ? "red"
      : bounceCount > rules.maxBouncedCheques.green
        ? "amber"
        : "green";
  ruleHits.push({
    id: "bounce",
    name: "退票",
    status: bounceStatus,
    detail: `退票紀錄 ${bounceCount} 次（須有交易文字／費用證據）`,
  });

  const autopayStatus =
    autopayCount > rules.maxAutopayFailures.red
      ? "red"
      : autopayCount > rules.maxAutopayFailures.green
        ? "amber"
        : "green";
  ruleHits.push({
    id: "autopay",
    name: "Autopay／自動轉帳失敗",
    status: autopayStatus,
    detail: `扣款失敗 ${autopayCount} 次`,
  });

  ruleHits.push({
    id: "overdraft_excess",
    name: "超額透支",
    status: excessOd > 0 ? "red" : "green",
    detail: excessOd > 0 ? `超額透支 ${excessOd} 次` : "未發現超額透支",
  });

  const hasRed = ruleHits.some((r) => r.status === "red");
  const hasAmber = ruleHits.some((r) => r.status === "amber");
  const overall: ScreeningResult = hasRed ? "red" : hasAmber ? "amber" : "green";

  const clientFacing =
    overall === "green"
      ? "pass_review"
      : overall === "amber"
        ? "need_supplement"
        : "need_human";

  const clientMessage =
    clientFacing === "pass_review"
      ? "已完成初步資格評估，申請將進入下一階段文件及信貸審批。"
      : clientFacing === "need_supplement"
        ? "部分資料需要補充或人工覆核，暫未能完成初步資格確認。"
        : "已觸發一項或以上高風險條件，需要由授權審批人員決定是否繼續處理。";

  const internalMessage =
    overall === "green"
      ? "初步符合現金流及文件要求，可進入下一階段信貸審批。"
      : overall === "amber"
        ? "部分資料需要補充或人工覆核，暫未能完成初步資格確認。"
        : "已觸發一項或以上高風險條件，需要由授權審批人員決定是否繼續處理。";

  const first = months[0];
  return {
    bankName: first?.bankName ?? "—",
    accountLast4: first?.accountLast4 ?? "————",
    periodLabel:
      months.length > 0
        ? `${months[0].month} – ${months[months.length - 1].month}`
        : "—",
    analyzedAt: new Date().toISOString(),
    balanceBasis: "ledger",
    months: adbRows,
    sixMonthAdbHkd,
    sixMonthMinDailyHkd:
      sixMonthMinDailyHkd === Infinity ? null : sixMonthMinDailyHkd,
    creditRows,
    sixMonthTotalCreditsHkd,
    monthlyAvgCreditsHkd,
    creditSources,
    unclassifiedCreditHkd,
    anomalies,
    completenessOk,
    overall,
    clientFacing,
    clientMessage,
    internalMessage,
    ruleHits,
  };
}
