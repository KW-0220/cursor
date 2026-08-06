import { BIZ_DOC_SLOTS } from "./documents";
import type {
  BizApplication,
  BizApplicationStatus,
  BizDocSlotId,
} from "./types";

export interface ChecklistItem {
  id: string;
  label: string;
  done: boolean;
  href?: string;
}

export function emptyApplicant(): BizApplication["applicant"] {
  return {
    name: "",
    relation: "",
    email: "",
    phone: "",
    whatsapp: "",
    bestContactTime: "",
    preferredLanguage: "zh-Hant",
    authorized: false,
  };
}

export function emptyCompany(): BizApplication["company"] {
  return {
    nameZh: "",
    nameEn: "",
    crNumber: "",
    brNumber: "",
    foundedAt: "",
    companyType: "有限公司",
    registeredAddress: "",
    businessAddress: "",
    phone: "",
    email: "",
    website: "",
    nature: "",
    products: "",
    incomeSource: "",
    monthlyTurnover: "",
    yearlyTurnover: "",
    employees: "",
    hasOtherBankAccount: null,
    appliedBefore: null,
    rejectedBefore: null,
  };
}

export function emptyAccountNeeds(): BizApplication["accountNeeds"] {
  return {
    hkd: true,
    cny: false,
    usd: false,
    otherFx: false,
    internetBanking: true,
    debitCard: false,
    remittance: true,
    firstDeposit: "",
    monthlyVolume: "",
    preferredBank: "",
    expectedDate: "",
    purpose: "",
  };
}

export function emptyBusinessRegion(): BizApplication["businessRegion"] {
  return {
    operatingCountries: [],
    customerCountries: [],
    supplierCountries: [],
    receiveCountries: [],
    payCountries: [],
    crossBorder: null,
    mainCurrencies: [],
    monthlyReceiveCount: "",
    monthlyPayCount: "",
    monthlyReceiveAmount: "",
    monthlyPayAmount: "",
    maxSingleAmount: "",
    cashTransactions: null,
    onlineSales: null,
    thirdPartyPayment: null,
  };
}

export function emptyBusinessProof(): BizApplication["businessSet1"] {
  return {
    docType: "",
    counterparty: "",
    tradeDate: "",
    amount: "",
    currency: "HKD",
    description: "",
    countries: [],
  };
}

export function emptyConsents(): BizApplication["consents"] {
  return {
    privacy: false,
    terms: false,
    dataUse: false,
    whatsapp: false,
    electronic: false,
    thirdParty: false,
    bankTransfer: false,
    truthfulness: false,
  };
}

export function createEmptyApplication(partial?: Partial<BizApplication>): BizApplication {
  const now = new Date().toISOString();
  return {
    id: partial?.id ?? `BA-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 90000) + 10000)}`,
    createdAt: now,
    updatedAt: now,
    status: "draft",
    completeness: 0,
    applicant: emptyApplicant(),
    company: emptyCompany(),
    accountNeeds: emptyAccountNeeds(),
    directors: [],
    shareholders: [],
    ubos: [],
    nar1Option: null,
    tradingStatus: null,
    businessRegion: emptyBusinessRegion(),
    businessSet1: emptyBusinessProof(),
    businessSet2: emptyBusinessProof(),
    files: [],
    consents: emptyConsents(),
    timeline: [
      {
        id: "t-created",
        status: "account_created",
        label: "帳戶已建立",
        at: now,
        description: "已建立申請工作空間。",
      },
      {
        id: "t-draft",
        status: "draft",
        label: "申請資料填寫中",
        at: now,
        description: "請按步驟填寫資料並上載文件。",
        clientAction: "繼續填寫",
      },
    ],
    whatsapp: [],
    internalNotes: [],
    auditLog: [
      {
        id: "a-1",
        actor: "system",
        action: "create_application",
        detail: "建立新申請",
        at: now,
      },
    ],
    ...partial,
  };
}

function hasText(v: string | undefined | null) {
  return Boolean(v && v.trim());
}

function slotHasFile(app: BizApplication, slot: BizDocSlotId) {
  return app.files.some(
    (f) =>
      f.slotId === slot &&
      f.status !== "not_uploaded" &&
      f.status !== "not_applicable",
  );
}

function nar1Satisfied(app: BizApplication) {
  if (app.nar1Option === "under_one_year" || app.nar1Option === "not_yet") {
    return true;
  }
  return slotHasFile(app, "nar1");
}

function businessProofSatisfied(app: BizApplication) {
  if (app.tradingStatus === "not_started" || app.tradingStatus === "preparing") {
    return slotHasFile(app, "business_alt");
  }
  return (
    slotHasFile(app, "business_set_1") &&
    slotHasFile(app, "business_set_2") &&
    hasText(app.businessSet1.counterparty) &&
    hasText(app.businessSet2.counterparty)
  );
}

export function buildChecklist(app: BizApplication): ChecklistItem[] {
  const applicantDone =
    hasText(app.applicant.name) &&
    hasText(app.applicant.email) &&
    hasText(app.applicant.phone) &&
    hasText(app.applicant.whatsapp) &&
    app.applicant.authorized;

  const companyDone =
    hasText(app.company.nameZh) &&
    hasText(app.company.nameEn) &&
    hasText(app.company.brNumber) &&
    hasText(app.company.crNumber) &&
    hasText(app.company.nature) &&
    (app.accountNeeds.hkd ||
      app.accountNeeds.cny ||
      app.accountNeeds.usd ||
      app.accountNeeds.otherFx);

  const peopleDone =
    app.directors.length > 0 &&
    app.shareholders.length > 0 &&
    app.directors.every(
      (d) => hasText(d.nameEn) && hasText(d.idNumber) && hasText(d.phone),
    );

  const companyDocsDone =
    slotHasFile(app, "br") &&
    slotHasFile(app, "ci") &&
    nar1Satisfied(app) &&
    slotHasFile(app, "aoa");

  const personalDocsDone =
    slotHasFile(app, "director_id") && slotHasFile(app, "address_proof");

  const businessDone = businessProofSatisfied(app);

  const regionDone =
    app.businessRegion.operatingCountries.length > 0 &&
    app.businessRegion.customerCountries.length > 0 &&
    hasText(app.businessRegion.monthlyReceiveAmount);

  const whatsappOk = /^\+?[0-9\s-]{8,}$/.test(app.applicant.whatsapp.trim());

  const consentsDone = Object.values(app.consents).every(Boolean);

  return [
    {
      id: "applicant",
      label: "申請人資料",
      done: applicantDone,
      href: "/workspace/apply/applicant",
    },
    {
      id: "company",
      label: "公司資料及商業戶口需求",
      done: companyDone,
      href: "/workspace/apply/company",
    },
    {
      id: "people",
      label: "董事及股東資料",
      done: peopleDone,
      href: "/workspace/apply/people",
    },
    {
      id: "company-docs",
      label: "公司文件齊全",
      done: companyDocsDone,
      href: "/workspace/apply/company-docs",
    },
    {
      id: "personal-docs",
      label: "個人文件齊全",
      done: personalDocsDone,
      href: "/workspace/apply/personal-docs",
    },
    {
      id: "business",
      label: "業務證明齊全",
      done: businessDone,
      href: "/workspace/apply/business-proof",
    },
    {
      id: "regions",
      label: "業務地區及交易資料",
      done: regionDone,
      href: "/workspace/apply/regions",
    },
    {
      id: "whatsapp",
      label: "WhatsApp 號碼有效",
      done: whatsappOk,
      href: "/workspace/apply/applicant",
    },
    {
      id: "consents",
      label: "所有聲明及同意",
      done: consentsDone,
      href: "/workspace/apply/review",
    },
  ];
}

export function computeCompleteness(app: BizApplication): number {
  const items = buildChecklist(app);
  const done = items.filter((i) => i.done).length;
  return Math.round((done / items.length) * 100);
}

export function missingRequiredDocSlots(app: BizApplication): BizDocSlotId[] {
  const missing: BizDocSlotId[] = [];
  for (const slot of BIZ_DOC_SLOTS) {
    if (!slot.required) continue;
    if (slot.id === "nar1" && nar1Satisfied(app)) continue;
    if (slot.id === "business_set_1" || slot.id === "business_set_2") {
      if (businessProofSatisfied(app)) continue;
      if (!slotHasFile(app, slot.id) && app.tradingStatus === "operating") {
        missing.push(slot.id);
      }
      continue;
    }
    if (slot.id === "shareholder_id") {
      // MVP：有董事身份證明即可；股東身份可後補
      continue;
    }
    if (!slotHasFile(app, slot.id)) missing.push(slot.id);
  }
  if (
    (app.tradingStatus === "not_started" || app.tradingStatus === "preparing") &&
    !slotHasFile(app, "business_alt")
  ) {
    missing.push("business_alt");
  }
  return missing;
}

export function deriveClientStatus(app: BizApplication): BizApplicationStatus {
  if (
    app.status !== "draft" &&
    app.status !== "missing_docs" &&
    app.status !== "submitted"
  ) {
    return app.status;
  }
  if (app.submittedAt) {
    return app.status === "draft" || app.status === "missing_docs"
      ? "submitted"
      : app.status;
  }
  const checklist = buildChecklist(app);
  const core = checklist.filter((c) => c.id !== "consents");
  if (core.some((c) => !c.done)) {
    const docsMissing = missingRequiredDocSlots(app).length > 0;
    const formMissing = core
      .filter((c) =>
        ["applicant", "company", "people", "regions"].includes(c.id),
      )
      .some((c) => !c.done);
    if (docsMissing && !formMissing) return "missing_docs";
    return "draft";
  }
  return "draft";
}

export function canConfirmDocsComplete(app: BizApplication): boolean {
  const requiredSlots = BIZ_DOC_SLOTS.filter((s) => {
    if (!s.required) return false;
    if (s.id === "shareholder_id") return false;
    if (s.id === "nar1") return app.nar1Option === "has_nar1" || !app.nar1Option;
    if (s.id === "business_set_1" || s.id === "business_set_2") {
      return app.tradingStatus === "operating" || !app.tradingStatus;
    }
    return true;
  }).map((s) => s.id);

  if (
    (app.tradingStatus === "not_started" || app.tradingStatus === "preparing") &&
    !app.files.some((f) => f.slotId === "business_alt" && f.status === "approved")
  ) {
    return false;
  }

  for (const slotId of requiredSlots) {
    const files = app.files.filter((f) => f.slotId === slotId);
    if (files.length === 0) return false;
    if (!files.every((f) => f.status === "approved" || f.status === "not_applicable")) {
      return false;
    }
  }
  return true;
}

export function maskIdNumber(value: string): string {
  const v = value.trim();
  if (v.length <= 4) return "*".repeat(v.length);
  return `${v.slice(0, 3)}${"*".repeat(Math.max(v.length - 5, 2))}${v.slice(-2)}`;
}

export function formatBytes(n: number) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

export function formatDateTime(iso: string) {
  try {
    return new Intl.DateTimeFormat("zh-HK", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}
