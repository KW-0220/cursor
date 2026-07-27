/**
 * 有抵押貸款｜抵押品管理模組
 * 共同必須文件之外，按抵押品類型顯示專屬文件／資料欄位。
 */

export type RealEstateSubtype =
  | "住宅"
  | "商舖"
  | "寫字樓"
  | "工業物業"
  | "車位"
  | "其他不動產";

export type OtherAssetSubtype =
  | "車輛"
  | "機器或設備"
  | "定期存款"
  | "股票或證券"
  | "其他資產";

export type CollateralCategory = "real_estate" | "other_asset";

export type CollateralSubtype = RealEstateSubtype | OtherAssetSubtype;

export type DocRequirementLevel = "required" | "recommended" | "conditional";

export type CollateralDocSlotId =
  | "title_deed"
  | "mortgage_contract"
  | "mortgage_statement"
  | "rates_rent"
  | "management_fee"
  | "tenancy"
  | "rental_income"
  | "vehicle_registration"
  | "purchase_invoice"
  | "sale_contract"
  | "vehicle_loan_contract"
  | "vehicle_loan_statement"
  | "equipment_photo"
  | "equipment_serial_photo"
  | "equipment_valuation"
  | "equipment_finance"
  | "td_certificate"
  | "td_asset_proof"
  | "securities_statement"
  | "margin_statement"
  | "other";

export type CollateralDocSlotDef = {
  id: CollateralDocSlotId;
  title: string;
  accept: string;
  level: DocRequirementLevel;
  /** 條件顯示說明 */
  conditionHint?: string;
};

export type CollateralUploadedFile = {
  name: string;
  size: number;
  type: string;
  uploadedAt: string;
};

export type CollateralDocStatus =
  | "未上載"
  | "已完成"
  | "需要補交"
  | "不適用";

export type TrafficLight = "green" | "amber" | "red";

export type RealEstateDetails = {
  address: string;
  owner: string;
  holding: "公司" | "個人";
  estimatedValue: number | "";
  hasExistingMortgage: boolean;
  mortgageBank: string;
  outstanding: number | "";
  monthlyPayment: number | "";
  rentalStatus: "自用" | "已出租" | "空置";
  monthlyRent: number | "";
};

export type VehicleDetails = {
  vehicleType: string;
  plate: string;
  brand: string;
  model: string;
  firstRegYear: string;
  registeredOwner: string;
  purchasePrice: number | "";
  estimatedValue: number | "";
  hasLoan: boolean;
  outstanding: number | "";
};

export type EquipmentDetails = {
  name: string;
  equipmentType: string;
  brand: string;
  model: string;
  serial: string;
  purchaseDate: string;
  purchasePrice: number | "";
  estimatedValue: number | "";
  location: string;
  hasFinance: boolean;
  pledgedElsewhere: boolean;
};

export type TimeDepositDetails = {
  bankName: string;
  accountHolder: string;
  principal: number | "";
  currency: string;
  startDate: string;
  maturityDate: string;
  rate: string;
  pledgedElsewhere: boolean;
};

export type SecuritiesDetails = {
  brokerName: string;
  accountHolder: string;
  accountLast4: string;
  assetType: string;
  estimatedValue: number | "";
  hasMargin: boolean;
  marginOutstanding: number | "";
};

export type CollateralItem = {
  id: string;
  category: CollateralCategory;
  subtype: CollateralSubtype;
  label: string;
  createdAt: string;
  updatedAt: string;
  realEstate?: RealEstateDetails;
  vehicle?: VehicleDetails;
  equipment?: EquipmentDetails;
  timeDeposit?: TimeDepositDetails;
  securities?: SecuritiesDetails;
  /** slotId → 已上載檔案（示範可多檔） */
  files: Partial<Record<CollateralDocSlotId, CollateralUploadedFile[]>>;
};

export const REAL_ESTATE_SUBTYPES: RealEstateSubtype[] = [
  "住宅",
  "商舖",
  "寫字樓",
  "工業物業",
  "車位",
  "其他不動產",
];

export const OTHER_ASSET_SUBTYPES: OtherAssetSubtype[] = [
  "車輛",
  "機器或設備",
  "定期存款",
  "股票或證券",
  "其他資產",
];

export function emptyRealEstate(): RealEstateDetails {
  return {
    address: "",
    owner: "",
    holding: "公司",
    estimatedValue: "",
    hasExistingMortgage: false,
    mortgageBank: "",
    outstanding: "",
    monthlyPayment: "",
    rentalStatus: "自用",
    monthlyRent: "",
  };
}

export function emptyVehicle(): VehicleDetails {
  return {
    vehicleType: "私家車",
    plate: "",
    brand: "",
    model: "",
    firstRegYear: "",
    registeredOwner: "",
    purchasePrice: "",
    estimatedValue: "",
    hasLoan: false,
    outstanding: "",
  };
}

export function emptyEquipment(): EquipmentDetails {
  return {
    name: "",
    equipmentType: "",
    brand: "",
    model: "",
    serial: "",
    purchaseDate: "",
    purchasePrice: "",
    estimatedValue: "",
    location: "",
    hasFinance: false,
    pledgedElsewhere: false,
  };
}

export function emptyTimeDeposit(): TimeDepositDetails {
  return {
    bankName: "",
    accountHolder: "",
    principal: "",
    currency: "HKD",
    startDate: "",
    maturityDate: "",
    rate: "",
    pledgedElsewhere: false,
  };
}

export function emptySecurities(): SecuritiesDetails {
  return {
    brokerName: "",
    accountHolder: "",
    accountLast4: "",
    assetType: "股票",
    estimatedValue: "",
    hasMargin: false,
    marginOutstanding: "",
  };
}

export function createCollateralItem(
  category: CollateralCategory,
  subtype: CollateralSubtype,
): CollateralItem {
  const now = new Date().toISOString();
  const base: CollateralItem = {
    id: `COL-${Date.now().toString(36).toUpperCase()}`,
    category,
    subtype,
    label: subtype,
    createdAt: now,
    updatedAt: now,
    files: {},
  };
  if (category === "real_estate") {
    return { ...base, realEstate: emptyRealEstate() };
  }
  if (subtype === "車輛") return { ...base, vehicle: emptyVehicle() };
  if (subtype === "機器或設備")
    return { ...base, equipment: emptyEquipment() };
  if (subtype === "定期存款")
    return { ...base, timeDeposit: emptyTimeDeposit() };
  if (subtype === "股票或證券")
    return { ...base, securities: emptySecurities() };
  return base;
}

/** 按條件回傳該抵押品應顯示的文件槽 */
export function docSlotsForItem(item: CollateralItem): CollateralDocSlotDef[] {
  if (item.category === "real_estate") {
    const re = item.realEstate ?? emptyRealEstate();
    const slots: CollateralDocSlotDef[] = [
      {
        id: "title_deed",
        title: "物業業權證明",
        accept: "樓契副本／土地註冊處查冊／其他正式業權文件（PDF）",
        level: "required",
      },
    ];
    if (re.hasExistingMortgage) {
      slots.push(
        {
          id: "mortgage_contract",
          title: "現有按揭合約或貸款文件",
          accept: "PDF",
          level: "required",
          conditionHint: "此物業仍有現有按揭",
        },
        {
          id: "mortgage_statement",
          title: "最近期按揭還款月結單",
          accept: "PDF",
          level: "required",
          conditionHint: "此物業仍有現有按揭",
        },
      );
    }
    slots.push(
      {
        id: "rates_rent",
        title: "物業開支證明（差餉／地租）",
        accept: "最新一期差餉或地租通知書",
        level: "recommended",
      },
      {
        id: "management_fee",
        title: "管理費單",
        accept: "最新一期管理費單（建議）",
        level: "recommended",
      },
    );
    if (re.rentalStatus === "已出租") {
      slots.push(
        {
          id: "tenancy",
          title: "租約 Tenancy Agreement",
          accept: "PDF",
          level: "required",
          conditionHint: "物業目前已出租",
        },
        {
          id: "rental_income",
          title: "租金收入證明",
          accept: "銀行入數／月結／收據",
          level: "required",
          conditionHint: "物業目前已出租",
        },
      );
    }
    return slots;
  }

  if (item.subtype === "車輛") {
    const v = item.vehicle ?? emptyVehicle();
    const slots: CollateralDocSlotDef[] = [
      {
        id: "vehicle_registration",
        title: "車輛登記文件（牌簿）",
        accept: "PDF 或清晰照片",
        level: "required",
      },
      {
        id: "purchase_invoice",
        title: "購買發票",
        accept: "PDF",
        level: "required",
      },
      {
        id: "sale_contract",
        title: "買賣合約",
        accept: "PDF",
        level: "required",
      },
    ];
    if (v.hasLoan) {
      slots.push(
        {
          id: "vehicle_loan_contract",
          title: "車輛貸款合約",
          accept: "PDF",
          level: "required",
          conditionHint: "仍有車輛貸款",
        },
        {
          id: "vehicle_loan_statement",
          title: "最近期還款結單／未償還餘額證明",
          accept: "PDF",
          level: "required",
          conditionHint: "仍有車輛貸款",
        },
      );
    }
    return slots;
  }

  if (item.subtype === "機器或設備") {
    return [
      {
        id: "purchase_invoice",
        title: "購買發票",
        accept: "PDF",
        level: "required",
      },
      {
        id: "sale_contract",
        title: "買賣合約",
        accept: "PDF",
        level: "required",
      },
      {
        id: "equipment_photo",
        title: "設備照片",
        accept: "圖片（僅供識別，非正式估值）",
        level: "recommended",
      },
      {
        id: "equipment_serial_photo",
        title: "序號或銘牌照片",
        accept: "圖片",
        level: "recommended",
      },
      {
        id: "equipment_valuation",
        title: "估值報告／保險文件",
        accept: "PDF",
        level: "recommended",
      },
      {
        id: "equipment_finance",
        title: "設備融資合約及還款結單",
        accept: "如有融資則必須",
        level: item.equipment?.hasFinance ? "required" : "recommended",
      },
    ];
  }

  if (item.subtype === "定期存款") {
    return [
      {
        id: "td_certificate",
        title: "銀行定期存款單副本",
        accept: "PDF",
        level: "required",
      },
      {
        id: "td_asset_proof",
        title: "最近期銀行月結單或資產證明",
        accept: "PDF",
        level: "required",
      },
    ];
  }

  if (item.subtype === "股票或證券") {
    const s = item.securities ?? emptySecurities();
    const slots: CollateralDocSlotDef[] = [
      {
        id: "securities_statement",
        title: "最近期證券戶口月結單",
        accept: "PDF（建議最近三個月）",
        level: "required",
      },
    ];
    if (s.hasMargin) {
      slots.push({
        id: "margin_statement",
        title: "孖展融資結單",
        accept: "PDF",
        level: "required",
        conditionHint: "存在孖展融資",
      });
    }
    return slots;
  }

  return [
    {
      id: "other",
      title: "其他資產證明文件",
      accept: "PDF",
      level: "required",
    },
  ];
}

export function slotStatus(
  item: CollateralItem,
  slot: CollateralDocSlotDef,
): CollateralDocStatus {
  const files = item.files[slot.id];
  if (files && files.length > 0) return "已完成";
  if (slot.level === "recommended") return "需要補交";
  return "未上載";
}

export function itemCompleteness(item: CollateralItem) {
  const slots = docSlotsForItem(item);
  const required = slots.filter((s) => s.level === "required");
  const done = required.filter((s) => (item.files[s.id]?.length ?? 0) > 0)
    .length;
  return { done, total: required.length, slots };
}

export function displayTitle(item: CollateralItem): string {
  if (item.category === "real_estate") {
    const addr = item.realEstate?.address?.trim();
    return addr || `${item.subtype}抵押`;
  }
  if (item.subtype === "車輛") {
    const p = item.vehicle?.plate?.trim();
    return p ? `車輛 ${p}` : "車輛抵押";
  }
  if (item.subtype === "機器或設備") {
    return item.equipment?.name?.trim() || "機器或設備抵押";
  }
  if (item.subtype === "定期存款") {
    const b = item.timeDeposit?.bankName?.trim();
    return b ? `${b}定期存款` : "定期存款";
  }
  if (item.subtype === "股票或證券") {
    const b = item.securities?.brokerName?.trim();
    return b ? `${b}證券戶口` : "股票或證券";
  }
  return item.subtype;
}

export function declaredValue(item: CollateralItem): number {
  if (item.realEstate?.estimatedValue !== "")
    return Number(item.realEstate?.estimatedValue) || 0;
  if (item.vehicle?.estimatedValue !== "")
    return Number(item.vehicle?.estimatedValue) || 0;
  if (item.equipment?.estimatedValue !== "")
    return Number(item.equipment?.estimatedValue) || 0;
  if (item.timeDeposit?.principal !== "")
    return Number(item.timeDeposit?.principal) || 0;
  if (item.securities?.estimatedValue !== "")
    return Number(item.securities?.estimatedValue) || 0;
  return 0;
}

export function existingCharge(item: CollateralItem): number {
  if (item.realEstate?.hasExistingMortgage)
    return Number(item.realEstate.outstanding) || 0;
  if (item.vehicle?.hasLoan) return Number(item.vehicle.outstanding) || 0;
  if (item.securities?.hasMargin)
    return Number(item.securities.marginOutstanding) || 0;
  return 0;
}

export function preliminaryNetValue(item: CollateralItem): number {
  return Math.max(0, declaredValue(item) - existingCharge(item));
}

/** 總 LTV＝（現有按揭＋新申請）÷ 估值；僅初步 */
export function preliminaryLtv(
  item: CollateralItem,
  newLoanAmount: number,
): number | null {
  const value = declaredValue(item);
  if (!value) return null;
  return (existingCharge(item) + newLoanAmount) / value;
}

export type CollateralAnalysis = {
  itemId: string;
  title: string;
  subtype: CollateralSubtype;
  ownerOrHolder: string;
  declaredValue: number;
  documentValueNote: string;
  existingCharge: number;
  netValue: number;
  completeness: { done: number; total: number };
  ownershipCheck: string;
  chargeStatus: string;
  needsFormalValuation: boolean;
  confidence: "高" | "中" | "低";
  light: TrafficLight;
  risks: string[];
  rentalMonthly?: number;
};

export function analyzeCollateral(item: CollateralItem): CollateralAnalysis {
  const { done, total } = itemCompleteness(item);
  const value = declaredValue(item);
  const charge = existingCharge(item);
  const net = preliminaryNetValue(item);
  const risks: string[] = [];
  let light: TrafficLight = "green";
  let confidence: "高" | "中" | "低" = "中";

  let ownerOrHolder = "—";
  if (item.realEstate) ownerOrHolder = item.realEstate.owner || "—";
  else if (item.vehicle) ownerOrHolder = item.vehicle.registeredOwner || "—";
  else if (item.equipment) ownerOrHolder = "申請人申報";
  else if (item.timeDeposit)
    ownerOrHolder = item.timeDeposit.accountHolder || "—";
  else if (item.securities)
    ownerOrHolder = item.securities.accountHolder || "—";

  if (done < total) {
    risks.push("必須文件尚未齊全");
    light = "red";
  }
  if (charge > value && value > 0) {
    risks.push("現有貸款餘額高於申報價值");
    light = "red";
  }
  if (
    item.realEstate &&
    !item.realEstate.hasExistingMortgage &&
    (item.files.mortgage_contract?.length ||
      item.files.mortgage_statement?.length)
  ) {
    risks.push("客戶申報無按揭，但已上載按揭相關文件，需人工核對");
    light = light === "red" ? "red" : "amber";
  }
  if (item.timeDeposit?.pledgedElsewhere || item.equipment?.pledgedElsewhere) {
    risks.push("客戶申報資產可能已作其他質押");
    light = light === "red" ? "red" : "amber";
  }
  if (item.securities?.hasMargin) {
    risks.push("證券戶口存在孖展；月結市值≠正式可質押價值");
    if (light === "green") light = "amber";
  }
  if (total > 0 && done === total && light === "green") {
    risks.push("尚未取得正式估值");
    light = "amber";
    confidence = "中";
  }
  if (done === total && net > 0 && risks.length <= 1) {
    confidence = "高";
  }
  if (done === 0) confidence = "低";

  let chargeStatus = "未發現／未申報現有融資";
  if (charge > 0) chargeStatus = `已申報現有融資約 HK$${charge.toLocaleString("en-HK")}`;
  if (item.category === "real_estate" && item.realEstate?.hasExistingMortgage) {
    chargeStatus = `現有按揭（${item.realEstate.mortgageBank || "銀行未填"}）`;
  }

  return {
    itemId: item.id,
    title: displayTitle(item),
    subtype: item.subtype,
    ownerOrHolder,
    declaredValue: value,
    documentValueNote:
      "文件列示價值待 AI／顧問核對；不可直接視為正式可質押價值",
    existingCharge: charge,
    netValue: net,
    completeness: { done, total },
    ownershipCheck: ownerOrHolder !== "—" ? "待與申請人／擔保人核對" : "業權人未填",
    chargeStatus,
    needsFormalValuation: true,
    confidence,
    light,
    risks:
      risks.length > 0
        ? risks
        : ["文件完整度良好，可進入正式估值及人工覆核"],
    rentalMonthly:
      item.realEstate?.rentalStatus === "已出租"
        ? Number(item.realEstate.monthlyRent) || undefined
        : undefined,
  };
}

export function lightLabel(light: TrafficLight) {
  if (light === "green") return "綠燈";
  if (light === "amber") return "黃燈";
  return "紅燈";
}

export function lightTone(light: TrafficLight) {
  if (light === "green") return "info" as const;
  if (light === "amber") return "warning" as const;
  return "error" as const;
}

const STORAGE_KEY = "slf_collateral_items_v1";

export function loadCollateralItems(userKey = "anon"): CollateralItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(`${STORAGE_KEY}:${userKey}`);
    if (!raw) return [];
    return JSON.parse(raw) as CollateralItem[];
  } catch {
    return [];
  }
}

export function saveCollateralItems(
  items: CollateralItem[],
  userKey = "anon",
) {
  if (typeof window === "undefined") return;
  localStorage.setItem(`${STORAGE_KEY}:${userKey}`, JSON.stringify(items));
}

export function isCollateralBasicsComplete(item: CollateralItem): boolean {
  if (item.category === "real_estate") {
    const r = item.realEstate;
    return Boolean(
      r?.address.trim() &&
        r.owner.trim() &&
        r.estimatedValue !== "" &&
        Number(r.estimatedValue) > 0,
    );
  }
  if (item.subtype === "車輛") {
    const v = item.vehicle;
    return Boolean(v?.plate.trim() && v.registeredOwner.trim());
  }
  if (item.subtype === "機器或設備") {
    const e = item.equipment;
    return Boolean(e?.name.trim() && e.estimatedValue !== "");
  }
  if (item.subtype === "定期存款") {
    const t = item.timeDeposit;
    return Boolean(
      t?.bankName.trim() &&
        t.accountHolder.trim() &&
        t.principal !== "" &&
        Number(t.principal) > 0,
    );
  }
  if (item.subtype === "股票或證券") {
    const s = item.securities;
    return Boolean(s?.brokerName.trim() && s.accountHolder.trim());
  }
  return true;
}

export function hasUsableCollateral(items: CollateralItem[]) {
  return items.length > 0 && items.every(isCollateralBasicsComplete);
}

/** 資料使用說明補充（有抵押） */
export const COLLATERAL_DATA_USE_NOTE =
  "所提交的抵押品資料及文件，將用於核對資產業權、估算未償還負債、分析初步抵押價值及安排正式估值。";

export const COLLATERAL_VALUATION_DISCLAIMER =
  "上述估值及淨值只按客戶申報及文件資料計算，實際可接受抵押價值需由指定估值及貸款機構確認。紅燈只代表需要進一步審批，AI 不會直接作出最終拒絕決定。";

export const COLLATERAL_THIRD_PARTY_TYPES = [
  "銀行或貸款機構",
  "土地註冊處查冊服務商",
  "物業估值服務商",
  "車輛或設備估值服務商",
  "證券或資產核實服務商",
  "法律及合規服務商",
] as const;
