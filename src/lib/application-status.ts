/**
 * 客戶端申請狀態（/app/applications）
 * 提交後進入「審批中」；後續可由後台更新為批核／失敗。
 */

export const CLIENT_APP_STATUSES = [
  "under_review",
  "approved",
  "rejected",
] as const;

export type ClientAppStatus = (typeof CLIENT_APP_STATUSES)[number];

/** 客戶端顯示用 */
export const CLIENT_APP_STATUS_LABEL: Record<ClientAppStatus, string> = {
  under_review: "審批中",
  approved: "成功批核",
  rejected: "申請失敗",
};

/** 後台案件總覽顯示／下拉選項 */
export const ADMIN_APP_STATUS_LABEL: Record<ClientAppStatus, string> = {
  under_review: "審批中",
  approved: "已批核",
  rejected: "拒絕",
};

export const CLIENT_APP_STATUS_TONE: Record<ClientAppStatus, string> = {
  under_review: "bg-navy-900/10 text-navy-800",
  approved: "bg-success-100 text-success-600",
  rejected: "bg-danger-100 text-danger-600",
};

/** 正規化舊值（submitted／已提交／英文 status）→ 三種正式狀態 */
export function normalizeClientAppStatus(raw: unknown): ClientAppStatus {
  const s = String(raw ?? "")
    .trim()
    .toLowerCase();

  if (
    s === "approved" ||
    s === "成功批核" ||
    s === "已批核" ||
    s === "已獲批核" ||
    s === "matched"
  ) {
    return "approved";
  }

  if (
    s === "rejected" ||
    s === "not_approved" ||
    s === "not approved" ||
    s === "申請失敗" ||
    s === "拒絕" ||
    s === "未能批核" ||
    s === "failed"
  ) {
    return "rejected";
  }

  // submitted / under_review / AI processing / 預設全部當審批中
  return "under_review";
}

export function clientAppStatusLabel(raw: unknown): string {
  return CLIENT_APP_STATUS_LABEL[normalizeClientAppStatus(raw)];
}

export function adminAppStatusLabel(raw: unknown): string {
  return ADMIN_APP_STATUS_LABEL[normalizeClientAppStatus(raw)];
}

export function clientAppStatusTone(raw: unknown): string {
  return CLIENT_APP_STATUS_TONE[normalizeClientAppStatus(raw)];
}

export function isClientAppStatus(raw: unknown): raw is ClientAppStatus {
  return CLIENT_APP_STATUSES.includes(
    String(raw ?? "").trim() as ClientAppStatus,
  );
}
