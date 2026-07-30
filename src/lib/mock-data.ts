import type {
  BankMonth,
  ChatMessage,
  CollateralProperty,
  ExistingDebt,
  FinancialYear,
  LoanApplication,
  ScreeningRuleHit,
  SupplementRequest,
  TimelineEvent,
} from "./types";

/** 後台／列表示範已清空；客戶端僅保留無案件的空結構。 */
export const mockCompany = {
  nameZh: "",
  nameEn: "",
  brNumber: "",
  crNumber: "",
  foundedAt: "",
  companyType: "",
  industry: "",
  address: "",
  employees: 0,
  website: "",
  contactPerson: "",
};

export const mockApplicant = {
  nameZh: "",
  nameEn: "",
  idNumber: "",
  phone: "",
  email: "",
  title: "",
  relation: "董事" as const,
};

export const applications: LoanApplication[] = [];

export const timeline: TimelineEvent[] = [];

export const financialYears: FinancialYear[] = [];

export const bankMonths: BankMonth[] = [];

export const existingDebts: ExistingDebt[] = [];

export const collateral: CollateralProperty = {
  type: "",
  address: "",
  owner: "",
  holding: "公司",
  estimatedValue: 0,
  mortgageBank: "",
  outstanding: 0,
  monthlyPayment: 0,
  otherCharges: false,
  selfUse: false,
};

export const screeningHits: ScreeningRuleHit[] = [];

export const supplements: SupplementRequest[] = [];

export const aiWelcome: ChatMessage = {
  id: "m0",
  role: "assistant",
  content:
    "你好，我是 SME LoanFlow 的 AI 財務助理。我可以協助你整理融資需要、文件清單及資料收集，但不會直接決定是否批出貸款。請問今次貸款主要用作甚麼用途？",
  quickReplies: [
    "營運資金",
    "出糧／支付供應商",
    "購買貨物",
    "公司擴充",
    "購買商業物業",
    "現有貸款再融資",
    "其他用途",
  ],
  disclaimer:
    "AI 為財務助理及文件分析引擎，只供資料收集與預審參考；最終批核由貸款顧問及相關機構決定。",
};

export const checklistOk: string[] = [];

export const checklistIssues: string[] = [];

export const adminKpis = [
  { label: "新申請", value: 0 },
  { label: "文件分析中", value: 0 },
  { label: "需要補件", value: 0 },
  { label: "待人工審核", value: 0 },
  { label: "已送交貸款機構", value: 0 },
  { label: "本月批核", value: 0 },
  { label: "平均處理時間", value: "—" },
];

export const documentRequirements = {
  secured: [] as Array<{
    name: string;
    requirement: string;
    status: "completed" | "needs_attention" | "pending";
  }>,
  unsecured: [] as Array<{
    name: string;
    requirement: string;
    status: "completed" | "needs_attention" | "pending";
  }>,
};
