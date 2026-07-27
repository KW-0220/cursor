/**
 * 第三方分享：授權紀錄 ≠ 實際分享紀錄
 * 客戶端 localStorage 示範；後台用 DEMO 審計資料。
 */

export type OrgType =
  | "銀行"
  | "持牌放債人"
  | "貸款顧問"
  | "信貸評估服務商"
  | "身份驗證服務商"
  | "物業估值服務商"
  | "法律或合規服務商"
  | "技術及雲端服務供應商";

export type SharePurpose =
  | "評估貸款申請"
  | "核實申請資料"
  | "進行身份驗證"
  | "進行信用評估"
  | "進行物業估值"
  | "提供貸款報價或條件"
  | "跟進正式批核"
  | "完成合規或法定要求";

export type AuthStatus = "有效" | "已撤回" | "已到期" | "被取代";

export type TransferStatus =
  | "已授權，未分享"
  | "傳送中"
  | "已成功分享"
  | "部分資料分享失敗"
  | "傳送失敗"
  | "授權已撤回"
  | "授權已過期";

export type AuthMethod =
  | "App 勾選確認"
  | "電子簽署"
  | "OTP 驗證"
  | "人工書面授權"
  | "貸款顧問上載客戶已簽署文件";

export type ShareDataCategory = {
  id: string;
  title: string;
  items: string[];
};

export const SHARE_DATA_CATEGORIES: ShareDataCategory[] = [
  {
    id: "company",
    title: "公司資料",
    items: [
      "公司名稱",
      "商業登記號碼",
      "公司註冊編號",
      "公司地址",
      "業務性質",
    ],
  },
  {
    id: "people",
    title: "人士資料",
    items: [
      "董事姓名",
      "股東姓名",
      "持股比例",
      "擔保人資料",
      "身份證明文件",
    ],
  },
  {
    id: "finance",
    title: "財務及銀行資料",
    items: [
      "最近六個月銀行月結單",
      "每日平均餘額",
      "每月進帳",
      "交易分析結果",
      "現有債務資料",
      "財務報表及補充文件",
    ],
  },
  {
    id: "application",
    title: "申請資料",
    items: [
      "貸款類型",
      "申請金額",
      "貸款用途",
      "初步評估結果",
      "補件及審批紀錄",
    ],
  },
];

export const AUTH_CONFIRM_CHECKS = [
  {
    id: "read_scope",
    label: "我已閱讀及明白上述資料分享範圍及目的。",
  },
  {
    id: "authorize_share",
    label: "我授權 SME LoanFlow 將所列資料提供予上述指定機構。",
  },
  {
    id: "org_privacy",
    label: "我明白相關機構可能按其私隱政策處理我的資料。",
  },
  {
    id: "authority",
    label: "我確認本人有權代表公司及相關人士作出此項授權。",
  },
] as const;

export type AuthConfirmCheckId = (typeof AUTH_CONFIRM_CHECKS)[number]["id"];

export type ThirdPartyRecipient = {
  id: string;
  name: string;
  orgType: OrgType;
  privacyUrl: string;
  purposes: SharePurpose[];
  plannedShareAt: string;
  retentionNote: string;
  dataCategoryIds: string[];
};

export const DEMO_THIRD_PARTY_RECIPIENTS: ThirdPartyRecipient[] = [
  {
    id: "advisor-demo",
    name: "SME LoanFlow 指定貸款顧問團隊",
    orgType: "貸款顧問",
    privacyUrl: "/app/account/data-use",
    purposes: ["評估貸款申請", "核實申請資料", "跟進正式批核"],
    plannedShareAt: "你確認授權後即時",
    retentionNote: "按申請處理期間保存，完結後依私隱政策刪除或匿名化。",
    dataCategoryIds: ["company", "people", "finance", "application"],
  },
  {
    id: "bank-demo",
    name: "示範合作銀行（個案提交時指定）",
    orgType: "銀行",
    privacyUrl: "/app/account/data-use",
    purposes: [
      "評估貸款申請",
      "進行信用評估",
      "提供貸款報價或條件",
      "完成合規或法定要求",
    ],
    plannedShareAt: "提交至該銀行審批時",
    retentionNote: "由接收銀行按其私隱政策及監管要求保存。",
    dataCategoryIds: ["company", "people", "finance", "application"],
  },
  {
    id: "kyc-demo",
    name: "示範身份驗證服務商",
    orgType: "身份驗證服務商",
    privacyUrl: "/app/account/data-use",
    purposes: ["進行身份驗證", "核實申請資料", "完成合規或法定要求"],
    plannedShareAt: "啟動正式 KYC 流程時",
    retentionNote: "僅保留完成驗證所需期間，詳見服務商私隱聲明。",
    dataCategoryIds: ["people"],
  },
];

/** 授權文字／政策版本（重大改動須重新確認） */
export const THIRD_PARTY_AUTH_POLICY_VERSION = "2026-07-27-share-v2";
export const PRIVACY_POLICY_VERSION = "2026-07-27-privacy-v1";

export type WithdrawRecord = {
  withdrawnAt: string;
  reason?: string;
  impactAcknowledged: boolean;
};

export type ThirdPartyAuthRecord = {
  id: string;
  recipientId: string;
  recipientName: string;
  orgType: OrgType;
  purposes: SharePurpose[];
  dataCategoryIds: string[];
  authorizedAt: string;
  /** 系統實際傳送時間；未傳送則 null */
  sharedAt: string | null;
  status: AuthStatus;
  policyVersion: string;
  privacyPolicyVersion: string;
  authMethod: AuthMethod;
  confirmChecks: AuthConfirmCheckId[];
  applicationId: string;
  companyId: string;
  userId: string;
  withdraw?: WithdrawRecord;
  replacedById?: string;
  timezone: string;
};

export type ActualShareRecord = {
  id: string;
  authId: string;
  recipientId: string;
  recipientName: string;
  sharedAt: string;
  transferMethod: string;
  dataSummary: string[];
  documentVersions: string[];
  encrypted: boolean;
  status: TransferStatus;
  receivedAck: boolean;
  failureReason?: string;
  retryCount: number;
  operator: string;
};

const AUTH_KEY = "slf_third_party_auth_v2";
const SHARE_KEY = "slf_actual_share_v1";

export function loadThirdPartyAuths(userKey = "anon"): ThirdPartyAuthRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(`${AUTH_KEY}:${userKey}`);
    if (!raw) return [];
    return JSON.parse(raw) as ThirdPartyAuthRecord[];
  } catch {
    return [];
  }
}

export function saveThirdPartyAuths(
  records: ThirdPartyAuthRecord[],
  userKey = "anon",
) {
  if (typeof window === "undefined") return;
  localStorage.setItem(`${AUTH_KEY}:${userKey}`, JSON.stringify(records));
}

export function loadActualShares(userKey = "anon"): ActualShareRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(`${SHARE_KEY}:${userKey}`);
    if (!raw) return [];
    return JSON.parse(raw) as ActualShareRecord[];
  } catch {
    return [];
  }
}

export function saveActualShares(
  records: ActualShareRecord[],
  userKey = "anon",
) {
  if (typeof window === "undefined") return;
  localStorage.setItem(`${SHARE_KEY}:${userKey}`, JSON.stringify(records));
}

export function getAuthById(
  id: string,
  userKey = "anon",
): ThirdPartyAuthRecord | undefined {
  return loadThirdPartyAuths(userKey).find((r) => r.id === id);
}

export function categoriesForIds(ids: string[]) {
  return SHARE_DATA_CATEGORIES.filter((c) => ids.includes(c.id));
}

export function statusTone(status: AuthStatus | TransferStatus) {
  if (status === "有效" || status === "已成功分享") return "green" as const;
  if (
    status === "已撤回" ||
    status === "授權已撤回" ||
    status === "傳送失敗" ||
    status === "部分資料分享失敗"
  )
    return "red" as const;
  if (status === "傳送中" || status === "已授權，未分享")
    return "amber" as const;
  return "gray" as const;
}

export function appendThirdPartyAuth(
  input: {
    recipient: ThirdPartyRecipient;
    purposes: SharePurpose[];
    confirmChecks: AuthConfirmCheckId[];
    applicationId?: string;
    companyId?: string;
    userId?: string;
    authMethod?: AuthMethod;
  },
  userKey = "anon",
) {
  const now = new Date().toISOString();
  const next: ThirdPartyAuthRecord = {
    id: `AUTH-${Date.now().toString(36).toUpperCase()}`,
    recipientId: input.recipient.id,
    recipientName: input.recipient.name,
    orgType: input.recipient.orgType,
    purposes: input.purposes,
    dataCategoryIds: input.recipient.dataCategoryIds,
    authorizedAt: now,
    sharedAt: null,
    status: "有效",
    policyVersion: THIRD_PARTY_AUTH_POLICY_VERSION,
    privacyPolicyVersion: PRIVACY_POLICY_VERSION,
    authMethod: input.authMethod ?? "App 勾選確認",
    confirmChecks: input.confirmChecks,
    applicationId: input.applicationId ?? "SLF-DRAFT",
    companyId: input.companyId ?? "CO-DRAFT",
    userId: input.userId ?? userKey,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Hong_Kong",
  };
  const list = loadThirdPartyAuths(userKey);
  // 同機構舊有效授權 → 被取代
  const updated = list.map((r) =>
    r.recipientId === next.recipientId && r.status === "有效"
      ? { ...r, status: "被取代" as const, replacedById: next.id }
      : r,
  );
  saveThirdPartyAuths([next, ...updated], userKey);

  // 建立對應「已授權，未分享」實際分享佔位（授權≠已傳送）
  const shares = loadActualShares(userKey);
  const pending: ActualShareRecord = {
    id: `XFR-${Date.now().toString(36).toUpperCase()}`,
    authId: next.id,
    recipientId: next.recipientId,
    recipientName: next.recipientName,
    sharedAt: "",
    transferMethod: "尚未傳送",
    dataSummary: categoriesForIds(next.dataCategoryIds).map((c) => c.title),
    documentVersions: [],
    encrypted: true,
    status: "已授權，未分享",
    receivedAck: false,
    retryCount: 0,
    operator: "系統（待排程）",
  };
  saveActualShares([pending, ...shares], userKey);

  return next;
}

export function withdrawAuth(
  authId: string,
  userKey = "anon",
  reason?: string,
) {
  const list = loadThirdPartyAuths(userKey);
  const now = new Date().toISOString();
  const next = list.map((r) =>
    r.id === authId && r.status === "有效"
      ? {
          ...r,
          status: "已撤回" as const,
          withdraw: {
            withdrawnAt: now,
            reason,
            impactAcknowledged: true,
          },
        }
      : r,
  );
  saveThirdPartyAuths(next, userKey);

  const shares = loadActualShares(userKey).map((s) =>
    s.authId === authId &&
    (s.status === "已授權，未分享" || s.status === "傳送中")
      ? { ...s, status: "授權已撤回" as const }
      : s,
  );
  saveActualShares(shares, userKey);
  return next.find((r) => r.id === authId);
}

/** 示範：模擬實際傳送成功（正式環境由後端任務完成） */
export function markShareSent(authId: string, userKey = "anon") {
  const now = new Date().toISOString();
  const auths = loadThirdPartyAuths(userKey).map((a) =>
    a.id === authId ? { ...a, sharedAt: now } : a,
  );
  saveThirdPartyAuths(auths, userKey);
  const shares = loadActualShares(userKey).map((s) =>
    s.authId === authId && s.status === "已授權，未分享"
      ? {
          ...s,
          sharedAt: now,
          transferMethod: "加密 API",
          status: "已成功分享" as const,
          receivedAck: true,
          documentVersions: ["bank-stmt-v1", "br-v1", "nar1-v1"],
          operator: "share-worker",
        }
      : s,
  );
  saveActualShares(shares, userKey);
}

export const WITHDRAW_IMPACTS = [
  "停止向尚未收到資料的第三方分享",
  "可能影響正在處理的貸款申請",
  "導致部分貸款機構無法繼續評估",
  "不一定能收回第三方已合法取得及處理的資料",
  "不影響撤回前已完成的合法資料處理",
];

export const WITHDRAW_COPY =
  "撤回授權後，我們將停止進行尚未完成的相關資料分享。已經傳送予第三方的資料，可能仍會按該機構的法律責任及資料保留政策處理。";

/** 授權版本重大改動（示範） */
export const AUTH_VERSION_CHANGES = [
  {
    version: "2026-07-27-share-v2",
    changes: [
      "新增「身份驗證服務商」類別的獨立授權要求",
      "銀行交易分析用途說明更細",
      "要求四項確認勾選方可授權",
    ],
  },
];

/** 後台審計示範列 */
export const DEMO_ADMIN_AUTH_AUDIT = [
  {
    userId: "usr_demo_001",
    companyId: "CO-7012345",
    applicationId: "SLF-2026-00482",
    consentId: "AUTH-DEMO001",
    authItem: "授權提供予指定機構",
    recipient: "示範合作銀行",
    dataTypes: "公司資料、銀行文件、身份文件",
    purpose: "評估貸款申請；進行信用評估",
    authTextVersion: THIRD_PARTY_AUTH_POLICY_VERSION,
    privacyVersion: PRIVACY_POLICY_VERSION,
    consentedAt: "2026-07-26T10:22:00+08:00",
    timezone: "Asia/Hong_Kong",
    ip: "203.218.x.x",
    device: "iPhone · Safari 17",
    appVersion: "web-1.0.0",
    source: "App 勾選確認",
    sharedAt: "2026-07-26T11:05:00+08:00",
    transferMethod: "加密 API",
    transferResult: "已成功分享",
    withdrawnAt: "—",
    status: "有效",
    operator: "share-worker",
    manualEdit: "無",
  },
  {
    userId: "usr_demo_002",
    companyId: "CO-8899001",
    applicationId: "SLF-2026-00510",
    consentId: "AUTH-DEMO002",
    authItem: "授權提供予指定機構",
    recipient: "示範身份驗證服務商",
    dataTypes: "人士資料",
    purpose: "進行身份驗證",
    authTextVersion: THIRD_PARTY_AUTH_POLICY_VERSION,
    privacyVersion: PRIVACY_POLICY_VERSION,
    consentedAt: "2026-07-25T16:40:00+08:00",
    timezone: "Asia/Hong_Kong",
    ip: "42.98.x.x",
    device: "Chrome 126 · macOS",
    appVersion: "web-1.0.0",
    source: "App 勾選確認",
    sharedAt: "—",
    transferMethod: "—",
    transferResult: "已授權，未分享",
    withdrawnAt: "—",
    status: "有效",
    operator: "—",
    manualEdit: "無",
  },
];

export const DEMO_ADMIN_TRANSFERS = [
  {
    sharedAt: "2026-07-26T11:05:00+08:00",
    recipient: "示範合作銀行",
    method: "加密 API",
    payload: "BR、NAR1、6 個月月結、申請摘要",
    docVersions: "br-v1, nar1-v1, bank-v3",
    encrypted: "是",
    status: "已成功分享",
    received: "是",
    failure: "—",
    retries: 0,
    operator: "share-worker",
    authId: "AUTH-DEMO001",
  },
  {
    sharedAt: "—",
    recipient: "示範身份驗證服務商",
    method: "尚未傳送",
    payload: "董事身份證明",
    docVersions: "—",
    encrypted: "是（預定）",
    status: "已授權，未分享",
    received: "否",
    failure: "—",
    retries: 0,
    operator: "系統（待排程）",
    authId: "AUTH-DEMO002",
  },
];
