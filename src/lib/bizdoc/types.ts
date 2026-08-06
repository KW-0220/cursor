/** 公司成立及商業戶口申請 — domain types */

import type { BizClassification, DocCategoryId } from "./classification";
import type { BizDocSlotId, SlotRequirement, InterviewItemStatus } from "./documents";
import { emptyClassification } from "./classification";

export type { BizDocSlotId, SlotRequirement, InterviewItemStatus } from "./documents";
export type {
  BizClassification,
  DocCategoryId,
  ShareholderIdentity,
  CompanyAgeBand,
  RelatedCompanyFlag,
  DocGroupId,
} from "./classification";

export type BizApplicationStatus =
  | "draft"
  | "missing_docs"
  | "submitted"
  | "doc_review"
  | "needs_supplement"
  | "supplement_review"
  | "docs_complete"
  | "interview_prep"
  | "next_stage"
  | "sent_to_institution"
  | "institution_processing"
  | "needs_further_info"
  | "completed"
  | "paused";

export type BizDocStatus =
  | "not_uploaded"
  | "uploaded"
  | "awaiting_review"
  | "reviewing"
  | "approved"
  | "needs_resubmit"
  | "unclear"
  | "expired"
  | "incomplete"
  | "wrong_type"
  | "inconsistent"
  | "reuploaded"
  | "not_applicable";

export type WhatsAppSendStatus =
  | "queued"
  | "sending"
  | "sent"
  | "delivered"
  | "failed"
  | "invalid_number"
  | "undeliverable"
  | "resent";

/** @deprecated 舊五類；新系統用 DocGroupId A–J */
export type BizDocCategory =
  | "company"
  | "identity"
  | "address"
  | "business_proof"
  | "business_alt";

export interface BizApplicant {
  name: string;
  relation: string;
  email: string;
  phone: string;
  whatsapp: string;
  bestContactTime: string;
  preferredLanguage: "zh-Hant" | "en";
  authorized: boolean;
}

export interface BizCompany {
  nameZh: string;
  nameEn: string;
  crNumber: string;
  brNumber: string;
  foundedAt: string;
  companyType: string;
  registeredAddress: string;
  businessAddress: string;
  phone: string;
  email: string;
  website: string;
  nature: string;
  products: string;
  incomeSource: string;
  monthlyTurnover: string;
  yearlyTurnover: string;
  employees: string;
  hasOtherBankAccount: boolean | null;
  appliedBefore: boolean | null;
  rejectedBefore: boolean | null;
}

export interface BizAccountNeeds {
  hkd: boolean;
  cny: boolean;
  usd: boolean;
  otherFx: boolean;
  internetBanking: boolean;
  debitCard: boolean;
  remittance: boolean;
  firstDeposit: string;
  monthlyVolume: string;
  preferredBank: string;
  expectedDate: string;
  purpose: string;
}

export interface BizDirector {
  id: string;
  nameZh: string;
  nameEn: string;
  idType: "hkid" | "passport";
  idNumber: string;
  nationality: string;
  dateOfBirth: string;
  phone: string;
  email: string;
  residenceCountry: string;
  isShareholder: boolean;
  sharePercent?: string;
  isPrimaryContact: boolean;
}

export interface BizShareholder {
  id: string;
  name: string;
  type: "individual" | "company";
  sharePercent: string;
  isDirector: boolean;
  isUbo: boolean;
}

export interface BizUbo {
  id: string;
  name: string;
  ownershipPercent: string;
  nationality: string;
  idType: "hkid" | "passport";
  idNumber: string;
}

export interface BizBusinessRegion {
  operatingCountries: string[];
  customerCountries: string[];
  supplierCountries: string[];
  receiveCountries: string[];
  payCountries: string[];
  crossBorder: boolean | null;
  mainCurrencies: string[];
  monthlyReceiveCount: string;
  monthlyPayCount: string;
  monthlyReceiveAmount: string;
  monthlyPayAmount: string;
  maxSingleAmount: string;
  cashTransactions: boolean | null;
  onlineSales: boolean | null;
  thirdPartyPayment: boolean | null;
}

export interface BizBusinessProofMeta {
  docType: string;
  counterparty: string;
  tradeDate: string;
  amount: string;
  currency: string;
  description: string;
  countries: string[];
  invoiceNo?: string;
}

export interface BizRelatedCompany {
  name: string;
  location: string;
  relation: string;
  notes: string;
}

export type Nar1Option = "has_nar1" | "under_one_year" | "not_yet";
export type TradingStatus = "operating" | "not_started" | "preparing";

export interface BizUploadedFile {
  id: string;
  slotId: BizDocSlotId;
  personId?: string;
  originalName: string;
  storedName: string;
  sizeBytes: number;
  mimeType: string;
  uploadedAt: string;
  uploadedBy: string;
  status: BizDocStatus;
  issueType?: string;
  issueReason?: string;
  adminNote?: string;
  version: number;
  proofMeta?: BizBusinessProofMeta;
}

export interface BizConsent {
  privacy: boolean;
  terms: boolean;
  dataUse: boolean;
  whatsapp: boolean;
  electronic: boolean;
  thirdParty: boolean;
  bankTransfer: boolean;
  truthfulness: boolean;
}

export interface BizWhatsAppMessage {
  id: string;
  type: "submitted" | "supplement" | "docs_complete" | "custom";
  content: string;
  phone: string;
  sentAt: string;
  status: WhatsAppSendStatus;
  failReason?: string;
}

export interface BizTimelineEvent {
  id: string;
  status: BizApplicationStatus | "account_created" | "whatsapp_sent";
  label: string;
  at: string;
  description: string;
  clientAction?: string;
  whatsappStatus?: WhatsAppSendStatus;
}

export interface BizInternalNote {
  id: string;
  author: string;
  content: string;
  createdAt: string;
}

export interface BizAuditEntry {
  id: string;
  actor: string;
  action: string;
  detail: string;
  at: string;
}

export interface BizExtraDocRequest {
  id: string;
  name: string;
  description: string;
  requirement: string;
  formats: string[];
  reason: string;
  deadline?: string;
  createdAt: string;
  createdBy: string;
}

export interface BizApplication {
  id: string;
  createdAt: string;
  updatedAt: string;
  submittedAt?: string;
  status: BizApplicationStatus;
  completeness: number;
  assignee?: string;
  applicant: BizApplicant;
  company: BizCompany;
  accountNeeds: BizAccountNeeds;
  directors: BizDirector[];
  shareholders: BizShareholder[];
  ubos: BizUbo[];
  classification: BizClassification;
  relatedCompany: BizRelatedCompany;
  slotOverrides: Partial<Record<string, SlotRequirement>>;
  interviewChecklist: Record<string, InterviewItemStatus>;
  extraDocRequests: BizExtraDocRequest[];
  nar1Option: Nar1Option | null;
  tradingStatus: TradingStatus | null;
  businessRegion: BizBusinessRegion;
  businessSet1: BizBusinessProofMeta;
  businessSet2: BizBusinessProofMeta;
  hkBusinessProofs: [BizBusinessProofMeta, BizBusinessProofMeta, BizBusinessProofMeta];
  relatedInvoices: [BizBusinessProofMeta, BizBusinessProofMeta, BizBusinessProofMeta];
  files: BizUploadedFile[];
  consents: BizConsent;
  timeline: BizTimelineEvent[];
  whatsapp: BizWhatsAppMessage[];
  internalNotes: BizInternalNote[];
  auditLog: BizAuditEntry[];
  pausedReason?: string;
}

export const BIZ_STATUS_LABEL: Record<BizApplicationStatus, string> = {
  draft: "申請資料填寫中",
  missing_docs: "尚欠文件",
  submitted: "已提交，處理中",
  doc_review: "文件檢查中",
  needs_supplement: "需要補交資料",
  supplement_review: "補交文件檢查中",
  docs_complete: "文件已收齊",
  interview_prep: "面簽安排中",
  next_stage: "下一階段處理中",
  sent_to_institution: "已提交相關機構",
  institution_processing: "相關機構處理中",
  needs_further_info: "需要進一步資料",
  completed: "已完成",
  paused: "暫停處理",
};

export const BIZ_STATUS_DESC: Record<BizApplicationStatus, string> = {
  draft: "申請資料尚未完成。",
  missing_docs: "仍有必須文件或資料未完成。",
  submitted: "系統已收到申請，團隊將開始檢查資料及文件。",
  doc_review: "團隊正在逐項檢查文件是否完整、有效及清晰。",
  needs_supplement: "部分資料或文件需要補充、修正或重新上載。",
  supplement_review: "團隊正在檢查最新補交的資料及文件。",
  docs_complete: "所有初步所需文件已確認收齊，申請將進入下一階段。",
  interview_prep: "文件已收齊，正在安排面簽及後續步驟。",
  next_stage: "團隊正在處理後續安排。",
  sent_to_institution: "申請資料已提交至相關銀行或合作機構處理。",
  institution_processing: "相關機構正在處理申請，實際進度視個別情況而定。",
  needs_further_info: "相關機構要求提供額外資料。",
  completed: "本次申請流程已完成。",
  paused: "因資料、文件或其他原因，申請暫時未能繼續。",
};

export const BIZ_STATUS_CTA: Partial<Record<BizApplicationStatus, string>> = {
  draft: "繼續填寫",
  missing_docs: "查看尚欠項目",
  needs_supplement: "查看補件要求",
  needs_further_info: "查看所需資料",
  interview_prep: "查看面簽準備",
};

export const BIZ_DOC_STATUS_LABEL: Record<BizDocStatus, string> = {
  not_uploaded: "尚未上載",
  uploaded: "已上載",
  awaiting_review: "等待檢查",
  reviewing: "檢查中",
  approved: "已通過",
  needs_resubmit: "需要補交",
  unclear: "文件不清晰",
  expired: "文件過期",
  incomplete: "文件不完整",
  wrong_type: "文件類型錯誤",
  inconsistent: "資料不一致",
  reuploaded: "已重新上載",
  not_applicable: "不適用",
};

export const DOC_ISSUE_REASONS = [
  "文件不清晰",
  "文件裁剪不完整",
  "文件已過期",
  "文件頁數不完整",
  "姓名不一致",
  "公司名稱不一致",
  "地址不一致",
  "文件類型錯誤",
  "缺少部分頁面",
  "無法確認資料",
  "需要其他補充文件",
  "月份不連續",
  "發票／合約數量不足",
] as const;

export const APPLY_STEPS = [
  { id: "classify", label: "申請分類", short: "分類" },
  { id: "confirm-class", label: "確認文件類別", short: "確認類別" },
  { id: "applicant", label: "申請人資料", short: "申請人" },
  { id: "company", label: "公司資料", short: "公司" },
  { id: "people", label: "董事及股東", short: "董事股東" },
  { id: "documents", label: "上載文件", short: "文件" },
  { id: "interview", label: "面簽準備", short: "面簽" },
  { id: "regions", label: "業務地區及交易", short: "地區交易" },
  { id: "review", label: "檢查及提交", short: "提交" },
] as const;

export type ApplyStepId = (typeof APPLY_STEPS)[number]["id"];

export function emptyRelatedCompany(): BizRelatedCompany {
  return { name: "", location: "", relation: "", notes: "" };
}

export function emptyProofMeta(): BizBusinessProofMeta {
  return {
    docType: "",
    counterparty: "",
    tradeDate: "",
    amount: "",
    currency: "HKD",
    description: "",
    countries: [],
    invoiceNo: "",
  };
}

export { emptyClassification };
