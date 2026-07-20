import type {
  AuditExtract,
  CustomerDeclarations,
  DeclaredDebt,
  PolicyEvaluation,
} from "./policy";
import { evaluatePolicy } from "./policy";

export const demoAudits: AuditExtract[] = [
  {
    year: "2023",
    revenueHkd: 12800000,
    totalLiabilitiesHkd: 5200000,
    equityHkd: 3200000,
    intangibleHkd: 150000,
    goodwillHkd: 0,
    profitBeforeTaxHkd: 1100000,
    financeCostsHkd: 280000,
    depreciationHkd: 360000,
    amortisationHkd: 80000,
    ebitdaDisclosedHkd: null,
    sourcePages: [8, 18, 24],
    currency: "HKD",
    litigationHits: [],
    creditRiskHits: [],
    confidence: 0.9,
  },
  {
    year: "2024",
    revenueHkd: 14500000,
    totalLiabilitiesHkd: 5600000,
    equityHkd: 3850000,
    intangibleHkd: 180000,
    goodwillHkd: 0,
    profitBeforeTaxHkd: 1350000,
    financeCostsHkd: 300000,
    depreciationHkd: 380000,
    amortisationHkd: 90000,
    ebitdaDisclosedHkd: null,
    sourcePages: [9, 19, 25],
    currency: "HKD",
    litigationHits: [],
    creditRiskHits: [],
    confidence: 0.88,
  },
  {
    year: "2025",
    revenueHkd: 16200000,
    totalLiabilitiesHkd: 6000000,
    equityHkd: 2500000,
    intangibleHkd: 200000,
    goodwillHkd: 0,
    profitBeforeTaxHkd: 1500000,
    financeCostsHkd: 300000,
    depreciationHkd: 400000,
    amortisationHkd: 100000,
    ebitdaDisclosedHkd: null,
    sourcePages: [12, 18, 24, 26, 31],
    currency: "HKD",
    litigationHits: [],
    creditRiskHits: [],
    confidence: 0.92,
  },
];

export const demoDebts: DeclaredDebt[] = [
  {
    id: "d1",
    lender: "銀行 A",
    type: "定期貸款",
    facilityHkd: 1000000,
    outstandingHkd: 620000,
    monthlyPaymentHkd: 50000,
  },
  {
    id: "d2",
    lender: "銀行 B",
    type: "其他",
    facilityHkd: 400000,
    outstandingHkd: 180000,
    monthlyPaymentHkd: 25000,
  },
];

export const demoDeclarations: CustomerDeclarations = {
  operatingOverOneYear: "yes",
  restrictedIndustry: "no",
  personalGuarantee: "yes",
  unsecuredLimitAck: "agree",
  collateralAvailable: "na_unsecured",
};

export function getDemoPolicyEvaluation(overrides?: {
  unknownDebtPayments?: boolean;
  noExistingDebt?: boolean;
  redDscr?: boolean;
}): PolicyEvaluation {
  const debts = overrides?.redDscr
    ? demoDebts.map((d) => ({
        ...d,
        monthlyPaymentHkd: (d.monthlyPaymentHkd ?? 0) * 5,
      }))
    : demoDebts;

  return evaluatePolicy({
    loanType: "unsecured",
    amountHkd: 1500000,
    audits: demoAudits,
    debts: overrides?.noExistingDebt ? [] : debts,
    noExistingDebt: !!overrides?.noExistingDebt,
    unknownDebtPayments: !!overrides?.unknownDebtPayments,
    declarations: demoDeclarations,
  });
}
