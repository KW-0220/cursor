import type { ScreeningResult } from "./types";

/** 門檻三色（後台可配置，不可寫死在畫面文案） */
export interface ThresholdBand {
  /** ≥ green → 綠；≥ amber 且 < green → 黃；< amber → 紅 */
  green: number;
  amber: number;
}

export interface CountBand {
  /** ≤ green 可接受；≤ red 為黃；> red 為紅 */
  green: number;
  red: number;
}

export interface CashflowRuleSet {
  id: string;
  name: string;
  product: string;
  effectiveFrom: string;
  minAverageDailyBalanceHkd: ThresholdBand;
  minMonthlyCreditsHkd: ThresholdBand;
  minMonthlyCreditCount: ThresholdBand;
  maxSingleSourceConcentrationPct: ThresholdBand;
  maxBouncedCheques: CountBand;
  maxAutopayFailures: CountBand;
  maxExcessOverdraftEvents: CountBand;
  updatedBy: string;
  updateReason: string;
}

/** 預設規則（示範）；正式環境由後台「銀行現金流審批規則」覆寫 */
export const DEFAULT_CASHFLOW_RULES: CashflowRuleSet = {
  id: "cf-rules-default",
  name: "預設中小企無抵押現金流初篩",
  product: "unsecured",
  effectiveFrom: "2026-01-01",
  minAverageDailyBalanceHkd: { green: 150_000, amber: 80_000 },
  minMonthlyCreditsHkd: { green: 500_000, amber: 250_000 },
  minMonthlyCreditCount: { green: 20, amber: 10 },
  maxSingleSourceConcentrationPct: { green: 40, amber: 60 },
  maxBouncedCheques: { green: 0, red: 2 },
  maxAutopayFailures: { green: 1, red: 3 },
  maxExcessOverdraftEvents: { green: 0, red: 1 },
  updatedBy: "system",
  updateReason: "MVP 預設",
};

export function evaluateThreshold(
  value: number | null,
  band: ThresholdBand,
): ScreeningResult {
  if (value == null) return "amber";
  if (value >= band.green) return "green";
  if (value >= band.amber) return "amber";
  return "red";
}
