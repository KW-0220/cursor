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

export const mockCompany = {
  nameZh: "智創科技有限公司",
  nameEn: "SmartCreate Technology Ltd.",
  brNumber: "12345678",
  crNumber: "7890123",
  foundedAt: "2018-03-12",
  companyType: "有限公司",
  industry: "資訊科技服務",
  address: "香港九龍觀塘成業街 27 號日昇中心 12 樓 A 室",
  employees: 28,
  website: "https://smartcreate.example",
  contactPerson: "陳大文",
};

export const mockApplicant = {
  nameZh: "陳大文",
  nameEn: "Chan Tai Man",
  idNumber: "A123456(7)",
  phone: "+852 9123 4567",
  email: "tm.chan@smartcreate.example",
  title: "董事",
  relation: "董事" as const,
};

export const applications: LoanApplication[] = [
  {
    id: "SLF-2026-00482",
    company: mockCompany,
    applicant: mockApplicant,
    loanType: "unsecured",
    amount: 1500000,
    purpose: "營運資金／出糧及支付供應商",
    tenureYears: 3,
    status: "Additional Info Required",
    documentCompleteness: 78,
    screening: "amber",
    advisor: "李美欣",
    updatedAt: "2026-07-17T16:40:00+08:00",
    submittedAt: "2026-07-15T11:22:00+08:00",
    slaHoursRemaining: 18,
  },
  {
    id: "SLF-2026-00461",
    company: {
      ...mockCompany,
      nameZh: "港灣餐飲集團有限公司",
      nameEn: "Harbour Dining Group Ltd.",
      industry: "餐飲",
      employees: 65,
    },
    applicant: {
      ...mockApplicant,
      nameZh: "王詩婷",
      nameEn: "Wong Sze Ting",
    },
    loanType: "secured",
    amount: 5000000,
    purpose: "購買商業物業",
    tenureYears: 10,
    status: "Under Review",
    documentCompleteness: 94,
    screening: "green",
    advisor: "張浩然",
    updatedAt: "2026-07-16T09:15:00+08:00",
    submittedAt: "2026-07-12T14:05:00+08:00",
    slaHoursRemaining: 42,
  },
  {
    id: "SLF-2026-00420",
    company: {
      ...mockCompany,
      nameZh: "駿達物流有限公司",
      nameEn: "Jetda Logistics Ltd.",
      industry: "物流",
      employees: 40,
    },
    applicant: mockApplicant,
    loanType: "unsecured",
    amount: 800000,
    purpose: "現有貸款再融資",
    tenureYears: 2,
    status: "Sent to Lender",
    documentCompleteness: 100,
    screening: "red",
    advisor: "李美欣",
    updatedAt: "2026-07-14T18:00:00+08:00",
    submittedAt: "2026-07-08T10:30:00+08:00",
    slaHoursRemaining: 6,
  },
];

export const timeline: TimelineEvent[] = [
  {
    id: "t1",
    date: "2026-07-15T11:22:00+08:00",
    status: "已提交",
    description: "申請已成功提交，系統開始文件分析。",
    owner: "系統",
    nextAction: "等待 AI 文件完整性檢查",
  },
  {
    id: "t2",
    date: "2026-07-15T12:05:00+08:00",
    status: "文件分析中",
    description: "已完成審計報告及銀行結單分類，正在提取財務資料。",
    owner: "AI 引擎",
  },
  {
    id: "t3",
    date: "2026-07-16T09:40:00+08:00",
    status: "顧問審核中",
    description: "案件已分配予顧問李美欣跟進。",
    owner: "李美欣",
  },
  {
    id: "t4",
    date: "2026-07-17T16:40:00+08:00",
    status: "需要補充資料",
    description: "請補交 2026 年 3 月完整銀行結單（缺少第 4–6 頁）。",
    owner: "李美欣",
    nextAction: "上載補充文件",
  },
];

export const financialYears: FinancialYear[] = [
  {
    year: "FY2023",
    revenue: 12800000,
    grossProfit: 4480000,
    grossMargin: 35,
    netProfit: 960000,
    equity: 3200000,
    sourcePage: 8,
    confidence: 0.92,
  },
  {
    year: "FY2024",
    revenue: 14500000,
    grossProfit: 5220000,
    grossMargin: 36,
    netProfit: 1180000,
    equity: 3850000,
    sourcePage: 9,
    confidence: 0.89,
  },
  {
    year: "FY2025",
    revenue: 16200000,
    grossProfit: 5994000,
    grossMargin: 37,
    netProfit: 1420000,
    equity: 4500000,
    sourcePage: 7,
    confidence: 0.94,
  },
];

export const bankMonths: BankMonth[] = [
  {
    month: "2025-10",
    totalInflow: 1480000,
    avgBalance: 420000,
    minBalance: 180000,
    bouncedCheques: 0,
    anomalies: [],
  },
  {
    month: "2025-11",
    totalInflow: 1520000,
    avgBalance: 390000,
    minBalance: 165000,
    bouncedCheques: 0,
    anomalies: [],
  },
  {
    month: "2025-12",
    totalInflow: 1710000,
    avgBalance: 510000,
    minBalance: 210000,
    bouncedCheques: 0,
    anomalies: ["年末異常大額轉出需覆核"],
  },
  {
    month: "2026-01",
    totalInflow: 1390000,
    avgBalance: 360000,
    minBalance: 120000,
    bouncedCheques: 0,
    anomalies: [],
  },
  {
    month: "2026-02",
    totalInflow: 1460000,
    avgBalance: 380000,
    minBalance: 140000,
    bouncedCheques: 1,
    anomalies: ["出現 1 次彈票"],
  },
  {
    month: "2026-03",
    totalInflow: 1500000,
    avgBalance: 400000,
    minBalance: 155000,
    bouncedCheques: 0,
    anomalies: ["結單缺頁"],
  },
];

export const existingDebts: ExistingDebt[] = [
  {
    lender: "香港某銀行",
    type: "營運貸款",
    facility: 1000000,
    outstanding: 620000,
    monthlyPayment: 28000,
    rate: 6.5,
    maturity: "2027-08-31",
    overdue: false,
  },
  {
    lender: "財務機構 A",
    type: "設備融資",
    facility: 400000,
    outstanding: 180000,
    monthlyPayment: 12000,
    rate: 8.2,
    maturity: "2026-12-15",
    overdue: false,
  },
];

export const collateral: CollateralProperty = {
  type: "寫字樓",
  address: "九龍觀塘開源道 72 號宏利金融中心 8 樓",
  owner: "智創科技有限公司",
  holding: "公司",
  estimatedValue: 9800000,
  mortgageBank: "香港某銀行",
  outstanding: 4200000,
  monthlyPayment: 32000,
  otherCharges: false,
  selfUse: true,
};

export const screeningHits: ScreeningRuleHit[] = [
  {
    rule: "月均入數相對供款",
    status: "amber",
    detail: "每月供款佔最近六個月平均入數約 42%，接近預設初篩參考值。",
    suggestion: "需要由審批人員進一步核實現金流及現有債務安排。",
  },
  {
    rule: "文件完整度",
    status: "amber",
    detail: "2026 年 3 月銀行結單缺少第 4 至第 6 頁。",
    suggestion: "要求客戶補件後重新進行 OCR。",
  },
  {
    rule: "彈票紀錄",
    status: "amber",
    detail: "最近六個月出現 1 次彈票。",
    suggestion: "請顧問確認原因及後續安排。",
  },
  {
    rule: "營業額趨勢",
    status: "green",
    detail: "過去三年營業額穩定上升。",
    suggestion: "可優先安排顧問跟進。",
  },
];

export const supplements: SupplementRequest[] = [
  {
    id: "sup-1",
    documentType: "銀行結單",
    reason: "缺頁",
    detail: "請補交 2026 年 3 月完整銀行結單。現有文件缺少第 4 至第 6 頁。",
    dueDate: "2026-07-22",
    required: true,
    advisorNote: "請上載清晰 PDF，避免手機拍攝裁切。",
  },
];

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

export const checklistOk = [
  "已識別完整公司名稱",
  "已包括三個財政年度",
  "審計報告已簽署",
  "所有頁面清晰可讀",
];

export const checklistIssues = [
  "2026 年 3 月銀行結單缺少第 4 頁",
  "銀行結單日期並非連續六個月（待確認）",
];

export const adminKpis = [
  { label: "新申請", value: 12 },
  { label: "文件分析中", value: 5 },
  { label: "需要補件", value: 8 },
  { label: "待人工審核", value: 14 },
  { label: "已送交貸款機構", value: 6 },
  { label: "本月批核", value: 9 },
  { label: "平均處理時間", value: "2.4 天" },
];

export const documentRequirements = {
  secured: [
    { name: "商業登記證 BR", requirement: "PDF", status: "completed" as const },
    { name: "最近期 NAR1", requirement: "PDF", status: "completed" as const },
    { name: "最近六個月銀行月結單", requirement: "PDF", status: "needs_attention" as const },
    { name: "董事／股東／擔保人身份證明", requirement: "PDF 或清晰照片", status: "completed" as const },
    { name: "物業業權證明", requirement: "樓契／查冊", status: "pending" as const },
    { name: "現有按揭文件（如適用）", requirement: "合約及月結", status: "pending" as const },
    { name: "租約及租金證明（如已出租）", requirement: "按條件必須", status: "pending" as const },
  ],
  unsecured: [
    { name: "商業登記證 BR", requirement: "PDF", status: "completed" as const },
    { name: "最近期 NAR1", requirement: "PDF", status: "completed" as const },
    { name: "最近六個月銀行月結單", requirement: "PDF", status: "needs_attention" as const },
    { name: "董事／股東／擔保人身份證明", requirement: "PDF 或清晰照片", status: "completed" as const },
    { name: "現有銀行授信信", requirement: "每間貸款機構分開上載", status: "completed" as const },
    { name: "其他財務資料", requirement: "按個案要求", status: "pending" as const },
  ],
};
