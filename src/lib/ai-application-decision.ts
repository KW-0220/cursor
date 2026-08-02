import type { ClientAppStatus } from "@/lib/application-status";
import type { BankCashflowBrief } from "@/lib/bank-statement-extract";
import type { BrExtract } from "@/lib/br-extract";
import {
  auditedExtractToFinancial,
  buildAuditedComparisonRows,
  type AuditedReportExtract,
} from "@/lib/audited-report-extract";
import { applyHardcodedEbitdaFormulas } from "@/lib/financial-extract";
import {
  dscr,
  FORMULA_DEFINITIONS,
} from "@/lib/formulas";
import { evaluateSuitability } from "@/lib/suitability";

export type AiRepaymentOverall = "adequate" | "tight" | "weak" | "unknown";

export type ApplicationAiAnalysis = {
  analyzedAt: string;
  summary: string;
  decision: ClientAppStatus;
  decisionReason: string | null;
  bank: {
    analyzed: boolean;
    monthsAnalyzed: number;
    overall: AiRepaymentOverall;
    narrative: string;
    monthlyAvgOperating: number | null;
    sixMonthNet: number | null;
    sixMonthAvgDaily: number | null;
    assessmentNotes: string[];
  };
  businessRegistration: {
    analyzed: boolean;
    companyNameZh: string | null;
    companyNameEn: string | null;
    brNumber: string | null;
    businessAddress: string | null;
    businessNature: string | null;
    effectiveDate: string | null;
    expiryDate: string | null;
    error: string | null;
  };
  auditedAccounts: {
    analyzed: boolean;
    companyName: string | null;
    yearEndDate: string | null;
    auditorName: string | null;
    auditOpinionType: string | null;
    hasQualifiedOpinion: boolean | null;
    goingConcernUncertainty: boolean | null;
    years: Array<{
      financialYear: string;
      revenue: number | null;
      profitBeforeTax: number | null;
      netProfit: number | null;
    }>;
    error: string | null;
  };
  documentChecks: {
    bankOk: boolean;
    bankFailCount: number;
    brOk: boolean;
    auditedOk: boolean;
    auditedFailCount: number;
  };
  suitability: {
    status: string;
    message: string;
    checks: Array<{ label: string; actual: string; pass: boolean | null }>;
  } | null;
  ebitda: {
    formula: string;
    coverageRule: string;
    ebitdaHkd: number | null;
    ebitdaSource: "computed" | "disclosed" | "none";
    totalDebtPaymentsHkd: number | null;
    coversDebtPayments: boolean | null;
    dscr: number | null;
    components: {
      earningBeforeTax: number | null;
      interest: number | null;
      tax: number | null;
      depreciation: number | null;
      amortisation: number | null;
      netProfit: number | null;
    };
  } | null;
};

/** 申請端分析快照（由 ApplyDocumentsUpload 上報） */
export type ApplyAnalysisSnapshot = {
  hasRun: boolean;
  bankBrief: BankCashflowBrief | null;
  br: BrExtract | null;
  brError: string | null;
  audited: AuditedReportExtract | null;
  auditedError: string | null;
  bankOkCount: number;
  bankFailCount: number;
  brOk: boolean;
  auditedOkCount: number;
  auditedFailCount: number;
};

export function emptyApplyAnalysisSnapshot(): ApplyAnalysisSnapshot {
  return {
    hasRun: false,
    bankBrief: null,
    br: null,
    brError: null,
    audited: null,
    auditedError: null,
    bankOkCount: 0,
    bankFailCount: 0,
    brOk: false,
    auditedOkCount: 0,
    auditedFailCount: 0,
  };
}

function overallLabel(o: AiRepaymentOverall) {
  if (o === "adequate") return "尚可";
  if (o === "tight") return "偏緊";
  if (o === "weak") return "偏弱";
  return "未知";
}

function decide(
  snap: ApplyAnalysisSnapshot,
  bank: ApplicationAiAnalysis["bank"],
  br: ApplicationAiAnalysis["businessRegistration"],
  audited: ApplicationAiAnalysis["auditedAccounts"],
  suitability: ApplicationAiAnalysis["suitability"],
): { decision: ClientAppStatus; decisionReason: string | null; summary: string } {
  if (!snap.hasRun) {
    return {
      decision: "under_review",
      decisionReason: null,
      summary: "尚未執行文件 AI 分析，案件維持審批中。",
    };
  }

  const reasons: string[] = [];

  if (bank.analyzed && bank.overall === "weak") {
    reasons.push(
      bank.narrative ||
        "銀行月結顯示現金流／還款能力偏弱。",
    );
    if (bank.assessmentNotes.length) {
      reasons.push(...bank.assessmentNotes.slice(0, 3));
    }
  }

  if (snap.hasRun && !bank.analyzed) {
    reasons.push("銀行月結單未能完成 AI 分析，無法評估還款能力。");
  }

  if (snap.hasRun && !br.analyzed) {
    reasons.push(
      br.error
        ? `商業登記證分析失敗：${br.error}`
        : "商業登記證尚未成功分析。",
    );
  } else if (br.analyzed && !br.brNumber) {
    reasons.push("商業登記證未能抽出登記號碼。");
  }

  if (audited.analyzed && audited.goingConcernUncertainty === true) {
    reasons.push("經審計報表顯示持續經營重大不確定性。");
  }

  if (audited.analyzed && audited.hasQualifiedOpinion === true) {
    reasons.push("經審計報表含保留／非無保留意見。");
  }

  if (suitability?.status === "NotSuitable") {
    reasons.push(suitability.message || "初步適合度評估未達門檻。");
  }

  // 明確拒絕條件
  const hardReject =
    bank.overall === "weak" ||
    audited.goingConcernUncertainty === true ||
    suitability?.status === "NotSuitable" ||
    (snap.hasRun && !bank.analyzed && snap.bankFailCount > 0) ||
    (snap.hasRun && !br.analyzed && Boolean(br.error));

  if (hardReject && reasons.length > 0) {
    return {
      decision: "rejected",
      decisionReason: reasons.slice(0, 4).join("；"),
      summary: `AI 分析建議拒絕。還款能力：${overallLabel(bank.overall)}。`,
    };
  }

  // 批核：銀行還款能力尚可 + BR 成功 +（無硬性否決）
  if (
    bank.analyzed &&
    bank.overall === "adequate" &&
    br.analyzed &&
    br.brNumber &&
    suitability?.status !== "NotSuitable"
  ) {
    const caveats: string[] = [];
    if (!audited.analyzed) {
      caveats.push("經審計報表分析未完成，仍建議人工抽查");
    } else if (audited.years.every((y) => y.revenue == null)) {
      caveats.push("損益表營業額未抽出，建議覆核");
    }
    return {
      decision: "approved",
      decisionReason: null,
      summary: [
        `AI 分析建議批核。還款能力：${overallLabel(bank.overall)}。`,
        bank.narrative,
        caveats.length ? caveats.join("；") : null,
      ]
        .filter(Boolean)
        .join(" "),
    };
  }

  // 偏緊／資料不足 → 審批中
  const pendingBits = [
    bank.analyzed
      ? `還款能力：${overallLabel(bank.overall)}`
      : "銀行月結分析未完成",
    br.analyzed ? "BR 已分析" : "BR 待分析",
    audited.analyzed ? "Audited 已分析" : "Audited 待分析",
    bank.narrative || null,
  ].filter(Boolean);

  return {
    decision: "under_review",
    decisionReason: null,
    summary: `AI 分析後仍需覆核。${pendingBits.join(" · ")}`,
  };
}

/** 由申請端快照建立可持久化的 AI 分析＋批核決定 */
export function buildApplicationAiDecision(
  snap: ApplyAnalysisSnapshot,
  opts?: {
    existingDebtHkd?: number | null;
    companyAgeYears?: number | null;
  },
): ApplicationAiAnalysis {
  const brief = snap.bankBrief;
  const overall: AiRepaymentOverall = brief?.repaymentCapacity.overall ?? "unknown";
  const assessmentNotes =
    brief?.repaymentCapacity.assessments
      .map((a) => {
        const parts = [a.month, a.assessment, a.notes].filter(Boolean);
        return parts.join("：");
      })
      .filter((s) => s.length > 2) ?? [];

  const bank: ApplicationAiAnalysis["bank"] = {
    analyzed: Boolean(brief),
    monthsAnalyzed: snap.bankOkCount,
    overall,
    narrative: brief?.repaymentCapacity.narrative ?? "",
    monthlyAvgOperating: brief?.operatingInflows.monthlyAvgOperating ?? null,
    sixMonthNet: brief?.cashflow.sixMonthNet ?? null,
    sixMonthAvgDaily: brief?.balances.sixMonthAvgDaily ?? null,
    assessmentNotes,
  };

  const brSrc = snap.br;
  const br: ApplicationAiAnalysis["businessRegistration"] = {
    analyzed: Boolean(brSrc) && snap.brOk,
    companyNameZh: brSrc?.company_name_zh ?? null,
    companyNameEn: brSrc?.company_name_en ?? null,
    brNumber: brSrc?.br_number ?? null,
    businessAddress: brSrc?.business_address ?? null,
    businessNature: brSrc?.business_nature ?? null,
    effectiveDate: brSrc?.effective_date ?? null,
    expiryDate: brSrc?.expiry_date ?? null,
    error: snap.brError,
  };

  const audSrc = snap.audited;
  const yearRows = audSrc ? buildAuditedComparisonRows(audSrc) : [];
  const audited: ApplicationAiAnalysis["auditedAccounts"] = {
    analyzed: Boolean(audSrc) && snap.auditedOkCount > 0,
    companyName: audSrc?.company_name ?? null,
    yearEndDate: audSrc?.year_end_date ?? null,
    auditorName: audSrc?.auditor_name ?? null,
    auditOpinionType: audSrc?.audit_opinion_type ?? null,
    hasQualifiedOpinion: audSrc?.has_qualified_opinion ?? null,
    goingConcernUncertainty: audSrc?.going_concern_uncertainty ?? null,
    years: yearRows.map((r) => ({
      financialYear: r.financialYear,
      revenue: r.revenue,
      profitBeforeTax: r.profitBeforeTax,
      netProfit: r.netProfit,
    })),
    error: snap.auditedError,
  };

  let suitability: ApplicationAiAnalysis["suitability"] = null;
  const monthlyRevenue =
    bank.monthlyAvgOperating ??
    audited.years.find((y) => y.revenue != null)?.revenue ??
    null;
  if (monthlyRevenue != null || opts?.companyAgeYears != null) {
    const result = evaluateSuitability({
      companyAge: opts?.companyAgeYears ?? null,
      monthlyRevenue,
      debtRatio: null,
      existingDebtHkd: opts?.existingDebtHkd ?? null,
    });
    suitability = {
      status: result.status,
      message: result.clientMessage,
      checks: result.checks.map((c) => ({
        label: c.label,
        actual: c.actual,
        pass: c.pass,
      })),
    };
  }

  let ebitda: ApplicationAiAnalysis["ebitda"] = null;
  if (audSrc) {
    const { extract, ebitdaAnalysis } = applyHardcodedEbitdaFormulas(
      auditedExtractToFinancial(audSrc),
    );
    ebitda = {
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
        netProfit: extract.net_profit,
      },
    };
  }

  const { decision, decisionReason, summary } = decide(
    snap,
    bank,
    br,
    audited,
    suitability,
  );

  return {
    analyzedAt: new Date().toISOString(),
    summary,
    decision,
    decisionReason,
    bank,
    businessRegistration: br,
    auditedAccounts: audited,
    documentChecks: {
      bankOk: snap.bankOkCount > 0,
      bankFailCount: snap.bankFailCount,
      brOk: snap.brOk,
      auditedOk: snap.auditedOkCount > 0,
      auditedFailCount: snap.auditedFailCount,
    },
    suitability,
    ebitda,
  };
}
