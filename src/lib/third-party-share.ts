/** 第三方分享授權（個案授權，非涵蓋所有機構） */

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

/** 示範接收機構（正式環境改由後端／個案配置） */
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

export type ThirdPartyAuthRecord = {
  id: string;
  recipientId: string;
  recipientName: string;
  orgType: OrgType;
  purposes: SharePurpose[];
  dataCategoryIds: string[];
  authorizedAt: string;
  policyVersion: string;
};

export const THIRD_PARTY_AUTH_POLICY_VERSION = "2026-07-27-share-v1";

const STORAGE_KEY = "slf_third_party_auth_v1";

export function loadThirdPartyAuths(userKey = "anon"): ThirdPartyAuthRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(`${STORAGE_KEY}:${userKey}`);
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
  localStorage.setItem(`${STORAGE_KEY}:${userKey}`, JSON.stringify(records));
}

export function appendThirdPartyAuth(
  record: Omit<ThirdPartyAuthRecord, "id" | "authorizedAt" | "policyVersion">,
  userKey = "anon",
) {
  const next: ThirdPartyAuthRecord = {
    ...record,
    id: `auth_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    authorizedAt: new Date().toISOString(),
    policyVersion: THIRD_PARTY_AUTH_POLICY_VERSION,
  };
  const list = loadThirdPartyAuths(userKey);
  saveThirdPartyAuths([next, ...list], userKey);
  return next;
}
