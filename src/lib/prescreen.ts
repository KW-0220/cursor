import type { ScreeningResult } from "./types";

export type PrescreenDocStatus =
  | "missing"
  | "uploaded"
  | "analyzing"
  | "ok"
  | "needs_attention"
  | "expired"
  | "failed";

export interface IdDocuments {
  front: PrescreenDocStatus;
  back: PrescreenDocStatus;
  addressProofMonths: string[]; // e.g. ["2026-04","2026-05","2026-06"]
  addressProofStatus: PrescreenDocStatus;
  maskedId?: string;
}

export interface BankStatementMonth {
  month: string;
  totalCreditsHkd: number; // 該月結單所有入賬加總
  sourcePages?: number[];
  confidence?: number;
}

export interface BrCertificate {
  brNumber: string;
  companyNameZh: string;
  expiryDate: string; // ISO date
  status: PrescreenDocStatus;
  sourcePages?: number[];
}

export interface Nar1Shareholder {
  name: string;
  role: "董事" | "股東" | "董事兼股東";
  sharePercent: number | null;
}

export interface Nar1Return {
  filingDate: string;
  status: PrescreenDocStatus;
  directorsAndShareholders: Nar1Shareholder[];
  sourcePages?: number[];
}

export interface PrescreenCheck {
  id: string;
  name: string;
  requirement: string;
  status: ScreeningResult | "na";
  detail: string;
  suggestion: string;
  dataSource: "AI 提取" | "客戶上載" | "系統計算";
}

export interface PrescreenResult {
  overall: ScreeningResult;
  readyForLeadReferral: boolean;
  avgMonthlyTurnoverHkd: number | null;
  monthsCovered: number;
  totalCreditsHkd: number | null;
  checks: PrescreenCheck[];
  leadNote: string;
  disclaimer: string;
}

export function computeAvgMonthlyTurnover(months: BankStatementMonth[]) {
  if (!months.length) {
    return { totalCreditsHkd: null, avgMonthlyTurnoverHkd: null, monthsCovered: 0 };
  }
  const totalCreditsHkd = months.reduce((s, m) => s + m.totalCreditsHkd, 0);
  return {
    totalCreditsHkd,
    avgMonthlyTurnoverHkd: totalCreditsHkd / months.length,
    monthsCovered: months.length,
  };
}

export function isBrValid(expiryDate: string, asOf = new Date()) {
  const expiry = new Date(expiryDate);
  if (Number.isNaN(expiry.getTime())) return false;
  // valid through end of expiry day
  const end = new Date(expiry);
  end.setHours(23, 59, 59, 999);
  return end.getTime() >= asOf.getTime();
}

export function evaluatePrescreen(input: {
  idDocs: IdDocuments;
  statements: BankStatementMonth[];
  br: BrCertificate | null;
  nar1: Nar1Return | null;
  requiredStatementMonths?: number;
}): PrescreenResult {
  const requiredMonths = input.requiredStatementMonths ?? 3;
  const checks: PrescreenCheck[] = [];
  const { totalCreditsHkd, avgMonthlyTurnoverHkd, monthsCovered } =
    computeAvgMonthlyTurnover(input.statements);

  // ID front/back
  const idOk =
    input.idDocs.front === "ok" &&
    input.idDocs.back === "ok";
  checks.push({
    id: "id_copy",
    name: "身份證正反面副本",
    requirement: "上載香港身份證正面及反面清晰副本",
    status: idOk ? "green" : input.idDocs.front === "missing" || input.idDocs.back === "missing" ? "red" : "amber",
    detail: idOk
      ? `已收齊正反面${input.idDocs.maskedId ? `（${input.idDocs.maskedId}）` : ""}`
      : `正面：${input.idDocs.front}；反面：${input.idDocs.back}`,
    suggestion: idOk ? "可進入下一步人工覆核" : "請重新上載清晰身份證正反面",
    dataSource: "客戶上載",
  });

  // Address proof last 3 months
  const addrMonthsOk = input.idDocs.addressProofMonths.length >= 3;
  const addrOk = input.idDocs.addressProofStatus === "ok" && addrMonthsOk;
  checks.push({
    id: "address_proof",
    name: "近 3 個月住址證明",
    requirement: "個人近三個月住址證明（水電煤／銀行／政府信件等）",
    status: addrOk
      ? "green"
      : input.idDocs.addressProofStatus === "missing"
        ? "red"
        : "amber",
    detail: addrOk
      ? `已覆蓋：${input.idDocs.addressProofMonths.join("、")}`
      : `已交月份：${input.idDocs.addressProofMonths.join("、") || "無"}`,
    suggestion: addrOk ? "住址證明齊備" : "請補交近三個月個人住址證明",
    dataSource: "客戶上載",
  });

  // Bank statements → avg monthly turnover
  let stmtStatus: ScreeningResult = "amber";
  let stmtDetail = "尚未上載足夠月結單。";
  let stmtSuggestion = "請上載最近數月銀行月結單，AI 會加總入賬並計算平均每月營業額。";
  if (monthsCovered >= requiredMonths && avgMonthlyTurnoverHkd != null) {
    stmtStatus = "green";
    stmtDetail = `${monthsCovered} 個月入賬合計 HK$${Math.round(totalCreditsHkd!).toLocaleString()}；平均每月營業額約 HK$${Math.round(avgMonthlyTurnoverHkd).toLocaleString()}`;
    stmtSuggestion = "平均每月營業額已供顧問預審參考，非正式批核。";
  } else if (monthsCovered > 0) {
    stmtStatus = "amber";
    stmtDetail = `僅有 ${monthsCovered} 個月結單，建議至少 ${requiredMonths} 個月。`;
  } else {
    stmtStatus = "red";
  }
  checks.push({
    id: "bank_turnover",
    name: "月結單平均每月營業額",
    requirement: `加總月結單所有入賬金額 ÷ 月數（建議 ≥ ${requiredMonths} 個月）`,
    status: stmtStatus,
    detail: stmtDetail,
    suggestion: stmtSuggestion,
    dataSource: "系統計算",
  });

  // BR validity
  if (!input.br) {
    checks.push({
      id: "br_valid",
      name: "商業登記證（BR）有效期",
      requirement: "BR 必須在有效期內，不可過期",
      status: "red",
      detail: "尚未上載／未能識別 BR",
      suggestion: "請上載有效商業登記證",
      dataSource: "AI 提取",
    });
  } else {
    const valid = isBrValid(input.br.expiryDate);
    checks.push({
      id: "br_valid",
      name: "商業登記證（BR）有效期",
      requirement: "BR 必須在有效期內，不可過期",
      status: valid ? "green" : "red",
      detail: valid
        ? `${input.br.companyNameZh} · BR ${input.br.brNumber} · 有效至 ${input.br.expiryDate}`
        : `BR ${input.br.brNumber} 已過期或無效（到期日 ${input.br.expiryDate}）`,
      suggestion: valid
        ? "BR 有效，可供 Lead 轉介前核對"
        : "請更新並上載有效期內的商業登記證",
      dataSource: "AI 提取",
    });
  }

  // NAR1 directors / shareholding
  if (!input.nar1 || input.nar1.directorsAndShareholders.length === 0) {
    checks.push({
      id: "nar1",
      name: "周年申報表（NAR1）／變更登記",
      requirement: "清楚顯示現時董事及股東持股比例",
      status: "red",
      detail: "尚未上載或未能抽出董事／股東資料",
      suggestion: "請上載最新 NAR1 或公司變更登記表",
      dataSource: "AI 提取",
    });
  } else {
    const incomplete = input.nar1.directorsAndShareholders.some(
      (p) => p.sharePercent == null && p.role !== "董事",
    );
    const totalShare = input.nar1.directorsAndShareholders.reduce(
      (s, p) => s + (p.sharePercent ?? 0),
      0,
    );
    const names = input.nar1.directorsAndShareholders
      .map((p) =>
        `${p.name}（${p.role}${p.sharePercent != null ? ` ${p.sharePercent}%` : ""}）`,
      )
      .join("；");
    checks.push({
      id: "nar1",
      name: "周年申報表（NAR1）／變更登記",
      requirement: "清楚顯示現時董事及股東持股比例",
      status: incomplete || totalShare <= 0 ? "amber" : "green",
      detail: names,
      suggestion:
        incomplete || totalShare <= 0
          ? "持股比例不完整，需人工核對文件原文"
          : "董事／股東資料已抽出，供顧問覆核",
      dataSource: "AI 提取",
    });
  }

  const hasRed = checks.some((c) => c.status === "red");
  const hasAmber = checks.some((c) => c.status === "amber");
  const overall: ScreeningResult = hasRed ? "red" : hasAmber ? "amber" : "green";
  const readyForLeadReferral = !hasRed;

  return {
    overall,
    readyForLeadReferral,
    avgMonthlyTurnoverHkd,
    monthsCovered,
    totalCreditsHkd,
    checks,
    leadNote: readyForLeadReferral
      ? "預審條件大致齊備，可作 Lead 轉介予貸款顧問／合作機構進一步審批。AI 不決定最終批核。"
      : "尚有強制文件或條件未滿足，暫不建議轉介；請先補件。",
    disclaimer:
      "AI 為財務助理及文件分析引擎，只負責資料收集、提取、計算及預審條件核對，並不直接決定是否批出貸款。最終審批由貸款顧問及相關金融機構作出。",
  };
}
