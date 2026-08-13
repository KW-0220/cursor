import type { DocCategoryId, DocGroupId, ShareholderIdentity } from "./classification";

/** 動態文件 slot（含舊 slot 相容 id） */
export type BizDocSlotId =
  | "br"
  | "ci"
  | "nar1"
  | "aoa"
  | "incorporation_form"
  | "director_id"
  | "shareholder_id"
  | "address_proof"
  | "id_mainland"
  | "id_home_return"
  | "id_passport"
  | "id_hkid"
  | "id_passport_optional"
  | "cv"
  | "social_security"
  | "work_experience"
  | "personal_bank_m1"
  | "personal_bank_m2"
  | "personal_bank_m3"
  | "personal_bank_combined"
  | "related_license"
  | "related_bank_m1"
  | "related_bank_m2"
  | "related_bank_m3"
  | "related_bank_combined"
  | "related_invoice_1"
  | "related_invoice_2"
  | "related_invoice_3"
  | "hk_business_1"
  | "hk_business_2"
  | "hk_business_3"
  | "hk_bank_m1"
  | "hk_bank_m2"
  | "hk_bank_m3"
  | "hk_bank_combined"
  | "audit_report"
  | "business_set_1"
  | "business_set_2"
  | "business_alt"
  | `extra_${string}`;

export type SlotRequirement = "required" | "optional" | "na";

export interface BizDocSlotDef {
  id: BizDocSlotId;
  group: DocGroupId;
  category?: string;
  name: string;
  purpose: string;
  requirements: string[];
  formats: string[];
  tips: string[];
  maxFiles: number;
  /** FileUploadCard 相容；動態清單以 ResolvedSlotPlan.requirement 為準 */
  required?: boolean;
  statementMonth?: 1 | 2 | 3 | "combined";
  proofIndex?: 1 | 2 | 3;
  interviewItem?: boolean;
}

function S(
  partial: BizDocSlotDef,
): BizDocSlotDef {
  return partial;
}

export const BIZ_DOC_SLOTS: BizDocSlotDef[] = [
  S({ id: "br", group: "A", name: "商業登記證（BR）", purpose: "核實公司商業登記資料", requirements: ["最新及有效", "公司名稱清晰", "商業登記號碼清晰"], formats: ["PDF", "JPG", "JPEG", "PNG"], tips: ["多頁請合併 PDF"], maxFiles: 3 }),
  S({ id: "ci", group: "A", name: "公司註冊證書（CI）", purpose: "核實公司註冊成立", requirements: ["完整清晰", "公司名稱及註冊編號清楚"], formats: ["PDF", "JPG", "JPEG", "PNG"], tips: [], maxFiles: 3 }),
  S({ id: "nar1", group: "A", name: "最新週年申報表（NAR1）", purpose: "核實董事及股東資料", requirements: ["最新一份", "內容完整"], formats: ["PDF"], tips: ["後台可改為必須／選填／不適用"], maxFiles: 5 }),
  S({ id: "aoa", group: "A", name: "公司組織章程細則", purpose: "核實公司組織章程", requirements: ["完整版本", "含封面及所有內頁"], formats: ["PDF"], tips: ["後台可改為必須／選填／不適用"], maxFiles: 3 }),
  S({ id: "incorporation_form", group: "A", name: "公司成立表格（如適用）", purpose: "新成立公司補充成立文件", requirements: ["完整清晰"], formats: ["PDF", "JPG", "JPEG", "PNG"], tips: ["後台可改為必須／選填／不適用"], maxFiles: 3 }),
  S({ id: "id_hkid", group: "B", name: "香港身份證", purpose: "核實香港本地人士身份", requirements: ["清晰可讀", "正反面如需"], formats: ["PDF", "JPG", "JPEG", "PNG"], tips: ["每位董事／股東／UBO 獨立上載"], maxFiles: 2 }),
  S({ id: "id_mainland", group: "B", name: "中國居民身份證", purpose: "核實內地人士身份", requirements: ["清晰可讀"], formats: ["PDF", "JPG", "JPEG", "PNG"], tips: ["每位相關人士獨立上載"], maxFiles: 2 }),
  S({ id: "id_home_return", group: "B", name: "港澳居民來往內地通行證", purpose: "核實通行證資料", requirements: ["有效期清晰"], formats: ["PDF", "JPG", "JPEG", "PNG"], tips: [], maxFiles: 2 }),
  S({ id: "id_passport", group: "B", name: "護照", purpose: "核實護照身份證明", requirements: ["資料頁清晰"], formats: ["PDF", "JPG", "JPEG", "PNG"], tips: [], maxFiles: 2 }),
  S({ id: "id_passport_optional", group: "B", name: "護照或通行證（選填備用）", purpose: "備用身份證明", requirements: ["清晰可讀"], formats: ["PDF", "JPG", "JPEG", "PNG"], tips: ["香港本地人士選填"], maxFiles: 2 }),
  S({ id: "director_id", group: "B", name: "董事身份證明（舊欄位）", purpose: "相容舊申請資料", requirements: ["清晰可讀"], formats: ["PDF", "JPG", "JPEG", "PNG"], tips: [], maxFiles: 2 }),
  S({ id: "shareholder_id", group: "B", name: "股東身份證明（舊欄位）", purpose: "相容舊申請資料", requirements: ["清晰可讀"], formats: ["PDF", "JPG", "JPEG", "PNG"], tips: [], maxFiles: 2 }),
  S({ id: "address_proof", group: "B", name: "住址證明", purpose: "核實居住地址", requirements: ["姓名、地址、日期清晰", "一般近三個月內"], formats: ["PDF", "JPG", "JPEG", "PNG"], tips: ["銀行月結單／水電煤等"], maxFiles: 3 }),
  S({ id: "cv", group: "C", name: "個人簡歷（CV）", purpose: "個人背景說明", requirements: ["完整履歷", "電子版需上載"], formats: ["PDF", "DOC", "DOCX"], tips: ["面簽當天須另帶列印本（見面簽 Checklist）"], maxFiles: 3 }),
  S({ id: "social_security", group: "C", name: "社保供款證明", purpose: "證明個人社保／社會保障紀錄", requirements: ["近期有效證明"], formats: ["PDF", "JPG", "JPEG", "PNG"], tips: [], maxFiles: 5 }),
  S({ id: "work_experience", group: "C", name: "過往工作經驗證明", purpose: "證明工作資歷", requirements: ["可接受：強積金 MPF、離職證明、薪單、僱傭合約、稅單、前僱主證明信"], formats: ["PDF", "JPG", "JPEG", "PNG"], tips: ["可上載多份"], maxFiles: 10 }),
  S({ id: "personal_bank_m1", group: "D", name: "個人銀行流水 · 最近第 1 個月", purpose: "個人財務流水", requirements: ["同一主要戶口", "交易完整", "姓名清晰"], formats: ["PDF"], tips: ["可改以上載「合併三個月 PDF」"], maxFiles: 2, statementMonth: 1 }),
  S({ id: "personal_bank_m2", group: "D", name: "個人銀行流水 · 最近第 2 個月", purpose: "個人財務流水", requirements: ["月份連續"], formats: ["PDF"], tips: [], maxFiles: 2, statementMonth: 2 }),
  S({ id: "personal_bank_m3", group: "D", name: "個人銀行流水 · 最近第 3 個月", purpose: "個人財務流水", requirements: ["月份連續"], formats: ["PDF"], tips: [], maxFiles: 2, statementMonth: 3 }),
  S({ id: "personal_bank_combined", group: "D", name: "個人銀行流水 · 完整三個月合併 PDF", purpose: "一份 PDF 含完整三個月", requirements: ["涵蓋連續三個月", "同一戶口"], formats: ["PDF"], tips: ["如上載合併檔，可不必分月上載"], maxFiles: 1, statementMonth: "combined" }),
  S({ id: "related_license", group: "E", name: "關聯公司營業執照／註冊證明", purpose: "證明關聯公司合法存續", requirements: ["公司名稱清晰", "註冊地清晰"], formats: ["PDF", "JPG", "JPEG", "PNG"], tips: [], maxFiles: 3 }),
  S({ id: "related_bank_m1", group: "F", name: "關聯公司銀行流水 · 最近第 1 個月", purpose: "關聯公司營運流水", requirements: ["同一公司、同一主要戶口", "月份連續"], formats: ["PDF"], tips: [], maxFiles: 2, statementMonth: 1 }),
  S({ id: "related_bank_m2", group: "F", name: "關聯公司銀行流水 · 最近第 2 個月", purpose: "關聯公司營運流水", requirements: ["月份連續"], formats: ["PDF"], tips: [], maxFiles: 2, statementMonth: 2 }),
  S({ id: "related_bank_m3", group: "F", name: "關聯公司銀行流水 · 最近第 3 個月", purpose: "關聯公司營運流水", requirements: ["月份連續"], formats: ["PDF"], tips: [], maxFiles: 2, statementMonth: 3 }),
  S({ id: "related_bank_combined", group: "F", name: "關聯公司銀行流水 · 完整三個月合併 PDF", purpose: "一份 PDF 含完整三個月", requirements: ["涵蓋連續三個月"], formats: ["PDF"], tips: [], maxFiles: 1, statementMonth: "combined" }),
  S({ id: "related_invoice_1", group: "G", name: "關聯公司發票／業務證明 · 第 1 份", purpose: "增值稅發票或其他業務交易證明", requirements: ["內地關聯公司優先增值稅發票", "海外可接受商業發票／合約／訂單／收款證明"], formats: ["PDF", "JPG", "JPEG", "PNG"], tips: [], maxFiles: 3, proofIndex: 1 }),
  S({ id: "related_invoice_2", group: "G", name: "關聯公司發票／業務證明 · 第 2 份", purpose: "第二份業務交易證明", requirements: ["與第一份要求相同"], formats: ["PDF", "JPG", "JPEG", "PNG"], tips: [], maxFiles: 3, proofIndex: 2 }),
  S({ id: "related_invoice_3", group: "G", name: "關聯公司發票／業務證明 · 第 3 份", purpose: "第三份業務交易證明", requirements: ["與第一份要求相同"], formats: ["PDF", "JPG", "JPEG", "PNG"], tips: [], maxFiles: 3, proofIndex: 3 }),
  S({ id: "hk_business_1", group: "G", name: "香港公司業務證明 · 第 1 份", purpose: "銷售／採購發票、合約、訂單或收付款證明", requirements: ["填寫交易對象、日期、金額等資料"], formats: ["PDF", "JPG", "JPEG", "PNG"], tips: [], maxFiles: 5, proofIndex: 1 }),
  S({ id: "hk_business_2", group: "G", name: "香港公司業務證明 · 第 2 份", purpose: "第二份業務證明", requirements: ["建議不同交易對象"], formats: ["PDF", "JPG", "JPEG", "PNG"], tips: [], maxFiles: 5, proofIndex: 2 }),
  S({ id: "hk_business_3", group: "G", name: "香港公司業務證明 · 第 3 份", purpose: "第三份業務證明", requirements: [], formats: ["PDF", "JPG", "JPEG", "PNG"], tips: [], maxFiles: 5, proofIndex: 3 }),
  S({ id: "hk_bank_m1", group: "H", name: "香港公司銀行結單 · 最近第 1 個月", purpose: "香港公司戶口結單", requirements: ["公司名稱清晰", "交易完整"], formats: ["PDF"], tips: [], maxFiles: 2, statementMonth: 1 }),
  S({ id: "hk_bank_m2", group: "H", name: "香港公司銀行結單 · 最近第 2 個月", purpose: "香港公司戶口結單", requirements: ["月份連續"], formats: ["PDF"], tips: [], maxFiles: 2, statementMonth: 2 }),
  S({ id: "hk_bank_m3", group: "H", name: "香港公司銀行結單 · 最近第 3 個月", purpose: "香港公司戶口結單", requirements: ["月份連續"], formats: ["PDF"], tips: [], maxFiles: 2, statementMonth: 3 }),
  S({ id: "hk_bank_combined", group: "H", name: "香港公司銀行結單 · 完整三個月合併 PDF", purpose: "一份 PDF 含完整三個月", requirements: ["涵蓋連續三個月"], formats: ["PDF"], tips: [], maxFiles: 1, statementMonth: "combined" }),
  S({ id: "audit_report", group: "I", name: "Audit Report／審計帳", purpose: "最近期完整審計報告", requirements: ["含核數師報告", "含財務報表", "含資產負債表", "含損益表", "含財務報表附註"], formats: ["PDF"], tips: ["僅接受 PDF"], maxFiles: 2 }),
  S({ id: "business_set_1", group: "G", name: "業務證明第一套（舊欄位）", purpose: "相容舊申請", requirements: [], formats: ["PDF", "JPG", "JPEG", "PNG"], tips: [], maxFiles: 10 }),
  S({ id: "business_set_2", group: "G", name: "業務證明第二套（舊欄位）", purpose: "相容舊申請", requirements: [], formats: ["PDF", "JPG", "JPEG", "PNG"], tips: [], maxFiles: 10 }),
  S({ id: "business_alt", group: "G", name: "新成立替代證明（舊欄位）", purpose: "相容舊申請", requirements: [], formats: ["PDF", "JPG", "JPEG", "PNG"], tips: [], maxFiles: 10 }),
];

export interface InterviewChecklistItem {
  id: string;
  label: string;
  hint?: string;
}

export const INTERVIEW_CHECKLIST_BASE: InterviewChecklistItem[] = [
  { id: "cv_print", label: "個人簡歷列印本", hint: "必須列印一份，面簽當天帶備" },
  { id: "id_original", label: "身份證明文件正本" },
  { id: "passport_original", label: "護照正本" },
  { id: "permit_original", label: "通行證正本" },
  { id: "bank_other", label: "銀行要求的其他正本" },
  { id: "extra", label: "額外補充文件" },
];

export type InterviewItemStatus = "needed" | "prepared" | "na";

const CATEGORY_REQUIRED: Record<DocCategoryId, BizDocSlotId[]> = {
  1: ["br", "ci", "related_license", "related_bank_m1", "related_bank_m2", "related_bank_m3", "related_invoice_1"],
  2: ["br", "ci", "cv", "social_security", "personal_bank_m1", "personal_bank_m2", "personal_bank_m3"],
  3: ["br", "ci", "id_hkid", "cv", "personal_bank_m1", "personal_bank_m2", "personal_bank_m3", "work_experience"],
  4: ["br", "ci", "related_license", "related_bank_m1", "related_bank_m2", "related_bank_m3", "related_invoice_1", "related_invoice_2", "related_invoice_3", "audit_report"],
  5: ["br", "ci", "cv", "social_security", "personal_bank_m1", "personal_bank_m2", "personal_bank_m3", "hk_business_1", "hk_business_2", "hk_business_3", "audit_report"],
  6: ["br", "ci", "id_hkid", "cv", "personal_bank_m1", "personal_bank_m2", "personal_bank_m3", "work_experience", "hk_bank_m1", "hk_bank_m2", "hk_bank_m3", "audit_report"],
  "3r": ["br", "ci", "id_hkid", "cv", "personal_bank_m1", "personal_bank_m2", "personal_bank_m3", "work_experience", "related_license", "related_bank_m1", "related_bank_m2", "related_bank_m3", "related_invoice_1"],
  "6r": ["br", "ci", "id_hkid", "cv", "personal_bank_m1", "personal_bank_m2", "personal_bank_m3", "work_experience", "hk_bank_m1", "hk_bank_m2", "hk_bank_m3", "audit_report", "related_license", "related_bank_m1", "related_bank_m2", "related_bank_m3", "related_invoice_1"],
};

const OPTIONAL_BY_CATEGORY: Partial<Record<DocCategoryId, BizDocSlotId[]>> = {
  1: ["nar1", "aoa", "incorporation_form", "related_bank_combined"],
  2: ["nar1", "aoa", "incorporation_form", "personal_bank_combined", "id_passport"],
  3: ["nar1", "aoa", "incorporation_form", "id_passport_optional", "personal_bank_combined"],
  4: ["nar1", "aoa", "related_bank_combined"],
  5: ["nar1", "aoa", "personal_bank_combined"],
  6: ["nar1", "aoa", "id_passport_optional", "personal_bank_combined", "hk_bank_combined"],
  "3r": ["nar1", "aoa", "incorporation_form", "id_passport_optional", "related_bank_combined"],
  "6r": ["nar1", "aoa", "id_passport_optional", "hk_bank_combined", "related_bank_combined"],
};

function identitySlots(identity: ShareholderIdentity | null): BizDocSlotId[] {
  if (identity === "hk_local") return ["id_hkid"];
  if (identity === "mainland") return ["id_mainland", "id_home_return", "id_passport"];
  if (identity === "foreign") return ["id_passport"];
  return ["director_id"];
}

export interface ResolvedSlotPlan {
  slot: BizDocSlotDef;
  requirement: SlotRequirement;
}

export function getDocSlot(id: BizDocSlotId): BizDocSlotDef | undefined {
  return BIZ_DOC_SLOTS.find((s) => s.id === id);
}

export function slotsByGroup(group: DocGroupId) {
  return BIZ_DOC_SLOTS.filter((s) => s.group === group);
}

/** @deprecated 舊 API 相容 */
export function slotsByCategory(category: string) {
  if (category === "company") return slotsByGroup("A");
  if (category === "identity" || category === "address")
    return BIZ_DOC_SLOTS.filter((s) => s.group === "B");
  if (category === "business_proof" || category === "business_alt")
    return slotsByGroup("G");
  return [];
}

export function resolveSlotPlan(opts: {
  category: DocCategoryId;
  identity: ShareholderIdentity | null;
  overrides?: Partial<Record<string, SlotRequirement>>;
}): ResolvedSlotPlan[] {
  const required = new Set(CATEGORY_REQUIRED[opts.category]);
  const optional = new Set(OPTIONAL_BY_CATEGORY[opts.category] ?? []);
  for (const id of identitySlots(opts.identity)) {
    required.add(id);
  }

  const ids = new Set<BizDocSlotId>([...required, ...optional]);
  const plans: ResolvedSlotPlan[] = [];
  for (const id of ids) {
    const slot = getDocSlot(id);
    if (!slot) continue;
    let requirement: SlotRequirement = required.has(id)
      ? "required"
      : optional.has(id)
        ? "optional"
        : "na";
    const ov = opts.overrides?.[id];
    if (ov) requirement = ov;
    if (requirement === "na") continue;
    plans.push({ slot, requirement });
  }

  const groupOrder: DocGroupId[] = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J"];
  plans.sort((a, b) => {
    const g = groupOrder.indexOf(a.slot.group) - groupOrder.indexOf(b.slot.group);
    if (g !== 0) return g;
    return (
      BIZ_DOC_SLOTS.findIndex((s) => s.id === a.slot.id) -
      BIZ_DOC_SLOTS.findIndex((s) => s.id === b.slot.id)
    );
  });
  return plans;
}

export const STATEMENT_MONTH_SETS = {
  personal: {
    months: ["personal_bank_m1", "personal_bank_m2", "personal_bank_m3"] as BizDocSlotId[],
    combined: "personal_bank_combined" as BizDocSlotId,
  },
  related: {
    months: ["related_bank_m1", "related_bank_m2", "related_bank_m3"] as BizDocSlotId[],
    combined: "related_bank_combined" as BizDocSlotId,
  },
  hk: {
    months: ["hk_bank_m1", "hk_bank_m2", "hk_bank_m3"] as BizDocSlotId[],
    combined: "hk_bank_combined" as BizDocSlotId,
  },
};

export const MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024;

export function planToUploadDef(
  plan: ResolvedSlotPlan,
): BizDocSlotDef & { required: boolean } {
  return { ...plan.slot, required: plan.requirement === "required" };
}
