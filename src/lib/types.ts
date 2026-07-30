export type LoanType = "secured" | "unsecured";

export type ApplicationStatus =
  | "Draft"
  | "Submitted"
  | "AI Processing"
  | "Under Review"
  | "Additional Info Required"
  | "Matched"
  | "Sent to Lender"
  | "Approved"
  | "Not Approved"
  | "Withdrawn";

export type ScreeningResult = "green" | "amber" | "red";

export type DocumentStatus =
  | "pending"
  | "uploading"
  | "classifying"
  | "analyzing"
  | "completed"
  | "needs_attention"
  | "failed"
  | "supplement_required";

export type UserRole =
  | "applicant"
  | "advisor"
  | "senior_reviewer"
  | "compliance"
  | "administrator";

export interface CompanyProfile {
  nameZh: string;
  nameEn: string;
  brNumber: string;
  crNumber: string;
  foundedAt: string;
  companyType: string;
  industry: string;
  address: string;
  employees: number;
  website?: string;
  contactPerson: string;
}

export interface ApplicantProfile {
  nameZh: string;
  nameEn: string;
  idNumber: string;
  phone: string;
  email: string;
  title: string;
  relation: "董事" | "股東" | "獲授權代表" | "其他";
}

export interface LoanApplication {
  id: string;
  company: CompanyProfile;
  applicant: ApplicantProfile;
  loanType: LoanType;
  amount: number;
  purpose: string;
  tenureYears: number;
  status: ApplicationStatus;
  documentCompleteness: number;
  screening: ScreeningResult;
  advisor?: string;
  updatedAt: string;
  submittedAt?: string;
  slaHoursRemaining?: number;
}

export interface TimelineEvent {
  id: string;
  date: string;
  status: string;
  description: string;
  owner: string;
  nextAction?: string;
}

export interface FinancialYear {
  year: string;
  revenue: number;
  grossProfit: number;
  grossMargin: number;
  netProfit: number;
  equity: number;
  sourcePage: number;
  confidence: number;
}

export interface BankMonth {
  month: string;
  totalInflow: number;
  avgBalance: number;
  minBalance: number;
  bouncedCheques: number;
  anomalies: string[];
}

export interface ExistingDebt {
  lender: string;
  type: string;
  facility: number;
  outstanding: number;
  monthlyPayment: number;
  rate: number;
  maturity: string;
  overdue: boolean;
}

export interface CollateralProperty {
  type: string;
  address: string;
  owner: string;
  holding: "公司" | "個人";
  estimatedValue: number;
  mortgageBank: string;
  outstanding: number;
  monthlyPayment: number;
  otherCharges: boolean;
  selfUse: boolean;
  rentalIncome?: number;
}

export interface ScreeningRuleHit {
  rule: string;
  status: ScreeningResult;
  detail: string;
  suggestion: string;
}

export interface SupplementRequest {
  id: string;
  documentType: string;
  reason: string;
  detail: string;
  dueDate: string;
  required: boolean;
  advisorNote?: string;
}

export interface ChatMessage {
  id: string;
  role: "assistant" | "user";
  content: string;
  quickReplies?: string[];
  actions?: { label: string; href: string }[];
  disclaimer?: string;
}

export const STATUS_LABEL: Record<ApplicationStatus, string> = {
  Draft: "尚未完成",
  Submitted: "審批中",
  "AI Processing": "審批中",
  "Under Review": "審批中",
  "Additional Info Required": "審批中",
  Matched: "審批中",
  "Sent to Lender": "審批中",
  Approved: "成功批核",
  "Not Approved": "申請失敗",
  Withdrawn: "申請失敗",
};

export const DOC_STATUS_LABEL: Record<DocumentStatus, string> = {
  pending: "未上載",
  uploading: "正在安全上載文件……",
  classifying: "AI 正在識別文件類型……",
  analyzing: "正在提取財務資料，請稍候",
  completed: "文件分析完成",
  needs_attention: "發現部分資料需要確認",
  failed: "未能讀取文件，請重新上載較清晰版本",
  supplement_required: "需補交",
};
