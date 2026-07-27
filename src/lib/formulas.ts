/**
 * 已定義計數公式（硬編碼唯一來源）
 * AI 只可抽取原始欄位；衍生指標一律用本檔公式重算，避免估錯。
 *
 * 定義一覽：
 * - 淨現金流 = 存入總額 − 提取總額
 * - ADB = 日終結餘總和 ÷ 日數（有日結餘序列時）
 * - 初步物業淨值 = max(0, 估值 − 現有按揭／融資)
 * - 總 LTV = (現有按揭 + 新申請額) ÷ 估值
 * - 新貸 LTV = 新申請額 ÷ 估值
 * - 有形淨資產 TNW = 權益 − 無形資產 − 商譽
 * - Gearing = 總負債 ÷ TNW
 * - EBITDA = 除稅前溢利 + 融資成本 + 折舊 + 攤銷（或取文件披露值）
 * - 年化債務供款 = Σ(月供 × 12)
 * - DSCR = EBITDA ÷ 年化債務供款
 * - YoY = (本期 − 上期) ÷ 上期
 * - 平均每月營業額 = Σ月入賬 ÷ 月數
 * - 佔比 = 部分 ÷ 總額 × 100
 */

export const FORMULA_DEFINITIONS = {
  netCashflow: "淨現金流 = total_credits − total_debits",
  adb: "每日平均餘額 ADB = Σ日終結餘 ÷ 日數",
  minDaily: "最低日結餘 = min(日終結餘)",
  propertyNetEquity: "初步物業淨值 = max(0, 估值 − 現有按揭／融資餘額)",
  totalLtv: "總 LTV = (現有按揭餘額 + 新申請額) ÷ 估值",
  newLoanLtv: "新貸 LTV = 新申請額 ÷ 估值",
  tangibleNetWorth: "有形淨資產 TNW = 權益 − 無形資產 − 商譽",
  gearing: "槓桿 Gearing = 總負債 ÷ TNW",
  ebitda: "EBITDA = 除稅前溢利 + 融資成本 + 折舊 + 攤銷",
  annualDebtService: "年化債務供款 = Σ(每月供款 × 12)",
  dscr: "DSCR = EBITDA ÷ 年化債務供款",
  yoy: "按年變動 YoY = (本期 − 上期) ÷ 上期",
  avgMonthlyTurnover: "平均每月營業額 = Σ月入賬總額 ÷ 月數",
  sharePct: "佔比% = 部分金額 ÷ 總額 × 100",
} as const;

/** 淨現金流 */
export function netCashflow(
  totalCredits: number | null | undefined,
  totalDebits: number | null | undefined,
): number | null {
  if (totalCredits == null || totalDebits == null) return null;
  return totalCredits - totalDebits;
}

/** 由日結餘序列計 ADB（缺資料回 null，不估算） */
export function adbFromDailyBalances(
  daily:
    | Array<{ balance_hkd?: number | null; balanceHkd?: number | null } | number>
    | null
    | undefined,
): number | null {
  const vals = normalizeDailyBalances(daily);
  if (!vals.length) return null;
  return vals.reduce((a, b) => a + b, 0) / vals.length;
}

export function minDailyFromBalances(
  daily:
    | Array<{ balance_hkd?: number | null; balanceHkd?: number | null } | number>
    | null
    | undefined,
): number | null {
  const vals = normalizeDailyBalances(daily);
  if (!vals.length) return null;
  return Math.min(...vals);
}

function normalizeDailyBalances(
  daily:
    | Array<{ balance_hkd?: number | null; balanceHkd?: number | null } | number>
    | null
    | undefined,
): number[] {
  if (!daily?.length) return [];
  return daily
    .map((d) => {
      if (typeof d === "number") return d;
      const n = d.balance_hkd ?? d.balanceHkd;
      return n == null || !Number.isFinite(n) ? null : n;
    })
    .filter((n): n is number => n != null);
}

/** 初步物業／資產淨值 */
export function propertyNetEquity(
  estimatedValue: number,
  existingOutstanding: number,
): number {
  return Math.max(0, estimatedValue - existingOutstanding);
}

/** 總 LTV（含現有按揭 + 新申請） */
export function totalLtv(
  existingOutstanding: number,
  newLoanAmount: number,
  estimatedValue: number,
): number | null {
  if (!estimatedValue || estimatedValue <= 0) return null;
  return (existingOutstanding + newLoanAmount) / estimatedValue;
}

/** 新貸 LTV（僅新申請 ÷ 估值） */
export function newLoanLtv(
  newLoanAmount: number,
  estimatedValue: number,
): number | null {
  if (!estimatedValue || estimatedValue <= 0) return null;
  return newLoanAmount / estimatedValue;
}

/** 現有按揭成數（僅現有餘額 ÷ 估值） */
export function existingLtv(
  existingOutstanding: number,
  estimatedValue: number,
): number | null {
  if (!estimatedValue || estimatedValue <= 0) return null;
  return existingOutstanding / estimatedValue;
}

export function tangibleNetWorth(
  equityHkd: number | null | undefined,
  intangibleHkd: number | null | undefined = 0,
  goodwillHkd: number | null | undefined = 0,
): number | null {
  if (equityHkd == null) return null;
  return equityHkd - (intangibleHkd ?? 0) - (goodwillHkd ?? 0);
}

export function gearingRatio(
  totalLiabilitiesHkd: number | null | undefined,
  tnw: number | null | undefined,
): number | null {
  if (totalLiabilitiesHkd == null || tnw == null) return null;
  if (tnw <= 0) return Number.POSITIVE_INFINITY;
  return totalLiabilitiesHkd / tnw;
}

/** 由組成項目計 EBITDA；缺任一組成則 null */
export function ebitdaFromComponents(
  profitBeforeTaxHkd: number | null | undefined,
  financeCostsHkd: number | null | undefined,
  depreciationHkd: number | null | undefined,
  amortisationHkd: number | null | undefined,
): number | null {
  if (
    profitBeforeTaxHkd == null ||
    financeCostsHkd == null ||
    depreciationHkd == null ||
    amortisationHkd == null
  ) {
    return null;
  }
  return (
    profitBeforeTaxHkd + financeCostsHkd + depreciationHkd + amortisationHkd
  );
}

export function annualDebtServiceFromMonthly(
  monthlyPayments: Array<number | null | undefined>,
): number | null {
  if (!monthlyPayments.length) return 0;
  if (monthlyPayments.some((p) => p == null)) return null;
  return monthlyPayments.reduce<number>((s, p) => s + (p as number) * 12, 0);
}

export function dscr(
  ebitdaHkd: number | null | undefined,
  annualDebtServiceHkd: number | null | undefined,
): number | null {
  if (ebitdaHkd == null || annualDebtServiceHkd == null) return null;
  if (annualDebtServiceHkd <= 0) return null;
  return ebitdaHkd / annualDebtServiceHkd;
}

export function yoyChange(
  previous: number,
  current: number,
): number | null {
  if (previous === 0) return null;
  return (current - previous) / previous;
}

export function avgMonthlyTurnover(
  monthlyCredits: Array<number | null | undefined>,
): number | null {
  const xs = monthlyCredits.filter((n): n is number => n != null);
  if (!xs.length) return null;
  return xs.reduce((a, b) => a + b, 0) / xs.length;
}

export function sharePct(
  part: number,
  total: number,
): number {
  if (total <= 0) return 0;
  return (part / total) * 100;
}

export function sumNumbers(
  nums: Array<number | null | undefined>,
): number | null {
  const xs = nums.filter((n): n is number => n != null);
  if (!xs.length) return null;
  return xs.reduce((a, b) => a + b, 0);
}

export function avgNumbers(
  nums: Array<number | null | undefined>,
): number | null {
  const xs = nums.filter((n): n is number => n != null);
  if (!xs.length) return null;
  return xs.reduce((a, b) => a + b, 0) / xs.length;
}

/**
 * 銀行月結：用硬編碼公式覆蓋可衍生欄位
 * - net_cashflow 永遠由 credits−debits 重算（兩邊齊先計）
 * - 有 daily_balances 則重算 ADB／最低日結
 */
export function applyHardcodedBankFormulas<T extends {
  total_credits?: number | null;
  total_debits?: number | null;
  net_cashflow?: number | null;
  average_daily_balance?: number | null;
  min_daily_balance?: number | null;
  daily_balances?: Array<{ balance_hkd?: number | null; balanceHkd?: number | null } | number>;
}>(extract: T): T {
  const next = { ...extract };
  const computedNet = netCashflow(next.total_credits, next.total_debits);
  if (computedNet != null) {
    next.net_cashflow = computedNet;
  }

  const adb = adbFromDailyBalances(next.daily_balances);
  const minD = minDailyFromBalances(next.daily_balances);
  if (adb != null) next.average_daily_balance = adb;
  if (minD != null) next.min_daily_balance = minD;

  return next;
}
