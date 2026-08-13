/**
 * 個人／公司按揭：類型、文件槽、計算狀態
 */

import type { LoanType } from "@/lib/types";
import {
  debtServicingRatio,
  FORMULA_DEFINITIONS,
  mortgageMonthlyPayment,
  newLoanLtv,
} from "@/lib/formulas";

export type MortgageKind = "new_buy" | "refinance";

export type MortgageDocSkipReason = "none" | "later" | null;

export type MortgageDocSlotId =
  | "identity"
  | "provisional_spa"
  | "salary_bank_3m"
  | "payslips_3m"
  | "tax_return"
  | "solicitor_card"
  | "developer_rebate"
  | "work_card"
  | "existing_mortgage_schedule"
  | "investment_accounts_3m"
  | "mortgage_schedule_annual"
  | "mortgage_repayment_bank_3m"
  | "shell_br"
  | "shell_ci"
  | "shell_bank_6m"
  | "shell_financials";

export type MortgageDocSectionId =
  | "identity"
  | "income"
  | "property"
  | "existing_mortgage"
  | "assets"
  | "company";

export type MortgageDocSlotDef = {
  id: MortgageDocSlotId;
  title: string;
  description: string;
  purpose: string;
  required: boolean;
  accept: string;
  formatsHint: string;
  section: MortgageDocSectionId;
  /** 允許「沒有此文件／稍後補交」 */
  allowSkip: boolean;
  aiFocus: string[];
};

export type MortgageCalcInput = {
  propertyValueHkd: number | null;
  loanAmountHkd: number | null;
  ltvPct: number;
  tenureYears: number;
  annualRatePct: number;
  monthlyIncomeHkd: number | null;
  existingMonthlyDebtsHkd: number | null;
  rememberInputs: boolean;
};

export type MortgageCalcResult = {
  newMonthlyRepaymentHkd: number | null;
  totalMonthlyDebtsHkd: number | null;
  monthlyIncomeHkd: number | null;
  dsr: number | null;
  dsrPct: number | null;
  dsrTone: "green" | "amber" | "red" | "unknown";
  narrative: string;
  formulaNotes: string[];
};

export const LOAN_TYPE_OPTIONS: Array<{
  type: LoanType;
  title: string;
  description: string;
}> = [
  {
    type: "secured",
    title: "有抵押貸款",
    description: "適合以公司或個人資產作抵押，申請一般商業貸款。",
  },
  {
    type: "unsecured",
    title: "無抵押貸款",
    description: "適合毋須提供抵押品，以公司營運及財務狀況申請貸款。",
  },
  {
    type: "personal_mortgage",
    title: "個人按揭",
    description: "適合以個人名義申請住宅／物業按揭，包括新買及轉按。",
  },
  {
    type: "company_mortgage",
    title: "公司按揭",
    description: "適合以公司名義申請物業按揭，包括新買、轉按及空殼公司個案。",
  },
];

export function isMortgageLoanType(
  loanType: LoanType | string | null | undefined,
): boolean {
  return loanType === "personal_mortgage" || loanType === "company_mortgage";
}

export function loanTypeLabel(
  loanType: LoanType | string | null | undefined,
): string {
  switch (loanType) {
    case "secured":
      return "有抵押貸款";
    case "unsecured":
      return "無抵押貸款";
    case "personal_mortgage":
      return "個人按揭";
    case "company_mortgage":
      return "公司按揭";
    default:
      return "—";
  }
}

export function mortgageKindLabel(kind: MortgageKind | null | undefined) {
  if (kind === "new_buy") return "新買";
  if (kind === "refinance") return "轉按";
  return "—";
}

export const MORTGAGE_KIND_OPTIONS: Array<{
  kind: MortgageKind;
  title: string;
  description: string;
}> = [
  {
    kind: "new_buy",
    title: "新買",
    description: "適合新購買物業，準備申請按揭貸款。",
  },
  {
    kind: "refinance",
    title: "轉按",
    description: "適合現有物業已經有按揭，現在希望轉按／再融資。",
  },
];

export const MORTGAGE_SECTION_LABEL: Record<MortgageDocSectionId, string> = {
  identity: "基本身份文件",
  income: "收入證明",
  property: "物業交易文件",
  existing_mortgage: "現有按揭文件",
  assets: "資產補充文件",
  company: "公司文件（空殼公司）",
};

const NEW_BUY_SLOTS: MortgageDocSlotDef[] = [
  {
    id: "identity",
    title: "身分證",
    description: "香港身份證或護照；必須清晰可見，不可遮擋姓名及證件號碼。",
    purpose: "身份核對、KYC、與申請資料比對",
    required: true,
    accept: "image/*,.pdf,application/pdf",
    formatsHint: "PDF／圖片",
    section: "identity",
    allowSkip: false,
    aiFocus: ["姓名", "證件號碼", "文件清晰度"],
  },
  {
    id: "provisional_spa",
    title: "臨時買賣合約",
    description: "完整合約副本；可見買方、賣方、物業地址、成交價及簽署日期。",
    purpose: "確認物業成交資料、買方名稱、成交價及購買類型",
    required: true,
    accept: "image/*,.pdf,application/pdf",
    formatsHint: "PDF／圖片",
    section: "property",
    allowSkip: false,
    aiFocus: ["買方姓名", "物業地址", "成交價", "合約日期"],
  },
  {
    id: "salary_bank_3m",
    title: "最近 3 個月出糧戶口月結單",
    description: "最近連續 3 個月；只接受 PDF 或完整掃描；顯示完整交易及戶口持有人。",
    purpose: "分析入息紀錄、出糧穩定性、現金流",
    required: true,
    accept: ".pdf,application/pdf",
    formatsHint: "PDF",
    section: "income",
    allowSkip: false,
    aiFocus: ["每月入帳", "出糧紀錄", "現金流"],
  },
  {
    id: "payslips_3m",
    title: "最近 3 個月糧單",
    description: "最近連續 3 個月；顯示僱主名稱、員工姓名、薪金及日期。",
    purpose: "核對受薪資料、比對銀行入帳、計算每月收入",
    required: true,
    accept: "image/*,.pdf,application/pdf",
    formatsHint: "PDF／圖片",
    section: "income",
    allowSkip: false,
    aiFocus: ["僱主名稱", "每月薪金", "固定／非固定收入"],
  },
  {
    id: "tax_return",
    title: "最近一年稅單",
    description: "最近一個完整課稅年度；必須顯示納稅人姓名及評稅資料。",
    purpose: "輔助核對收入來源及收入水平",
    required: true,
    accept: "image/*,.pdf,application/pdf",
    formatsHint: "PDF／圖片",
    section: "income",
    allowSkip: false,
    aiFocus: ["報稅收入", "受薪紀錄"],
  },
  {
    id: "solicitor_card",
    title: "律師樓卡片",
    description: "如已委任律師樓，請提供名片或聯絡資料卡。",
    purpose: "便於後續跟進按揭文件及交易安排",
    required: false,
    accept: "image/*,.pdf,application/pdf",
    formatsHint: "PDF／圖片",
    section: "property",
    allowSkip: true,
    aiFocus: ["律師樓名稱", "聯絡資料"],
  },
  {
    id: "developer_rebate",
    title: "發展商回贈（如有）",
    description: "如有發展商回贈、現金回贈或優惠安排，請提供相關文件。",
    purpose: "確認交易條款、評估實際首期及成交結構",
    required: false,
    accept: "image/*,.pdf,application/pdf",
    formatsHint: "PDF／圖片",
    section: "property",
    allowSkip: true,
    aiFocus: ["回贈金額", "優惠條款"],
  },
  {
    id: "work_card",
    title: "工作卡片",
    description: "名片或職員卡；如無可選「沒有此文件」。",
    purpose: "輔助核對職位及工作機構資料",
    required: false,
    accept: "image/*,.pdf,application/pdf",
    formatsHint: "PDF／圖片",
    section: "identity",
    allowSkip: true,
    aiFocus: ["職位", "工作機構"],
  },
  {
    id: "existing_mortgage_schedule",
    title: "現時按揭戶口供款表（如有）",
    description: "如申請人現時已有其他按揭，請提供最新供款表或還款時間表。",
    purpose: "計算現有每月債務供款、用於 DSR 計算",
    required: false,
    accept: "image/*,.pdf,application/pdf",
    formatsHint: "PDF／圖片",
    section: "existing_mortgage",
    allowSkip: true,
    aiFocus: ["現有按揭供款額", "餘額", "還款紀錄"],
  },
  {
    id: "investment_accounts_3m",
    title: "最近三個月股票／現金戶口",
    description: "最近 3 個月月結單；顯示戶口持有人及資產結餘。",
    purpose: "證明 liquid asset value、作為資產補充參考",
    required: false,
    accept: ".pdf,application/pdf,image/*",
    formatsHint: "PDF／圖片",
    section: "assets",
    allowSkip: true,
    aiFocus: ["liquid asset value", "資產補充能力"],
  },
];

const REFINANCE_SLOTS: MortgageDocSlotDef[] = [
  {
    id: "identity",
    title: "身分證",
    description: "香港身份證或護照；必須清晰可見，不可遮擋姓名及證件號碼。",
    purpose: "身份核對、KYC、與申請資料比對",
    required: true,
    accept: "image/*,.pdf,application/pdf",
    formatsHint: "PDF／圖片",
    section: "identity",
    allowSkip: false,
    aiFocus: ["姓名", "證件號碼", "文件清晰度"],
  },
  {
    id: "mortgage_schedule_annual",
    title: "最近按揭供款表及年結",
    description: "提供現有按揭最新供款表及年結單。",
    purpose: "核對現有按揭資料、未償還貸款餘額、供款紀錄",
    required: true,
    accept: "image/*,.pdf,application/pdf",
    formatsHint: "PDF／圖片",
    section: "existing_mortgage",
    allowSkip: false,
    aiFocus: ["現有按揭供款額", "餘額", "還款紀錄"],
  },
  {
    id: "salary_bank_3m",
    title: "最近 3 個月出糧戶口月結單",
    description: "最近連續 3 個月；只接受 PDF 或完整掃描；顯示完整交易及戶口持有人。",
    purpose: "分析入息紀錄、出糧穩定性、現金流",
    required: true,
    accept: ".pdf,application/pdf",
    formatsHint: "PDF",
    section: "income",
    allowSkip: false,
    aiFocus: ["每月入帳", "出糧紀錄", "現金流"],
  },
  {
    id: "payslips_3m",
    title: "最近 3 個月糧單",
    description: "最近連續 3 個月；顯示僱主名稱、員工姓名、薪金及日期。",
    purpose: "核對受薪資料、比對銀行入帳、計算每月收入",
    required: true,
    accept: "image/*,.pdf,application/pdf",
    formatsHint: "PDF／圖片",
    section: "income",
    allowSkip: false,
    aiFocus: ["僱主名稱", "每月薪金", "固定／非固定收入"],
  },
  {
    id: "tax_return",
    title: "最近一年稅單",
    description: "最近一個完整課稅年度；必須顯示納稅人姓名及評稅資料。",
    purpose: "輔助核對收入來源及收入水平",
    required: true,
    accept: "image/*,.pdf,application/pdf",
    formatsHint: "PDF／圖片",
    section: "income",
    allowSkip: false,
    aiFocus: ["報稅收入", "受薪紀錄"],
  },
  {
    id: "solicitor_card",
    title: "律師樓卡片（如有）",
    description: "如已委任律師樓，請提供名片或聯絡資料卡。",
    purpose: "便於後續跟進按揭文件及交易安排",
    required: false,
    accept: "image/*,.pdf,application/pdf",
    formatsHint: "PDF／圖片",
    section: "property",
    allowSkip: true,
    aiFocus: ["律師樓名稱", "聯絡資料"],
  },
  {
    id: "mortgage_repayment_bank_3m",
    title: "最近三個月按揭供款銀行戶口紀錄",
    description: "顯示按揭自動轉賬／供款紀錄的銀行月結或交易紀錄。",
    purpose: "核對按揭供款是否準時、分析供款穩定性、還款能力參考",
    required: true,
    accept: ".pdf,application/pdf,image/*",
    formatsHint: "PDF／圖片",
    section: "existing_mortgage",
    allowSkip: false,
    aiFocus: ["供款準時度", "供款穩定性"],
  },
  {
    id: "work_card",
    title: "工作卡片（如有）",
    description: "名片或職員卡；如無可選「沒有此文件」。",
    purpose: "輔助核對職位及工作機構資料",
    required: false,
    accept: "image/*,.pdf,application/pdf",
    formatsHint: "PDF／圖片",
    section: "identity",
    allowSkip: true,
    aiFocus: ["職位", "工作機構"],
  },
];

const SHELL_SLOTS: MortgageDocSlotDef[] = [
  {
    id: "shell_br",
    title: "BR（商業登記證）",
    description: "空殼／SPV／Holding Company 商業登記證。",
    purpose: "確認公司身份",
    required: true,
    accept: "image/*,.pdf,application/pdf",
    formatsHint: "PDF／圖片",
    section: "company",
    allowSkip: false,
    aiFocus: ["公司名稱", "BR 號碼"],
  },
  {
    id: "shell_ci",
    title: "CI（公司註冊證明書）",
    description: "公司註冊證明書（Certificate of Incorporation）。",
    purpose: "確認公司註冊資料",
    required: true,
    accept: "image/*,.pdf,application/pdf",
    formatsHint: "PDF／圖片",
    section: "company",
    allowSkip: false,
    aiFocus: ["公司名稱", "註冊編號"],
  },
  {
    id: "shell_bank_6m",
    title: "公司最近 6 個月月結單",
    description: "公司銀行戶口最近連續 6 個月月結單。",
    purpose: "分析公司現金流",
    required: true,
    accept: ".pdf,application/pdf",
    formatsHint: "PDF",
    section: "company",
    allowSkip: false,
    aiFocus: ["公司現金流", "戶口持有人"],
  },
  {
    id: "shell_financials",
    title: "財務報告表",
    description: "公司最近財務報表／管理賬。",
    purpose: "評估公司資產狀況",
    required: true,
    accept: "image/*,.pdf,application/pdf",
    formatsHint: "PDF／圖片",
    section: "company",
    allowSkip: false,
    aiFocus: ["公司資產狀況", "財務數字"],
  },
];

export function mortgageDocSlots(input: {
  kind: MortgageKind;
  includeShellCompany?: boolean;
}): MortgageDocSlotDef[] {
  const base = input.kind === "new_buy" ? NEW_BUY_SLOTS : REFINANCE_SLOTS;
  if (input.includeShellCompany) return [...base, ...SHELL_SLOTS];
  return base;
}

export function emptyMortgageCalcInput(
  defaults?: Partial<MortgageCalcInput>,
): MortgageCalcInput {
  return {
    propertyValueHkd: null,
    loanAmountHkd: null,
    ltvPct: 60,
    tenureYears: 25,
    annualRatePct: 3,
    monthlyIncomeHkd: null,
    existingMonthlyDebtsHkd: null,
    rememberInputs: false,
    ...defaults,
  };
}

export function syncLoanAmountFromLtv(input: MortgageCalcInput): number | null {
  if (input.propertyValueHkd == null || input.propertyValueHkd <= 0) return null;
  return Math.round((input.propertyValueHkd * input.ltvPct) / 100);
}

export function syncLtvFromLoanAmount(input: MortgageCalcInput): number | null {
  const ltv = newLoanLtv(
    input.loanAmountHkd ?? 0,
    input.propertyValueHkd ?? 0,
  );
  if (ltv == null) return null;
  return Math.round(ltv * 1000) / 10;
}

export function computeMortgageCalc(
  input: MortgageCalcInput,
): MortgageCalcResult {
  const newMonthly = mortgageMonthlyPayment(
    input.loanAmountHkd,
    input.annualRatePct,
    input.tenureYears,
  );
  const existing = input.existingMonthlyDebtsHkd;
  const income = input.monthlyIncomeHkd;
  const totalDebts =
    newMonthly == null || existing == null ? null : newMonthly + existing;
  const dsr = debtServicingRatio(existing, newMonthly, income);
  const dsrPct = dsr == null ? null : Math.round(dsr * 10000) / 100;

  let dsrTone: MortgageCalcResult["dsrTone"] = "unknown";
  if (dsrPct != null) {
    if (dsrPct < 40) dsrTone = "green";
    else if (dsrPct < 50) dsrTone = "amber";
    else dsrTone = "red";
  }

  const narrative =
    dsrPct == null
      ? "請填妥每月總收入、現有每月總債務供款，以及物業／貸款資料後再計算。此結果只供初步參考，並非正式批核。"
      : `根據目前輸入資料，連同新申請按揭供款後，你的總供款比率約為 ${dsrPct.toFixed(2)}%。實際批核結果仍需按銀行政策、收入證明及完整文件作最終審核。`;

  return {
    newMonthlyRepaymentHkd: newMonthly,
    totalMonthlyDebtsHkd: totalDebts,
    monthlyIncomeHkd: income,
    dsr,
    dsrPct,
    dsrTone,
    narrative,
    formulaNotes: [
      FORMULA_DEFINITIONS.mortgageMonthlyPayment,
      FORMULA_DEFINITIONS.debtServicingRatio,
    ],
  };
}

export function mortgageDocTitleById(
  id: string | null | undefined,
): string | null {
  if (!id) return null;
  const all = [...NEW_BUY_SLOTS, ...REFINANCE_SLOTS, ...SHELL_SLOTS];
  return all.find((s) => s.id === id)?.title ?? null;
}

/** 文件管理／補件：依貸款類型列出可選文件類型 */
export function documentTypesForLoanType(
  loanType: string | null | undefined,
): string[] {
  if (loanType === "personal_mortgage" || loanType === "company_mortgage") {
    const kindHint =
      loanType === "company_mortgage"
        ? ([...NEW_BUY_SLOTS, ...REFINANCE_SLOTS, ...SHELL_SLOTS] as MortgageDocSlotDef[])
        : ([...NEW_BUY_SLOTS, ...REFINANCE_SLOTS] as MortgageDocSlotDef[]);
    const titles = [...new Set(kindHint.map((s) => s.title))];
    return [...titles, "其他"];
  }
  if (loanType === "secured") {
    return [
      "商業登記證 BR",
      "審計報告",
      "銀行結單",
      "身份證明",
      "物業證明",
      "授信信",
      "抵押品文件",
      "其他",
    ];
  }
  if (loanType === "unsecured") {
    return [
      "商業登記證 BR",
      "審計報告",
      "銀行結單",
      "身份證明",
      "授信信",
      "其他",
    ];
  }
  // 未選類型：全部
  return [
    "商業登記證 BR",
    "審計報告",
    "銀行結單",
    "身份證明",
    "物業證明",
    "授信信",
    "抵押品文件",
    ...[...NEW_BUY_SLOTS, ...REFINANCE_SLOTS, ...SHELL_SLOTS].map((s) => s.title),
    "其他",
  ].filter((v, i, arr) => arr.indexOf(v) === i);
}

export type MortgageAiSlot = {
  id: MortgageDocSlotId;
  title: string;
  description: string;
  aiFocus: string[];
  /** 對應 /api/analyze-document docKind */
  analyzeKind: "identity" | "bank" | "br" | "financial" | "audited";
  accept: string;
  section: MortgageDocSectionId;
};

function toAiSlot(def: MortgageDocSlotDef): MortgageAiSlot {
  let analyzeKind: MortgageAiSlot["analyzeKind"] = "financial";
  if (def.id === "identity") analyzeKind = "identity";
  else if (def.id === "shell_br") analyzeKind = "br";
  else if (
    def.id === "salary_bank_3m" ||
    def.id === "mortgage_repayment_bank_3m" ||
    def.id === "shell_bank_6m" ||
    def.id === "investment_accounts_3m"
  ) {
    analyzeKind = "bank";
  } else if (def.id === "shell_financials") {
    analyzeKind = "audited";
  }
  return {
    id: def.id,
    title: def.title,
    description: def.description,
    aiFocus: def.aiFocus,
    analyzeKind,
    accept: def.accept,
    section: def.section,
  };
}

/** AI 分析中心：按揭模式下的文件分析類型 */
export function mortgageAiAnalyzeSlots(input: {
  loanType: "personal_mortgage" | "company_mortgage";
  kind?: MortgageKind | null;
  includeShellCompany?: boolean;
}): MortgageAiSlot[] {
  let base: MortgageDocSlotDef[];
  if (input.kind === "refinance") base = REFINANCE_SLOTS;
  else if (input.kind === "new_buy") base = NEW_BUY_SLOTS;
  else {
    base = [...NEW_BUY_SLOTS, ...REFINANCE_SLOTS].filter(
      (s, i, arr) => arr.findIndex((x) => x.id === s.id) === i,
    );
  }
  const shell =
    input.loanType === "company_mortgage" && input.includeShellCompany
      ? SHELL_SLOTS
      : [];
  return [...base, ...shell].map(toAiSlot);
}

export function dsrToneClasses(tone: MortgageCalcResult["dsrTone"]) {
  if (tone === "green") return "border-border bg-success-100 text-success-600";
  if (tone === "amber") return "border-border bg-warning-100 text-warning-600";
  if (tone === "red") return "border-border bg-danger-100 text-danger-600";
  return "border-border bg-surface-2 text-text-secondary";
}

