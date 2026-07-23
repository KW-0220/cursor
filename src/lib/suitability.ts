export type SuitabilityStatus = "Suitable" | "NotSuitable" | "Incomplete";

export interface SuitabilityInput {
  /** 公司營運年期（年） */
  companyAge: number | null;
  /** 平均每月營業額（HKD） */
  monthlyRevenue: number | null;
  /** 負債比率（%），例如 45 代表 45% */
  debtRatio: number | null;
}

export interface SuitabilityCheck {
  id: "companyAge" | "monthlyRevenue" | "debtRatio";
  label: string;
  requirement: string;
  actual: string;
  pass: boolean | null;
}

export interface SuitabilityResult {
  status: SuitabilityStatus;
  checks: SuitabilityCheck[];
  thresholds: typeof SUITABILITY_THRESHOLDS;
  input: SuitabilityInput;
  /** 客戶端中性文案 — 不可承諾批核 */
  clientMessage: string;
  disclaimer: string;
}

/** 初步適合度門檻（非正式批核） */
export const SUITABILITY_THRESHOLDS = {
  minCompanyAgeYears: 2,
  minMonthlyRevenueHkd: 100_000,
  maxDebtRatioPct: 50,
} as const;

/**
 * if (companyAge >= 2 && monthlyRevenue >= 100000 && debtRatio < 50)
 *   status = "Suitable"
 */
export function evaluateSuitability(
  input: SuitabilityInput,
): SuitabilityResult {
  const { minCompanyAgeYears, minMonthlyRevenueHkd, maxDebtRatioPct } =
    SUITABILITY_THRESHOLDS;

  const agePass =
    input.companyAge == null ? null : input.companyAge >= minCompanyAgeYears;
  const revenuePass =
    input.monthlyRevenue == null
      ? null
      : input.monthlyRevenue >= minMonthlyRevenueHkd;
  const debtPass =
    input.debtRatio == null ? null : input.debtRatio < maxDebtRatioPct;

  const checks: SuitabilityCheck[] = [
    {
      id: "companyAge",
      label: "公司營運年期",
      requirement: `≥ ${minCompanyAgeYears} 年`,
      actual:
        input.companyAge == null ? "未提供" : `${input.companyAge} 年`,
      pass: agePass,
    },
    {
      id: "monthlyRevenue",
      label: "平均每月營業額",
      requirement: `≥ HK$${minMonthlyRevenueHkd.toLocaleString()}`,
      actual:
        input.monthlyRevenue == null
          ? "未提供"
          : `HK$${Math.round(input.monthlyRevenue).toLocaleString()}`,
      pass: revenuePass,
    },
    {
      id: "debtRatio",
      label: "負債比率",
      requirement: `< ${maxDebtRatioPct}%`,
      actual: input.debtRatio == null ? "未提供" : `${input.debtRatio}%`,
      pass: debtPass,
    },
  ];

  const incomplete = checks.some((c) => c.pass === null);
  const allPass = checks.every((c) => c.pass === true);

  let status: SuitabilityStatus;
  if (incomplete) status = "Incomplete";
  else if (allPass) status = "Suitable";
  else status = "NotSuitable";

  const clientMessage =
    status === "Suitable"
      ? "按系統初步條件，資料符合適合度門檻，可交貸款顧問繼續預審。此結果不代表正式批核。"
      : status === "Incomplete"
        ? "尚缺公司年期、每月營業額或負債比率，暫未能完成初步適合度評估。"
        : "按系統初步條件，目前未全部達標。可補件或聯絡顧問進一步了解，此結果不代表拒絕批核。";

  return {
    status,
    checks,
    thresholds: SUITABILITY_THRESHOLDS,
    input,
    clientMessage,
    disclaimer:
      "此為初步適合度評估，非正式貸款批核。最終審批由貸款顧問及相關金融機構決定。",
  };
}

/** Demo：三項達標 → Suitable */
export function getDemoSuitable(): SuitabilityResult {
  return evaluateSuitability({
    companyAge: 3,
    monthlyRevenue: 180_000,
    debtRatio: 35,
  });
}
