export type SuitabilityStatus = "Suitable" | "NotSuitable" | "Incomplete";

/** 初步負債比率（非正式 gearing）= 現有負債 ÷ 月營業額 × 100 */
export function preliminaryDebtRatioPct(
  existingDebtHkd: number,
  monthlyRevenueHkd: number,
): number | null {
  if (monthlyRevenueHkd <= 0) return null;
  return (existingDebtHkd / monthlyRevenueHkd) * 100;
}

export interface SuitabilityInput {
  /** 公司營運年期（年） */
  companyAge: number | null;
  /** 平均每月營業額（HKD） */
  monthlyRevenue: number | null;
  /** 負債比率（%），例如 45 代表 45% */
  debtRatio: number | null;
  /** 現有負債金額（HKD）；若提供且有月營業額，可推算 debtRatio */
  existingDebtHkd?: number | null;
}

export interface SuitabilityCheck {
  id: "companyAge" | "monthlyRevenue" | "debtRatio";
  label: string;
  requirement: string;
  actual: string;
  pass: boolean | null;
}

export interface ClientHighlight {
  label: string;
  ok: boolean;
}

/** 客戶端「AI 初步評估結果」呈現用 */
export interface ClientAssessmentView {
  title: string;
  intro: string;
  facts: { label: string; value: string }[];
  highlights: ClientHighlight[];
  nextStep: string;
  submitLabel: string;
  whatsappLabel: string;
  status: SuitabilityStatus;
}

export interface SuitabilityResult {
  status: SuitabilityStatus;
  checks: SuitabilityCheck[];
  thresholds: typeof SUITABILITY_THRESHOLDS;
  input: SuitabilityInput;
  /** 推算後的負債比率（若由金額／營業額得出） */
  computedDebtRatioPct: number | null;
  existingDebtHkd: number | null;
  /** 客戶端中性文案 — 不可承諾批核 */
  clientMessage: string;
  clientView: ClientAssessmentView;
  disclaimer: string;
}

/** 初步適合度門檻（非正式批核） */
export const SUITABILITY_THRESHOLDS = {
  minCompanyAgeYears: 2,
  minMonthlyRevenueHkd: 100_000,
  maxDebtRatioPct: 50,
} as const;

/** Demo WhatsApp（顧問）；可用 NEXT_PUBLIC_WHATSAPP_URL 覆寫 */
export const DEFAULT_WHATSAPP_URL =
  process.env.NEXT_PUBLIC_WHATSAPP_URL?.trim() ||
  "https://wa.me/85291234567?text=" +
    encodeURIComponent("你好，我想跟進 SME LoanFlow 初步評估結果，安排顧問評估。");

function formatHkdPlain(amount: number) {
  return `HK$${Math.round(amount).toLocaleString("en-HK")}`;
}

function resolveDebtRatio(input: SuitabilityInput): {
  debtRatio: number | null;
  existingDebtHkd: number | null;
} {
  const existingDebtHkd =
    input.existingDebtHkd === undefined ? null : input.existingDebtHkd;

  if (input.debtRatio != null) {
    return { debtRatio: input.debtRatio, existingDebtHkd };
  }

  if (
    existingDebtHkd != null &&
    input.monthlyRevenue != null &&
    input.monthlyRevenue > 0
  ) {
    // 簡化：現有負債 ÷ 月營業額 × 100（初步參考，非正式 gearing）
    return {
      debtRatio: preliminaryDebtRatioPct(existingDebtHkd, input.monthlyRevenue),
      existingDebtHkd,
    };
  }

  return { debtRatio: null, existingDebtHkd };
}

function buildClientView(
  input: SuitabilityInput,
  status: SuitabilityStatus,
  agePass: boolean | null,
  revenuePass: boolean | null,
  existingDebtHkd: number | null,
): ClientAssessmentView {
  const facts: { label: string; value: string }[] = [
    {
      label: "公司成立",
      value: input.companyAge == null ? "—" : `${input.companyAge}年`,
    },
    {
      label: "月營業額",
      value:
        input.monthlyRevenue == null
          ? "—"
          : formatHkdPlain(input.monthlyRevenue),
    },
    {
      label: "現有負債",
      value:
        existingDebtHkd == null ? "—" : formatHkdPlain(existingDebtHkd),
    },
  ];

  const highlights: ClientHighlight[] = [
    {
      label: "公司年期要求",
      ok: agePass === true,
    },
    {
      label: "有穩定收入",
      ok: revenuePass === true,
    },
  ];

  const nextStep =
    status === "Suitable"
      ? "安排專業顧問進一步評估"
      : status === "Incomplete"
        ? "請先補齊公司年期、月營業額或負債資料"
        : "可聯絡顧問了解其他方案或補件後再評估";

  return {
    title: "AI 初步評估結果",
    intro: "根據你提供資料：",
    facts,
    highlights,
    nextStep,
    submitLabel: "提交申請",
    whatsappLabel: "WhatsApp 聯絡",
    status,
  };
}

/**
 * if (companyAge >= 2 && monthlyRevenue >= 100000 && debtRatio < 50)
 *   status = "Suitable"
 */
export function evaluateSuitability(
  input: SuitabilityInput,
): SuitabilityResult {
  const { minCompanyAgeYears, minMonthlyRevenueHkd, maxDebtRatioPct } =
    SUITABILITY_THRESHOLDS;

  const { debtRatio, existingDebtHkd } = resolveDebtRatio(input);
  const resolved: SuitabilityInput = { ...input, debtRatio };

  const agePass =
    resolved.companyAge == null
      ? null
      : resolved.companyAge >= minCompanyAgeYears;
  const revenuePass =
    resolved.monthlyRevenue == null
      ? null
      : resolved.monthlyRevenue >= minMonthlyRevenueHkd;
  const debtPass =
    debtRatio == null ? null : debtRatio < maxDebtRatioPct;

  const checks: SuitabilityCheck[] = [
    {
      id: "companyAge",
      label: "公司營運年期",
      requirement: `≥ ${minCompanyAgeYears} 年`,
      actual:
        resolved.companyAge == null ? "未提供" : `${resolved.companyAge} 年`,
      pass: agePass,
    },
    {
      id: "monthlyRevenue",
      label: "平均每月營業額",
      requirement: `≥ HK$${minMonthlyRevenueHkd.toLocaleString()}`,
      actual:
        resolved.monthlyRevenue == null
          ? "未提供"
          : formatHkdPlain(resolved.monthlyRevenue),
      pass: revenuePass,
    },
    {
      id: "debtRatio",
      label: "負債比率",
      requirement: `< ${maxDebtRatioPct}%`,
      actual:
        debtRatio == null
          ? "未提供"
          : `${debtRatio.toFixed(1)}%` +
            (existingDebtHkd != null
              ? `（負債 ${formatHkdPlain(existingDebtHkd)}）`
              : ""),
      pass: debtPass,
    },
  ];

  const incomplete = checks.some((c) => c.pass === null);
  const allPass = checks.every((c) => c.pass === true);

  let status: SuitabilityStatus;
  if (incomplete) status = "Incomplete";
  else if (allPass) status = "Suitable";
  else status = "NotSuitable";

  const clientView = buildClientView(
    resolved,
    status,
    agePass,
    revenuePass,
    existingDebtHkd,
  );

  const clientMessage =
    status === "Suitable"
      ? "初步符合公司年期及穩定收入要求。建議安排專業顧問進一步評估。此結果不代表正式批核。"
      : status === "Incomplete"
        ? "尚缺資料，暫未能完成初步評估。"
        : "按初步條件暫未全部達標。可聯絡顧問了解，此結果不代表拒絕批核。";

  return {
    status,
    checks,
    thresholds: SUITABILITY_THRESHOLDS,
    input: resolved,
    computedDebtRatioPct: debtRatio,
    existingDebtHkd,
    clientMessage,
    clientView,
    disclaimer:
      "此為 AI 初步評估，非正式貸款批核。最終審批由貸款顧問及相關金融機構決定。",
  };
}

/** Demo：用戶指定案例 → Suitable */
export function getDemoSuitable(): SuitabilityResult {
  return evaluateSuitability({
    companyAge: 3,
    monthlyRevenue: 500_000,
    debtRatio: null,
    existingDebtHkd: 200_000,
  });
}
