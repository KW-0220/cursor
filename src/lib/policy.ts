import type { LoanType, ScreeningResult } from "./types";

export type DataSourceKind = "ai_extract" | "customer_declare" | "system_calc";

export const DATA_SOURCE_LABEL: Record<DataSourceKind, string> = {
  ai_extract: "AI 提取",
  customer_declare: "客戶聲明",
  system_calc: "系統計算",
};

export type PolicyItemStatus = ScreeningResult | "na";

export type DebtFacilityType =
  | "項目貸款"
  | "定期貸款"
  | "循環融資"
  | "透支"
  | "按揭貸款"
  | "貿易融資"
  | "信用卡／商業卡"
  | "其他";

export interface DeclaredDebt {
  id: string;
  lender: string;
  type: DebtFacilityType;
  facilityHkd?: number;
  outstandingHkd: number;
  monthlyPaymentHkd: number | null;
  unknownPayment?: boolean;
}

export interface CustomerDeclarations {
  operatingOverOneYear: "yes" | "no" | null;
  restrictedIndustry: "yes" | "no" | null;
  restrictedIndustryNote?: string;
  personalGuarantee: "yes" | "no" | "no_25pct" | null;
  unsecuredLimitAck: "agree" | "disagree" | "na_secured" | null;
  collateralAvailable: "yes" | "no" | "na_unsecured" | null;
  collateralType?: string;
  collateralValueHkd?: number;
  collateralOutstandingHkd?: number;
  acceptValuation?: boolean;
}

export interface AuditExtract {
  year: string;
  revenueHkd: number | null;
  totalLiabilitiesHkd: number | null;
  equityHkd: number | null;
  intangibleHkd: number | null;
  goodwillHkd: number | null;
  profitBeforeTaxHkd: number | null;
  financeCostsHkd: number | null;
  depreciationHkd: number | null;
  amortisationHkd: number | null;
  ebitdaDisclosedHkd: number | null;
  sourcePages: number[];
  currency: string;
  restated?: boolean;
  litigationHits: string[];
  creditRiskHits: string[];
  confidence: number;
}

export interface PolicyItemResult {
  id: number;
  name: string;
  policyStandard: string;
  actual: string;
  status: PolicyItemStatus;
  dataKinds: DataSourceKind[];
  sources: string[];
  confidence: "高" | "中" | "低";
  riskReason: string;
  suggestedAction: string;
  details?: Record<string, string | number | null>;
}

export interface EbitdaBreakdown {
  mode: "disclosed" | "computed" | "incomplete";
  ebitdaHkd: number | null;
  profitBeforeTaxHkd: number | null;
  financeCostsHkd: number | null;
  depreciationHkd: number | null;
  amortisationHkd: number | null;
  sourcePages: number[];
  note: string;
}

export interface PolicyEvaluationInput {
  loanType: LoanType;
  amountHkd: number;
  audits: AuditExtract[];
  debts: DeclaredDebt[];
  noExistingDebt: boolean;
  unknownDebtPayments: boolean;
  declarations: CustomerDeclarations;
}

export interface PolicyEvaluation {
  overall: ScreeningResult;
  clientFacing: "pass_review" | "need_supplement" | "need_manual";
  clientMessage: string;
  ebitda: EbitdaBreakdown;
  annualDebtServiceHkd: number | null;
  dscr: number | null;
  gearing: number | null;
  tangibleNetWorthHkd: number | null;
  avgMonthlyRevenueHkd: number | null;
  unsecuredMultiple: number | null;
  ltv: number | null;
  items: PolicyItemResult[];
  followUpTasks: string[];
}

function statusRank(s: PolicyItemStatus) {
  if (s === "red") return 3;
  if (s === "amber") return 2;
  if (s === "green") return 1;
  return 0;
}

export function computeOverall(items: PolicyItemResult[]): ScreeningResult {
  const applicable = items.filter((i) => i.status !== "na");
  if (applicable.some((i) => i.status === "red")) return "red";
  if (applicable.some((i) => i.status === "amber")) return "amber";
  return "green";
}

import {
  annualDebtServiceFromMonthly,
  dscr as dscrFormula,
  ebitdaFromComponents,
  gearingRatio,
  newLoanLtv,
  tangibleNetWorth,
  yoyChange as yoyChangeFormula,
} from "./formulas";

export function computeTangibleNetWorth(a: AuditExtract) {
  return tangibleNetWorth(a.equityHkd, a.intangibleHkd, a.goodwillHkd);
}

export function computeGearing(a: AuditExtract) {
  const tnw = computeTangibleNetWorth(a);
  const gearing = gearingRatio(a.totalLiabilitiesHkd, tnw);
  return { gearing, tnw };
}

export function computeEbitda(a: AuditExtract): EbitdaBreakdown {
  if (a.ebitdaDisclosedHkd != null) {
    return {
      mode: "disclosed",
      ebitdaHkd: a.ebitdaDisclosedHkd,
      profitBeforeTaxHkd: a.profitBeforeTaxHkd,
      financeCostsHkd: a.financeCostsHkd,
      depreciationHkd: a.depreciationHkd,
      amortisationHkd: a.amortisationHkd,
      sourcePages: a.sourcePages,
      note: "報告直接披露 EBITDA。",
    };
  }
  const ebitda = ebitdaFromComponents(
    a.profitBeforeTaxHkd,
    a.financeCostsHkd,
    a.depreciationHkd,
    a.amortisationHkd,
  );
  if (ebitda == null) {
    return {
      mode: "incomplete",
      ebitdaHkd: null,
      profitBeforeTaxHkd: a.profitBeforeTaxHkd,
      financeCostsHkd: a.financeCostsHkd,
      depreciationHkd: a.depreciationHkd,
      amortisationHkd: a.amortisationHkd,
      sourcePages: a.sourcePages,
      note: "未能從文件確認完整 EBITDA 組成，需要人工覆核。",
    };
  }
  return {
    mode: "computed",
    ebitdaHkd: ebitda,
    profitBeforeTaxHkd: a.profitBeforeTaxHkd,
    financeCostsHkd: a.financeCostsHkd,
    depreciationHkd: a.depreciationHkd,
    amortisationHkd: a.amortisationHkd,
    sourcePages: a.sourcePages,
    note: "EBITDA＝除稅前溢利＋融資成本＋折舊＋攤銷（系統公式）。",
  };
}

export function annualDebtService(debts: DeclaredDebt[]) {
  if (debts.length === 0) return 0;
  if (debts.some((d) => d.monthlyPaymentHkd == null || d.unknownPayment)) {
    return null;
  }
  return annualDebtServiceFromMonthly(debts.map((d) => d.monthlyPaymentHkd));
}

export function yoyChange(prev: number, next: number) {
  return yoyChangeFormula(prev, next);
}

export function evaluatePolicy(input: PolicyEvaluationInput): PolicyEvaluation {
  const latest = [...input.audits].sort((a, b) => b.year.localeCompare(a.year))[0];
  const followUpTasks: string[] = [];
  const items: PolicyItemResult[] = [];

  // 1 Gearing
  if (!latest || latest.totalLiabilitiesHkd == null || latest.equityHkd == null) {
    items.push({
      id: 1,
      name: "槓桿比率 Gearing Ratio",
      policyStandard: "總負債 ÷ 有形淨資產 < 4.0",
      actual: "未能計算",
      status: "amber",
      dataKinds: ["ai_extract", "system_calc"],
      sources: latest ? [`${latest.year} Audited Report`] : ["Audited Report 不足"],
      confidence: "低",
      riskReason: "AI 未能抽出完整負債／權益數據。",
      suggestedAction: "補件／人工覆核",
    });
  } else {
    const { gearing, tnw } = computeGearing(latest);
    let status: PolicyItemStatus = "green";
    let reason = "Gearing Ratio 符合政策上限。";
    if (tnw != null && tnw <= 0) {
      status = "red";
      reason = "有形淨資產為零或負數。";
    } else if (gearing != null && gearing >= 4) {
      status = "red";
      reason = "Gearing Ratio 不低於 4.0。";
    }
    items.push({
      id: 1,
      name: "槓桿比率 Gearing Ratio",
      policyStandard: "總負債 ÷ 有形淨資產 < 4.0",
      actual: gearing == null || !Number.isFinite(gearing) ? "N/A" : `${gearing.toFixed(2)}x`,
      status,
      dataKinds: ["ai_extract", "system_calc"],
      sources: [`${latest.year} Audited Report，第 ${latest.sourcePages.join("、")} 頁`],
      confidence: latest.confidence >= 0.85 ? "高" : latest.confidence >= 0.6 ? "中" : "低",
      riskReason: reason,
      suggestedAction: status === "green" ? "通過" : "人工覆核",
      details: {
        總負債: latest.totalLiabilitiesHkd,
        股東權益: latest.equityHkd,
        無形資產: latest.intangibleHkd,
        有形淨資產: tnw,
        Gearing: gearing != null && Number.isFinite(gearing) ? Number(gearing.toFixed(2)) : null,
      },
    });
  }

  // 2 DSCR / EBITDA
  const ebitda = latest
    ? computeEbitda(latest)
    : {
        mode: "incomplete" as const,
        ebitdaHkd: null,
        profitBeforeTaxHkd: null,
        financeCostsHkd: null,
        depreciationHkd: null,
        amortisationHkd: null,
        sourcePages: [],
        note: "欠缺審計報告。",
      };

  let annualDebt: number | null = null;
  let dscr: number | null = null;
  let dscrStatus: PolicyItemStatus = "amber";
  let dscrReason = "";
  let dscrAction = "人工覆核";

  if (input.noExistingDebt) {
    annualDebt = 0;
    dscr = null;
    dscrStatus = "green";
    dscrReason = "客戶聲明沒有現有銀行貸款；本階段無已申報債務支出。";
    dscrAction = "通過（請再次確認）";
    followUpTasks.push("要求客戶再次確認沒有現有銀行貸款");
  } else if (input.unknownDebtPayments || annualDebtService(input.debts) == null) {
    annualDebt = null;
    if (ebitda.ebitdaHkd != null && ebitda.ebitdaHkd > 0) {
      dscrStatus = "amber";
      dscrReason = "EBITDA 為正數，但債務資料未完整，需人工跟進。";
      followUpTasks.push("跟進客戶補齊每月供款／債務明細");
    } else {
      dscrStatus = "red";
      dscrReason = "EBITDA 非正數，並缺乏完整債務資料。";
    }
  } else {
    annualDebt = annualDebtService(input.debts);
    if (ebitda.ebitdaHkd == null) {
      dscrStatus = "amber";
      dscrReason = "需要人工從 Audited Report 核實 EBITDA。";
    } else if (annualDebt != null && annualDebt === 0) {
      dscrStatus = "green";
      dscrReason = "已申報債務年度支出為零。";
      dscrAction = "通過";
    } else if (annualDebt != null && annualDebt > 0) {
      dscr = dscrFormula(ebitda.ebitdaHkd, annualDebt);
      if (dscr != null && dscr >= 1) {
        dscrStatus = "green";
        dscrReason = "EBITDA 足以覆蓋一年已申報債務支出。";
        dscrAction = "通過";
      } else {
        dscrStatus = "red";
        dscrReason = "EBITDA 未能覆蓋一年債務支出（DSCR < 1.0）。";
      }
    }
  }

  // Partial debts only filled
  if (!input.noExistingDebt && input.debts.length > 0 && input.debts.some((d) => !d.lender)) {
    dscrStatus = statusRank(dscrStatus) < statusRank("amber") ? "amber" : dscrStatus;
    dscrReason = "債務資料可能不完整。";
  }

  items.push({
    id: 2,
    name: "債務償還能力 DSCR",
    policyStandard: "EBITDA ≥ 一年總債務支出（DSCR ≥ 1.0）",
    actual:
      dscr != null
        ? `${dscr.toFixed(2)}x`
        : input.noExistingDebt
          ? "不適用／無現有債務"
          : "未能完整計算",
    status: dscrStatus,
    dataKinds: ["ai_extract", "customer_declare", "system_calc"],
    sources: [
      latest
        ? `${latest.year} Audited Report，第 ${ebitda.sourcePages.join("、") || "—"} 頁`
        : "Audited Report",
      "客戶銀行借貸及每月供款申報表",
    ],
    confidence: ebitda.mode === "incomplete" ? "低" : "高",
    riskReason: dscrReason,
    suggestedAction: dscrAction,
    details: {
      EBITDA: ebitda.ebitdaHkd,
      一年總債務支出: annualDebt,
      DSCR: dscr != null ? Number(dscr.toFixed(2)) : null,
    },
  });

  // 3 Revenue stability
  const sorted = [...input.audits]
    .filter((a) => a.revenueHkd != null)
    .sort((a, b) => a.year.localeCompare(b.year));
  if (sorted.length < 3) {
    items.push({
      id: 3,
      name: "連續三年營收穩定性",
      policyStandard: "任何一年營收 YoY 波幅不可超過 ±30%",
      actual: `僅有 ${sorted.length} 年數據`,
      status: "amber",
      dataKinds: ["ai_extract", "system_calc"],
      sources: ["最近三年 Audited Report"],
      confidence: "低",
      riskReason: "不足三年審計數據。",
      suggestedAction: "補件",
    });
    followUpTasks.push("補交不足年度的 Audited Report");
  } else {
    const y1 = yoyChange(sorted[0].revenueHkd!, sorted[1].revenueHkd!);
    const y2 = yoyChange(sorted[1].revenueHkd!, sorted[2].revenueHkd!);
    const over =
      y1 == null || y2 == null || Math.abs(y1) > 0.3 || Math.abs(y2) > 0.3;
    items.push({
      id: 3,
      name: "連續三年營收穩定性",
      policyStandard: "任何一年營收 YoY 波幅不可超過 ±30%",
      actual:
        y1 != null && y2 != null
          ? `${(y1 * 100).toFixed(0)}% / ${(y2 * 100).toFixed(0)}%`
          : "未能計算",
      status: over ? "red" : "green",
      dataKinds: ["ai_extract", "system_calc"],
      sources: sorted.map(
        (a) => `${a.year} Audited Report，第 ${a.sourcePages.join("、")} 頁`,
      ),
      confidence: "高",
      riskReason: over
        ? "存在超過 ±30% 的營收波幅（或基期異常）。"
        : "過去三年營收波幅符合政策標準。",
      suggestedAction: over ? "人工覆核" : "通過",
      details: {
        [`${sorted[0].year}營收`]: sorted[0].revenueHkd,
        [`${sorted[1].year}營收`]: sorted[1].revenueHkd,
        [`${sorted[2].year}營收`]: sorted[2].revenueHkd,
      },
    });
  }

  // 4 Litigation
  const lit = latest?.litigationHits ?? [];
  items.push({
    id: 4,
    name: "重大訴訟紀錄",
    policyStandard: "無重大未結案訴訟／索償披露（仍需外部查核）",
    actual: lit.length ? `發現 ${lit.length} 項披露` : "文件內未發現披露",
    status: lit.length ? "red" : "amber",
    dataKinds: ["ai_extract"],
    sources: latest
      ? [`${latest.year} Audited Report 附註／披露`]
      : ["Audited Report"],
    confidence: lit.length ? "中" : "低",
    riskReason: lit.length
      ? lit.join("；")
      : "文件內未發現重大訴訟披露，仍需由審批人員進行外部查核。",
    suggestedAction: lit.length ? "人工高風險覆核" : "待外部核實",
  });

  // 5 Credit / default
  const credit = latest?.creditRiskHits ?? [];
  items.push({
    id: 5,
    name: "信用及違約紀錄",
    policyStandard: "無嚴重逾期／違約／重組／持續經營重大不確定性披露",
    actual: credit.length ? `發現 ${credit.length} 項披露` : "文件內未發現負面披露",
    status: credit.length ? "red" : "amber",
    dataKinds: ["ai_extract"],
    sources: [
      latest ? `${latest.year} Audited Report 文件檢查` : "Audited Report",
      "信用報告／TU 查核：待處理",
    ],
    confidence: credit.length ? "中" : "低",
    riskReason: credit.length
      ? credit.join("；")
      : "Audited Report 未見負面披露，仍須完成信用報告／TU 查核，不可只靠 AI 最終綠燈。",
    suggestedAction: credit.length ? "人工高風險覆核" : "等待信用查核",
  });

  // 6 Operating tenure
  const q6 = input.declarations.operatingOverOneYear;
  items.push({
    id: 6,
    name: "經營資歷",
    policyStandard: "已完成商業登記且實際經營滿一年或以上",
    actual: q6 === "yes" ? "是" : q6 === "no" ? "否" : "未回答",
    status: q6 === "yes" ? "green" : q6 === "no" ? "red" : "amber",
    dataKinds: ["customer_declare"],
    sources: ["客戶聲明：貸款資格聲明 Q6", "商業登記資料核對：待處理"],
    confidence: "中",
    riskReason:
      q6 === "yes"
        ? "客戶聲明符合；仍需核對商業登記日期。"
        : q6 === "no"
          ? "客戶聲明未滿一年經營。"
          : "未完成聲明。",
    suggestedAction: q6 === "yes" ? "通過／核對 BR" : "人工覆核",
  });

  // 7 Restricted industry
  const q7 = input.declarations.restrictedIndustry;
  items.push({
    id: 7,
    name: "行業限制",
    policyStandard: "不涉及博彩、高污染、高耗能、敏感／禁止行業",
    actual:
      q7 === "yes"
        ? `是：${input.declarations.restrictedIndustryNote || "待說明"}`
        : q7 === "no"
          ? "否"
          : "未回答",
    status: q7 === "no" ? "green" : q7 === "yes" ? "red" : "amber",
    dataKinds: ["customer_declare"],
    sources: ["客戶聲明：貸款資格聲明 Q7"],
    confidence: "中",
    riskReason:
      q7 === "yes"
        ? "客戶聲明涉及限制行業，需人工確認。"
        : q7 === "no"
          ? "客戶聲明不涉及限制行業。"
          : "未完成聲明。",
    suggestedAction: q7 === "yes" ? "人工確認具體行業" : "通過",
  });

  // 8 Personal guarantee
  const q8 = input.declarations.personalGuarantee;
  items.push({
    id: 8,
    name: "個人擔保要求",
    policyStandard: "持股 ≥25% 核心股東／控制人願意提供個人擔保",
    actual:
      q8 === "yes"
        ? "是"
        : q8 === "no"
          ? "否"
          : q8 === "no_25pct"
            ? "沒有單一持股達 25% 的股東"
            : "未回答",
    status:
      q8 === "yes" ? "green" : q8 === "no" ? "red" : q8 === "no_25pct" ? "amber" : "amber",
    dataKinds: ["customer_declare"],
    sources: ["客戶聲明：貸款資格聲明 Q8"],
    confidence: "中",
    riskReason:
      q8 === "no_25pct"
        ? "需人工確認控制權架構。"
        : q8 === "no"
          ? "客戶拒絕必要擔保。"
          : q8 === "yes"
            ? "客戶同意提供個人擔保。"
            : "未完成聲明。",
    suggestedAction:
      q8 === "no_25pct" ? "人工確認控制權" : q8 === "no" ? "人工覆核產品要求" : "通過",
  });

  // 9 Unsecured limit
  const avgMonthly =
    latest?.revenueHkd != null ? latest.revenueHkd / 12 : null;
  const multiple =
    avgMonthly && avgMonthly > 0 ? input.amountHkd / avgMonthly : null;
  const q9 = input.declarations.unsecuredLimitAck;

  let item9: PolicyItemResult;
  if (input.loanType === "secured" || q9 === "na_secured") {
    item9 = {
      id: 9,
      name: "無抵押貸款限額",
      policyStandard: "無抵押申請額一般 ≤ 平均月營收 2–3 倍及產品上限",
      actual: "不適用（有抵押貸款）",
      status: "na",
      dataKinds: ["customer_declare", "system_calc"],
      sources: ["申請類型", "客戶聲明 Q9"],
      confidence: "高",
      riskReason: "有抵押貸款，本項不適用。",
      suggestedAction: "—",
    };
  } else {
    let status: PolicyItemStatus = "amber";
    let reason = "待確認。";
    if (q9 === "disagree") {
      status = "red";
      reason = "客戶不同意申請金額可能按審批調整。";
    } else if (multiple != null && multiple > 3) {
      status = "red";
      reason = `貸款申請倍數 ${multiple.toFixed(1)}x 超過政策參考上限（約 2–3x）。`;
    } else if (q9 === "agree" && multiple != null && multiple <= 3) {
      status = "green";
      reason = `申請倍數約 ${multiple.toFixed(1)}x，在政策參考範圍內（仍受產品上限約束）。`;
    } else if (avgMonthly == null) {
      status = "amber";
      reason = "未能由營收計算平均月營收。";
    }
    item9 = {
      id: 9,
      name: "無抵押貸款限額",
      policyStandard: "無抵押申請額一般 ≤ 平均月營收 2–3 倍及產品上限",
      actual:
        multiple != null ? `${multiple.toFixed(2)}x 月營收` : "未能計算",
      status,
      dataKinds: ["customer_declare", "ai_extract", "system_calc"],
      sources: [
        "客戶聲明 Q9",
        latest ? `${latest.year} 營收` : "營收數據",
        `申請金額 HKD ${input.amountHkd.toLocaleString()}`,
      ],
      confidence: avgMonthly != null ? "高" : "低",
      riskReason: reason,
      suggestedAction: status === "red" ? "要求調整金額／人工覆核" : "通過",
      details: {
        平均月營收: avgMonthly != null ? Math.round(avgMonthly) : null,
        申請金額: input.amountHkd,
        倍數: multiple != null ? Number(multiple.toFixed(2)) : null,
      },
    };
  }
  items.push(item9);

  // 10 Collateral LTV
  const q10 = input.declarations.collateralAvailable;
  let item10: PolicyItemResult;
  if (input.loanType === "unsecured" || q10 === "na_unsecured") {
    item10 = {
      id: 10,
      name: "抵押品及質押率",
      policyStandard: "合資格抵押品；初步質押率約 50%–80%（按產品）",
      actual: "不適用（無抵押貸款）",
      status: "na",
      dataKinds: ["customer_declare", "system_calc"],
      sources: ["申請類型", "客戶聲明 Q10"],
      confidence: "高",
      riskReason: "無抵押貸款，本項不適用。",
      suggestedAction: "—",
    };
  } else if (q10 === "no") {
    item10 = {
      id: 10,
      name: "抵押品及質押率",
      policyStandard: "合資格抵押品；初步質押率約 50%–80%（按產品）",
      actual: "沒有合資格抵押品",
      status: "red",
      dataKinds: ["customer_declare"],
      sources: ["客戶聲明 Q10"],
      confidence: "高",
      riskReason: "申請有抵押貸款但客戶表示沒有合資格抵押品。",
      suggestedAction: "人工覆核／轉無抵押或終止",
    };
  } else {
    const value = input.declarations.collateralValueHkd;
    const ltv = newLoanLtv(input.amountHkd, value ?? 0);
    const formalValuation = input.declarations.acceptValuation === true;
    let status: PolicyItemStatus = "amber";
    let reason = "尚未取得正式估值。";
    if (ltv != null && ltv >= 0.5 && ltv <= 0.8 && formalValuation) {
      status = "green";
      reason = `初步質押率 ${(ltv * 100).toFixed(0)}%，在政策參考範圍內（仍待正式估值確認）。`;
    } else if (ltv != null && (ltv < 0.5 || ltv > 0.8)) {
      status = "amber";
      reason = `初步質押率 ${(ltv * 100).toFixed(0)}%，需按抵押品類型及產品政策覆核。`;
    }
    if (!formalValuation) {
      status = "amber";
      reason = "尚未取得正式估值；顯示黃燈。";
    }
    item10 = {
      id: 10,
      name: "抵押品及質押率",
      policyStandard: "合資格抵押品；初步質押率約 50%–80%（按產品）",
      actual: ltv != null ? `${(ltv * 100).toFixed(0)}%` : "待估值",
      status,
      dataKinds: ["customer_declare", "system_calc"],
      sources: ["客戶聲明 Q10", "抵押品估值（待指定機構）"],
      confidence: "中",
      riskReason: reason,
      suggestedAction: status === "green" ? "通過／安排估值" : "安排估值／人工覆核",
      details: {
        估計價值: value ?? null,
        申請金額: input.amountHkd,
        初步質押率: ltv != null ? Number((ltv * 100).toFixed(1)) : null,
      },
    };
  }
  items.push(item10);

  const overall = computeOverall(items);
  let clientFacing: PolicyEvaluation["clientFacing"] = "pass_review";
  let clientMessage =
    "已完成初步資料評估，申請將交由貸款審批人員覆核。";
  if (overall === "red") {
    clientFacing = "need_manual";
    clientMessage =
      "系統發現部分資料需要由貸款審批人員進一步確認。現階段不代表正式批核結果。";
  } else if (overall === "amber" || followUpTasks.length > 0) {
    clientFacing = "need_supplement";
    clientMessage =
      "部分財務或債務資料仍需補充，完成後我們會繼續處理申請。";
  }

  const { gearing, tnw } = latest
    ? computeGearing(latest)
    : { gearing: null, tnw: null };

  return {
    overall,
    clientFacing,
    clientMessage,
    ebitda,
    annualDebtServiceHkd: annualDebt,
    dscr,
    gearing: gearing != null && Number.isFinite(gearing) ? gearing : null,
    tangibleNetWorthHkd: tnw,
    avgMonthlyRevenueHkd: avgMonthly,
    unsecuredMultiple: multiple,
    ltv: newLoanLtv(
      input.amountHkd,
      input.declarations.collateralValueHkd ?? 0,
    ),
    items,
    followUpTasks,
  };
}
