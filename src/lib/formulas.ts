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
 * - EBITDA = Earning before tax + Interest + Tax + Depreciation + Amortisation
 *   （權威來源：Audited Financial Statements；D&A 多數喺 Cash Flow／Notes）
 * - 年化債務供款 Total Debt payments = Σ(月供 × 12)
 * - 覆蓋規則：EBITDA > Total Debt payments（硬規則；同時可算 DSCR = EBITDA ÷ Total Debt payments）
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
  ebitda:
    "EBITDA = Earning before tax + Interest + Tax + Depreciation + Amortisation（Audited Report）",
  ebitdaSources:
    "來源：損益表 Earning before tax／Interest／Tax；折舊與攤銷優先 Cash Flow Statement 或 Notes to the Financial Statements",
  annualDebtService: "Total Debt payments（年化）= Σ(每月供款 × 12)",
  ebitdaDebtCover: "硬規則：EBITDA > Total Debt payments",
  dscr: "DSCR = EBITDA ÷ Total Debt payments",
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

/**
 * 若缺 EBT，用 Net Profit + Tax 回推（期間稅項已知時）。
 */
export function resolveEarningBeforeTax(
  earningBeforeTaxHkd: number | null | undefined,
  netProfitHkd: number | null | undefined = null,
  taxExpenseHkd: number | null | undefined = null,
): number | null {
  if (earningBeforeTaxHkd != null) return earningBeforeTaxHkd;
  if (netProfitHkd != null && taxExpenseHkd != null) {
    return netProfitHkd + taxExpenseHkd;
  }
  return null;
}

/**
 * EBITDA（權威算法，以 Audited Financial Statements 為準）=
 *   Earning before tax + Interest + Tax + Depreciation + Amortisation
 *
 * - Earning before tax／Interest／Tax：損益表
 * - Depreciation & Amortisation：多數唔喺損益表單獨一行，優先 Cash Flow／Notes
 * - AI 只抽組成項；本函數係唯一計法
 * - amortisation 缺省當 0；若只有合併 D&A，可全部放入 depreciation
 */
export function ebitdaFromComponents(
  earningBeforeTaxHkd: number | null | undefined,
  interestExpenseHkd: number | null | undefined,
  taxExpenseHkd: number | null | undefined,
  depreciationHkd: number | null | undefined,
  amortisationHkd: number | null | undefined = 0,
): number | null {
  if (
    earningBeforeTaxHkd == null ||
    interestExpenseHkd == null ||
    taxExpenseHkd == null ||
    depreciationHkd == null
  ) {
    return null;
  }
  return (
    earningBeforeTaxHkd +
    interestExpenseHkd +
    taxExpenseHkd +
    depreciationHkd +
    (amortisationHkd ?? 0)
  );
}

/**
 * EBITDA（政策／產品說明用；與權威公式一致，可帶 Tax）=
 *   除稅前溢利 + 融資成本 + Tax + 折舊 + 攤銷
 * （若報表已直接披露 EBITDA，優先用披露值）
 */
export function ebitdaFromPbt(
  profitBeforeTaxHkd: number | null | undefined,
  financeCostsHkd: number | null | undefined,
  depreciationHkd: number | null | undefined,
  amortisationHkd: number | null | undefined = 0,
  taxExpenseHkd: number | null | undefined = null,
): number | null {
  if (
    profitBeforeTaxHkd == null ||
    financeCostsHkd == null ||
    depreciationHkd == null ||
    taxExpenseHkd == null
  ) {
    return null;
  }
  return ebitdaFromComponents(
    profitBeforeTaxHkd,
    financeCostsHkd,
    taxExpenseHkd,
    depreciationHkd,
    amortisationHkd,
  );
}

export function annualDebtServiceFromMonthly(
  monthlyPayments: Array<number | null | undefined>,
): number | null {
  if (!monthlyPayments.length) return 0;
  if (monthlyPayments.some((p) => p == null)) return null;
  return monthlyPayments.reduce<number>((s, p) => s + (p as number) * 12, 0);
}

/**
 * 硬規則：EBITDA > Total Debt payments
 * 回傳 null＝資料不足；true／false＝可判斷
 */
export function ebitdaCoversTotalDebtPayments(
  ebitdaHkd: number | null | undefined,
  totalDebtPaymentsHkd: number | null | undefined,
): boolean | null {
  if (ebitdaHkd == null || totalDebtPaymentsHkd == null) return null;
  return ebitdaHkd > totalDebtPaymentsHkd;
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
