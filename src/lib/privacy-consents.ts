/** 私隱同意項目定義與本地紀錄（版本＋時間戳） */

export const PRIVACY_CONSENT_POLICY_VERSION = "2026-07-27-v1";

export type ConsentRequirement = "required" | "case_by_case" | "optional";

export type ConsentItemDef = {
  id: string;
  label: string;
  requirement: ConsentRequirement;
  requirementLabel: string;
  summary: string;
  details: string[];
};

export const CONSENT_ITEMS: ConsentItemDef[] = [
  {
    id: "company_application_data",
    label: "同意收集及處理公司申請資料",
    requirement: "required",
    requirementLabel: "必須",
    summary: "用於確認公司身份、核對 BR／NAR1、建立申請檔及初步資格評估。",
    details: [
      "收集公司名稱、商業登記號碼、公司註冊編號、地址、業務性質、董事及股東資料等。",
      "用途包括確認申請公司身份、核對文件一致性、確認申請權限，以及支援人工審核。",
      "此同意為處理貸款申請所必須。",
    ],
  },
  {
    id: "ai_document_analysis",
    label: "同意使用 AI 讀取及分析上載文件",
    requirement: "required",
    requirementLabel: "必須",
    summary: "允許系統以 AI 進行文件分類、OCR、資料抽取及初步摘要。",
    details: [
      "AI 可能執行：文件分類、OCR、公司及人士資料核對、交易分類、現金流計算、異常識別、初步政策核對及摘要生成。",
      "AI 結果只供資料整理及初步評估，可能有識別錯誤；重要結果須由顧問或機構覆核。",
      "AI 不會單獨作出最終貸款批核決定。",
    ],
  },
  {
    id: "bank_statement_analysis",
    label: "同意分析銀行月結單及交易紀錄",
    requirement: "required",
    requirementLabel: "必須",
    summary: "用於計算 ADB、進帳分析、異常識別及初步還款能力評估。",
    details: [
      "收集銀行名稱、戶口資料、交易、結餘、透支及退票／扣款失敗紀錄等。",
      "用途包括每日平均餘額、進帳頻率與來源、現金流穩定性及風險覆核。",
      "AI 未能確認的交易不會自動視為營業收入，或需由你或顧問再確認。",
    ],
  },
  {
    id: "identity_verification",
    label: "同意核對董事、股東及擔保人身份資料",
    requirement: "required",
    requirementLabel: "必須",
    summary: "用於 KYC、對照 NAR1，以及符合合作機構身份驗證要求。",
    details: [
      "可能涉及姓名、證件號碼、出生日期、證件有效期、證件相片及國籍／簽發地。",
      "AI 文件分析不代表已完成正式身份真偽驗證；正式 KYC 可能由驗證服務或貸款機構另行進行。",
    ],
  },
  {
    id: "share_with_advisor",
    label: "同意將申請資料提供予指定貸款顧問",
    requirement: "required",
    requirementLabel: "必須",
    summary: "讓指定顧問覆核申請、跟進補件及聯絡你處理下一步。",
    details: [
      "分享範圍限於處理本申請所需的公司、文件及評估資料。",
      "一般資料使用同意，不代表已授權分享予所有金融機構。",
    ],
  },
  {
    id: "share_with_lender",
    label: "同意將資料提供予指定銀行或貸款機構",
    requirement: "case_by_case",
    requirementLabel: "提交前按個案授權",
    summary: "每次向指定銀行／放債人傳送前，另以「授權分享申請資料」確認。",
    details: [
      "不會因本頁一鍵全部同意而自動分享予所有銀行或財務機構。",
      "每次分享會顯示接收機構、目的、資料範圍及預計時間，並需你確認。",
    ],
  },
  {
    id: "marketing",
    label: "同意將資料用作產品及服務推廣",
    requirement: "optional",
    requirementLabel: "選擇性",
    summary: "接收產品更新或服務推廣訊息（可隨時撤回）。",
    details: [
      "此用途與貸款申請必須同意分開，不會預先勾選。",
      "拒絕不影響你提交或繼續貸款申請。",
    ],
  },
  {
    id: "analytics_deidentified",
    label: "同意使用去識別化資料改善系統",
    requirement: "optional",
    requirementLabel: "選擇性（需經合規確認）",
    summary: "以去識別化／匯總資料改善文件辨識及流程（不識別個人）。",
    details: [
      "僅在合規允許範圍內使用去識別化資料。",
      "此項不會預先勾選；拒絕不影響申請。",
    ],
  },
];

export type ConsentRecord = {
  itemId: string;
  granted: boolean;
  policyVersion: string;
  decidedAt: string; // ISO
};

export type ConsentStore = {
  policyVersion: string;
  updatedAt: string;
  records: ConsentRecord[];
};

const STORAGE_KEY = "slf_privacy_consents_v1";

export function loadConsentStore(userKey = "anon"): ConsentStore | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(`${STORAGE_KEY}:${userKey}`);
    if (!raw) return null;
    return JSON.parse(raw) as ConsentStore;
  } catch {
    return null;
  }
}

export function saveConsentStore(store: ConsentStore, userKey = "anon") {
  if (typeof window === "undefined") return;
  localStorage.setItem(`${STORAGE_KEY}:${userKey}`, JSON.stringify(store));
}

export function requiredConsentsGranted(store: ConsentStore | null) {
  if (!store || store.policyVersion !== PRIVACY_CONSENT_POLICY_VERSION) {
    return false;
  }
  return CONSENT_ITEMS.filter((i) => i.requirement === "required").every(
    (item) => store.records.some((r) => r.itemId === item.id && r.granted),
  );
}

export function emptyConsentSelections(): Record<string, boolean> {
  return Object.fromEntries(
    CONSENT_ITEMS.map((i) => [
      i.id,
      // 選擇性及按個案不可預先勾選
      false,
    ]),
  );
}
