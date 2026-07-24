import type { ScreeningResult } from "./types";

/** 文件卡片狀態（Brief 第四節） */
export type RequiredDocCardStatus =
  | "not_uploaded"
  | "uploading"
  | "classifying"
  | "analyzing"
  | "completed"
  | "needs_confirm"
  | "needs_resubmit"
  | "format_rejected"
  | "unclear"
  | "data_mismatch";

export const DOC_CARD_STATUS_LABEL: Record<RequiredDocCardStatus, string> = {
  not_uploaded: "尚未上載",
  uploading: "正在安全上載文件",
  classifying: "AI 正在識別文件類型",
  analyzing: "AI 正在讀取文件內容",
  completed: "文件已完成初步檢查",
  needs_confirm: "部分資料需要你確認",
  needs_resubmit: "文件不完整或資料不足",
  format_rejected: "請重新上載指定格式",
  unclear: "系統未能清楚讀取內容",
  data_mismatch: "文件資料與申請資料不同",
};

export type DocumentClass =
  | "br"
  | "nar1"
  | "bank_statement"
  | "hk_id"
  | "passport"
  | "audit_report"
  | "management_accounts"
  | "facility_letter"
  | "other"
  | "unknown";

export const DOCUMENT_CLASS_LABEL: Record<DocumentClass, string> = {
  br: "商業登記證",
  nar1: "NAR1",
  bank_statement: "銀行月結單",
  hk_id: "香港身份證",
  passport: "護照",
  audit_report: "Audited Report",
  management_accounts: "管理帳目",
  facility_letter: "授信信",
  other: "其他文件",
  unknown: "未能識別",
};

export type MandatoryDocId = "br" | "nar1" | "bank_statements" | "identity";

export interface MandatoryDocSlot {
  id: MandatoryDocId;
  title: string;
  requirement: string;
  status: RequiredDocCardStatus;
  detail?: string;
  href: string;
}

export interface SupplementDoc {
  id: string;
  type: string;
  note: string;
  status: RequiredDocCardStatus;
}

export interface RequiredDocsProgress {
  completed: number;
  total: number;
  slots: MandatoryDocSlot[];
  supplements: SupplementDoc[];
  canStartAnalysis: boolean;
}

export function evaluateRequiredDocsProgress(
  slots: MandatoryDocSlot[],
  supplements: SupplementDoc[] = [],
): RequiredDocsProgress {
  const completed = slots.filter((s) => s.status === "completed").length;
  return {
    completed,
    total: slots.length,
    slots,
    supplements,
    canStartAnalysis: completed === slots.length,
  };
}

export function getDefaultMandatorySlots(
  overrides?: Partial<Record<MandatoryDocId, RequiredDocCardStatus>>,
): MandatoryDocSlot[] {
  const status = (id: MandatoryDocId, fallback: RequiredDocCardStatus) =>
    overrides?.[id] ?? fallback;

  return [
    {
      id: "br",
      title: "商業登記證 BR",
      requirement: "最新及有效副本；公司名稱及商業登記號碼須清晰可見",
      status: status("br", "not_uploaded"),
      href: "/apply/documents/br",
    },
    {
      id: "nar1",
      title: "最近期公司註冊處周年申報表 NAR1",
      requirement: "最近期已提交完整頁面；不接受只上載封面或部分頁面",
      status: status("nar1", "not_uploaded"),
      href: "/apply/documents/nar1",
    },
    {
      id: "bank_statements",
      title: "最近六個月銀行月結單",
      requirement: "只接受 PDF；六個連續月份；同一主要銀行戶口完整交易",
      status: status("bank_statements", "not_uploaded"),
      href: "/apply/documents/bank-statements",
    },
    {
      id: "identity",
      title: "身份證明文件",
      requirement: "所有董事、股東及個人擔保人（香港身份證／護照）",
      status: status("identity", "not_uploaded"),
      href: "/apply/documents/identity",
    },
  ];
}

/** 交叉核對格子 */
export type CrossCheckField =
  | "company_name"
  | "cr_number"
  | "br_number"
  | "company_address"
  | "director_names"
  | "shareholder_names"
  | "account_holder";

export type CrossCheckSource = "br" | "nar1" | "bank" | "id" | "na";

export interface CrossCheckCell {
  field: CrossCheckField;
  label: string;
  br: "match" | "mismatch" | "na" | "missing";
  nar1: "match" | "mismatch" | "na" | "missing";
  bank: "match" | "mismatch" | "na" | "missing";
  id: "match" | "mismatch" | "na" | "missing";
}

export interface CrossCheckResult {
  overall: ScreeningResult;
  hasConflict: boolean;
  cells: CrossCheckCell[];
  clientMessage: string;
}

export function evaluateCrossCheck(cells: CrossCheckCell[]): CrossCheckResult {
  const hasConflict = cells.some((c) =>
    [c.br, c.nar1, c.bank, c.id].includes("mismatch"),
  );
  const hasMissing = cells.some((c) =>
    [c.br, c.nar1, c.bank, c.id].includes("missing"),
  );
  const overall: ScreeningResult = hasConflict
    ? "red"
    : hasMissing
      ? "amber"
      : "green";

  return {
    overall,
    hasConflict,
    cells,
    clientMessage: hasConflict
      ? "文件之間的公司資料存在差異，需要客戶確認或由貸款顧問覆核。"
      : hasMissing
        ? "部分資料尚未完整核對，請確認或補件後再繼續。"
        : "公司及人士資料大致一致，可進入銀行現金流分析。",
  };
}
