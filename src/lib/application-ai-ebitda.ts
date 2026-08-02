import "server-only";
import type { ApplicationAiAnalysis } from "@/lib/ai-application-decision";
import { applyHardcodedEbitdaFormulas } from "@/lib/financial-extract";
import {
  dscr,
  FORMULA_DEFINITIONS,
} from "@/lib/formulas";

function asNum(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim() && Number.isFinite(Number(v))) {
    return Number(v);
  }
  return null;
}

function asObj(v: unknown): Record<string, unknown> | null {
  return v && typeof v === "object" && !Array.isArray(v)
    ? (v as Record<string, unknown>)
    : null;
}

/** 由文件分析歸檔 payload 抽出 EBITDA 區塊（給舊案件報告補齊） */
export function ebitdaFromArchivePayload(
  payload: Record<string, unknown> | null | undefined,
): ApplicationAiAnalysis["ebitda"] {
  if (!payload) return null;

  const nested = asObj(payload.ebitdaAnalysis) ?? asObj(payload.ebitda);
  const extract =
    asObj(payload.extract) ??
    asObj(payload.financialExtract) ??
    payload;

  const componentsSrc = asObj(nested?.components) ?? extract;
  const earningBeforeTax =
    asNum(componentsSrc?.earning_before_tax) ??
    asNum(componentsSrc?.earningBeforeTax) ??
    asNum(extract.earning_before_tax) ??
    asNum(extract.profit_before_tax);
  const interest =
    asNum(componentsSrc?.interest) ??
    asNum(componentsSrc?.finance_costs) ??
    asNum(extract.interest) ??
    asNum(extract.finance_costs);
  const tax = asNum(componentsSrc?.tax) ?? asNum(extract.tax);
  const depreciation =
    asNum(componentsSrc?.depreciation) ?? asNum(extract.depreciation);
  const amortisation =
    asNum(componentsSrc?.amortisation) ?? asNum(extract.amortisation) ?? 0;
  const netProfit =
    asNum(extract.net_profit) ?? asNum(extract.netProfit);
  const totalDebt =
    asNum(nested?.totalDebtPayments) ??
    asNum(nested?.totalDebtPaymentsHkd) ??
    asNum(extract.total_debt_payments);

  const { extract: normalized, ebitdaAnalysis } = applyHardcodedEbitdaFormulas({
    company_name:
      typeof extract.company_name === "string" ? extract.company_name : null,
    financial_year:
      extract.financial_year == null ? null : String(extract.financial_year),
    revenue: asNum(extract.revenue),
    EBITDA: asNum(extract.EBITDA) ?? asNum(nested?.ebitdaComputed),
    net_profit: netProfit,
    existing_debt: asNum(extract.existing_debt),
    earning_before_tax: earningBeforeTax,
    interest,
    tax,
    depreciation,
    amortisation,
    total_debt_payments: totalDebt,
  });

  const hasAny =
    ebitdaAnalysis.ebitdaComputed != null ||
    earningBeforeTax != null ||
    interest != null ||
    tax != null ||
    depreciation != null ||
    totalDebt != null;
  if (!hasAny) return null;

  return {
    formula: ebitdaAnalysis.formula || FORMULA_DEFINITIONS.ebitda,
    coverageRule:
      ebitdaAnalysis.coverageRule || FORMULA_DEFINITIONS.ebitdaDebtCover,
    ebitdaHkd: ebitdaAnalysis.ebitdaComputed,
    ebitdaSource: ebitdaAnalysis.ebitdaSource,
    totalDebtPaymentsHkd: ebitdaAnalysis.totalDebtPayments,
    coversDebtPayments: ebitdaAnalysis.coversDebtPayments,
    dscr: dscr(
      ebitdaAnalysis.ebitdaComputed,
      ebitdaAnalysis.totalDebtPayments,
    ),
    components: {
      earningBeforeTax: ebitdaAnalysis.components.earning_before_tax,
      interest: ebitdaAnalysis.components.interest,
      tax: ebitdaAnalysis.components.tax,
      depreciation: ebitdaAnalysis.components.depreciation,
      amortisation: ebitdaAnalysis.components.amortisation,
      netProfit: normalized.net_profit,
    },
  };
}
