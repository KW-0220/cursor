/**
 * 申請狀態生命週期（規格 §六）
 * 與舊 mock 用 ApplicationStatus 分開；真實草稿／提交走呢套。
 */

export type LoanAppStatus =
  | "DRAFT"
  | "IN_PROGRESS"
  | "READY_TO_SUBMIT"
  | "SUBMITTED"
  | "UNDER_ANALYSIS"
  | "ADDITIONAL_INFO_REQUIRED"
  | "UNDER_REVIEW"
  | "SHARED_WITH_LENDER"
  | "COMPLETED"
  | "WITHDRAWN"
  | "EXPIRED";

export const LOAN_APP_STATUS_LABEL: Record<LoanAppStatus, string> = {
  DRAFT: "草稿",
  IN_PROGRESS: "填寫中",
  READY_TO_SUBMIT: "可以提交",
  SUBMITTED: "已提交",
  UNDER_ANALYSIS: "文件分析中",
  ADDITIONAL_INFO_REQUIRED: "需要補充資料",
  UNDER_REVIEW: "審核中",
  SHARED_WITH_LENDER: "已送交貸款機構",
  COMPLETED: "已完成",
  WITHDRAWN: "已撤回",
  EXPIRED: "草稿已過期",
};

export const DRAFT_STATUSES: LoanAppStatus[] = [
  "DRAFT",
  "IN_PROGRESS",
  "READY_TO_SUBMIT",
];

export function isEditableDraftStatus(status: LoanAppStatus) {
  return DRAFT_STATUSES.includes(status);
}

/** 草稿預設保存期限（日） */
export function draftExpiryDays() {
  const n = Number(process.env.DRAFT_EXPIRY_DAYS || "90");
  return Number.isFinite(n) && n > 0 ? n : 90;
}
