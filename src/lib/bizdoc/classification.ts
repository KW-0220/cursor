/** 申請前分類 → 六類文件規則 */

export type ShareholderIdentity = "mainland" | "foreign" | "hk_local";
export type CompanyAgeBand = "under_one_year" | "over_one_year";
export type RelatedCompanyFlag = "yes" | "no";

/** 標準六類；3r／6r = 港人 + 有關聯公司（規格表未列，系統擴充） */
export type DocCategoryId = 1 | 2 | 3 | 4 | 5 | 6 | "3r" | "6r";

export type DocGroupId =
  | "A"
  | "B"
  | "C"
  | "D"
  | "E"
  | "F"
  | "G"
  | "H"
  | "I"
  | "J";

export const SHAREHOLDER_IDENTITY_LABEL: Record<ShareholderIdentity, string> = {
  mainland: "內地人士",
  foreign: "外國人士",
  hk_local: "香港本地人士",
};

export const COMPANY_AGE_LABEL: Record<CompanyAgeBand, string> = {
  under_one_year: "新成立公司／成立未滿一年",
  over_one_year: "成立超過一年",
};

export const RELATED_COMPANY_LABEL: Record<RelatedCompanyFlag, string> = {
  yes: "有內地或海外關聯公司",
  no: "沒有其他關聯公司",
};

export const DOC_CATEGORY_LABEL: Record<DocCategoryId, string> = {
  1: "類別 1：內地／外國人士 · 新成立 · 有關聯公司",
  2: "類別 2：內地／外國人士 · 新成立 · 無關聯公司",
  3: "類別 3：香港本地人士 · 新成立 · 無關聯公司",
  4: "類別 4：內地／外國人士 · 超過一年 · 有關聯公司",
  5: "類別 5：內地／外國人士 · 超過一年 · 無關聯公司",
  6: "類別 6：香港本地人士 · 超過一年 · 無關聯公司",
  "3r": "類別 3R：香港本地人士 · 新成立 · 有關聯公司",
  "6r": "類別 6R：香港本地人士 · 超過一年 · 有關聯公司",
};

export const DOC_CATEGORY_SHORT: Record<DocCategoryId, string> = {
  1: "內地／外國人士｜新成立｜有關聯公司",
  2: "內地／外國人士｜新成立｜無關聯公司",
  3: "香港本地人士｜新成立｜無關聯公司",
  4: "內地／外國人士｜超過一年｜有關聯公司",
  5: "內地／外國人士｜超過一年｜無關聯公司",
  6: "香港本地人士｜超過一年｜無關聯公司",
  "3r": "香港本地人士｜新成立｜有關聯公司",
  "6r": "香港本地人士｜超過一年｜有關聯公司",
};

export const DOC_GROUP_LABEL: Record<DocGroupId, string> = {
  A: "香港公司基本文件",
  B: "申請人身份證明",
  C: "個人背景證明",
  D: "個人銀行流水",
  E: "關聯公司證明",
  F: "關聯公司銀行流水",
  G: "發票、合約及業務證明",
  H: "香港公司銀行結單",
  I: "香港公司審計報告",
  J: "面簽當天帶備文件",
};

export interface BizClassification {
  shareholderIdentity: ShareholderIdentity | null;
  companyAge: CompanyAgeBand | null;
  hasRelatedCompany: RelatedCompanyFlag | null;
  /** 系統配對 */
  systemCategory: DocCategoryId | null;
  /** 客戶確認 */
  clientConfirmed: boolean;
  confirmedAt?: string;
  /** 後台覆寫 */
  overrideCategory: DocCategoryId | null;
  overrideReason?: string;
  overrideBy?: string;
  overrideAt?: string;
  previousCategory?: DocCategoryId | null;
}

export function emptyClassification(): BizClassification {
  return {
    shareholderIdentity: null,
    companyAge: null,
    hasRelatedCompany: null,
    systemCategory: null,
    clientConfirmed: false,
    overrideCategory: null,
  };
}

/** 由成立日期推算年期（仍須客戶確認） */
export function inferCompanyAgeBand(
  foundedAt: string,
  now = new Date(),
): CompanyAgeBand | null {
  if (!foundedAt) return null;
  const d = new Date(foundedAt);
  if (Number.isNaN(d.getTime())) return null;
  const ms = now.getTime() - d.getTime();
  const days = ms / (1000 * 60 * 60 * 24);
  return days >= 365 ? "over_one_year" : "under_one_year";
}

export function resolveDocCategory(
  identity: ShareholderIdentity,
  age: CompanyAgeBand,
  related: RelatedCompanyFlag,
): DocCategoryId {
  const nonLocal = identity === "mainland" || identity === "foreign";
  if (nonLocal && age === "under_one_year" && related === "yes") return 1;
  if (nonLocal && age === "under_one_year" && related === "no") return 2;
  if (identity === "hk_local" && age === "under_one_year" && related === "no")
    return 3;
  if (nonLocal && age === "over_one_year" && related === "yes") return 4;
  if (nonLocal && age === "over_one_year" && related === "no") return 5;
  if (identity === "hk_local" && age === "over_one_year" && related === "no")
    return 6;
  if (identity === "hk_local" && age === "under_one_year" && related === "yes")
    return "3r";
  return "6r";
}

export function effectiveCategory(c: BizClassification): DocCategoryId | null {
  return c.overrideCategory ?? c.systemCategory;
}

export function classificationSummary(c: BizClassification): string {
  const cat = effectiveCategory(c);
  if (!cat) return "尚未完成分類";
  return DOC_CATEGORY_SHORT[cat];
}

export function isClassificationComplete(c: BizClassification): boolean {
  return Boolean(
    c.shareholderIdentity &&
      c.companyAge &&
      c.hasRelatedCompany &&
      c.systemCategory &&
      c.clientConfirmed,
  );
}
