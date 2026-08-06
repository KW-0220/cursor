import {
  DOC_CATEGORY_SHORT,
  classificationSummary,
  effectiveCategory,
  isClassificationComplete,
} from "./classification";
import {
  INTERVIEW_CHECKLIST_BASE,
  STATEMENT_MONTH_SETS,
  getDocSlot,
  resolveSlotPlan,
  type BizDocSlotId,
} from "./documents";
import {
  emptyClassification,
  emptyProofMeta,
  emptyRelatedCompany,
  type BizApplication,
  type BizApplicationStatus,
} from "./types";

export interface ChecklistItem {
  id: string;
  label: string;
  done: boolean;
  href?: string;
}

export interface DocProgress {
  categoryLabel: string;
  requiredTotal: number;
  requiredDone: number;
  missingLabels: string[];
  interviewNeeded: number;
  interviewPrepared: number;
  percent: number;
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
  return emptyProofMeta();
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

export function createEmptyApplication(
  partial?: Partial<BizApplication>,
): BizApplication {
  const now = new Date().toISOString();
  const base: BizApplication = {
    id:
      partial?.id ??
      `BA-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 90000) + 10000)}`,
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
    classification: emptyClassification(),
    relatedCompany: emptyRelatedCompany(),
    slotOverrides: {},
    interviewChecklist: Object.fromEntries(
      INTERVIEW_CHECKLIST_BASE.map((i) => [i.id, "needed" as const]),
    ),
    extraDocRequests: [],
    nar1Option: null,
    tradingStatus: null,
    businessRegion: emptyBusinessRegion(),
    businessSet1: emptyBusinessProof(),
    businessSet2: emptyBusinessProof(),
    hkBusinessProofs: [emptyProofMeta(), emptyProofMeta(), emptyProofMeta()],
    relatedInvoices: [emptyProofMeta(), emptyProofMeta(), emptyProofMeta()],
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
        description: "請先完成申請分類，再按步驟填寫資料並上載文件。",
        clientAction: "開始分類",
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
  };
  return { ...base, ...partial, classification: partial?.classification ?? base.classification };
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

/** 三個月流水：合併 PDF 可替代分月 */
export function statementSetSatisfied(
  app: BizApplication,
  key: keyof typeof STATEMENT_MONTH_SETS,
): boolean {
  const set = STATEMENT_MONTH_SETS[key];
  if (slotHasFile(app, set.combined)) return true;
  return set.months.every((m) => slotHasFile(app, m));
}

export function statementSetMissing(
  app: BizApplication,
  key: keyof typeof STATEMENT_MONTH_SETS,
): string[] {
  const set = STATEMENT_MONTH_SETS[key];
  if (slotHasFile(app, set.combined)) return [];
  return set.months
    .filter((m) => !slotHasFile(app, m))
    .map((m) => getDocSlot(m)?.name || m);
}

function requiredSlotDone(app: BizApplication, slotId: BizDocSlotId): boolean {
  // 流水集合特殊處理
  for (const [key, set] of Object.entries(STATEMENT_MONTH_SETS) as [
    keyof typeof STATEMENT_MONTH_SETS,
    (typeof STATEMENT_MONTH_SETS)[keyof typeof STATEMENT_MONTH_SETS],
  ][]) {
    if (set.months.includes(slotId) || set.combined === slotId) {
      return statementSetSatisfied(app, key);
    }
  }
  return slotHasFile(app, slotId);
}

export function getResolvedPlans(app: BizApplication) {
  const cat = effectiveCategory(app.classification ?? emptyClassification());
  if (!cat) return [];
  return resolveSlotPlan({
    category: cat,
    identity: app.classification?.shareholderIdentity ?? null,
    overrides: app.slotOverrides,
  });
}

export function buildDocProgress(app: BizApplication): DocProgress {
  const plans = getResolvedPlans(app).filter((p) => p.requirement === "required");
  // 流水：同一 set 只計一次
  const counted = new Set<string>();
  let requiredTotal = 0;
  let requiredDone = 0;
  const missingLabels: string[] = [];

  for (const plan of plans) {
    const id = plan.slot.id;
    let groupKey: string | null = null;
    for (const [key, set] of Object.entries(STATEMENT_MONTH_SETS)) {
      if (set.months.includes(id) || set.combined === id) {
        groupKey = `stmt:${key}`;
        break;
      }
    }
    const dedupe = groupKey ?? id;
    if (counted.has(dedupe)) continue;
    counted.add(dedupe);
    requiredTotal += 1;
    const done = requiredSlotDone(app, id);
    if (done) requiredDone += 1;
    else {
      if (groupKey) {
        const key = groupKey.replace("stmt:", "") as keyof typeof STATEMENT_MONTH_SETS;
        missingLabels.push(...statementSetMissing(app, key));
      } else {
        missingLabels.push(plan.slot.name);
      }
    }
  }

  const interviewNeeded = INTERVIEW_CHECKLIST_BASE.filter(
    (i) => (app.interviewChecklist?.[i.id] ?? "needed") === "needed",
  ).length;
  const interviewPrepared = INTERVIEW_CHECKLIST_BASE.filter(
    (i) => app.interviewChecklist?.[i.id] === "prepared",
  ).length;

  const cat = effectiveCategory(app.classification ?? emptyClassification());
  return {
    categoryLabel: cat ? DOC_CATEGORY_SHORT[cat] : "尚未完成分類",
    requiredTotal,
    requiredDone,
    missingLabels,
    interviewNeeded,
    interviewPrepared,
    percent:
      requiredTotal === 0
        ? 0
        : Math.round((requiredDone / requiredTotal) * 100),
  };
}

export function buildChecklist(app: BizApplication): ChecklistItem[] {
  const classification = app.classification ?? emptyClassification();
  const classDone = isClassificationComplete(classification);
  const docProgress = buildDocProgress(app);
  const docsDone =
    classDone &&
    docProgress.requiredTotal > 0 &&
    docProgress.requiredDone === docProgress.requiredTotal;

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
    hasText(app.company.foundedAt) &&
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

  const relatedNeeded =
    classification.hasRelatedCompany === "yes" ||
    Boolean(
      effectiveCategory(classification) &&
        ["1", "4", "3r", "6r"].includes(String(effectiveCategory(classification))),
    );
  const relatedDone =
    !relatedNeeded ||
    (hasText(app.relatedCompany?.name) &&
      hasText(app.relatedCompany?.location) &&
      hasText(app.relatedCompany?.relation));

  const interviewDone = INTERVIEW_CHECKLIST_BASE.every((i) => {
    const s = app.interviewChecklist?.[i.id] ?? "needed";
    return s === "prepared" || s === "na";
  });

  const regionDone =
    app.businessRegion.operatingCountries.length > 0 &&
    app.businessRegion.customerCountries.length > 0 &&
    hasText(app.businessRegion.monthlyReceiveAmount);

  const whatsappOk = /^\+?[0-9\s-]{8,}$/.test(app.applicant.whatsapp.trim());
  const consentsDone = Object.values(app.consents).every(Boolean);

  return [
    {
      id: "classify",
      label: `申請分類${classDone ? `（${classificationSummary(classification)}）` : ""}`,
      done: classDone,
      href: "/workspace/apply/classify",
    },
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
      id: "related",
      label: "關聯公司資料",
      done: relatedDone,
      href: "/workspace/apply/documents",
    },
    {
      id: "documents",
      label: `文件上載（${docProgress.requiredDone}/${docProgress.requiredTotal}）`,
      done: docsDone,
      href: "/workspace/apply/documents",
    },
    {
      id: "interview",
      label: "面簽帶備 Checklist",
      done: interviewDone,
      href: "/workspace/apply/interview",
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
  const plans = getResolvedPlans(app).filter((p) => p.requirement === "required");
  const seenStmt = new Set<string>();
  for (const plan of plans) {
    const id = plan.slot.id;
    for (const [key, set] of Object.entries(STATEMENT_MONTH_SETS) as [
      keyof typeof STATEMENT_MONTH_SETS,
      (typeof STATEMENT_MONTH_SETS)[keyof typeof STATEMENT_MONTH_SETS],
    ][]) {
      if (set.months.includes(id) || set.combined === id) {
        if (seenStmt.has(key)) continue;
        seenStmt.add(key);
        if (!statementSetSatisfied(app, key)) {
          for (const m of set.months) {
            if (!slotHasFile(app, m) && !slotHasFile(app, set.combined)) {
              missing.push(m);
            }
          }
        }
        continue;
      }
    }
    if (!requiredSlotDone(app, id)) {
      // avoid dup from statement handling
      if (
        !Object.values(STATEMENT_MONTH_SETS).some(
          (s) => s.months.includes(id) || s.combined === id,
        )
      ) {
        missing.push(id);
      }
    }
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
        ["classify", "applicant", "company", "people", "regions"].includes(
          c.id,
        ),
      )
      .some((c) => !c.done);
    if (docsMissing && !formMissing) return "missing_docs";
    return "draft";
  }
  return "draft";
}

export function canConfirmDocsComplete(app: BizApplication): boolean {
  const plans = getResolvedPlans(app).filter((p) => p.requirement === "required");
  if (!plans.length) return false;
  const seenStmt = new Set<string>();
  for (const plan of plans) {
    const id = plan.slot.id;
    let stmtKey: keyof typeof STATEMENT_MONTH_SETS | null = null;
    for (const [key, set] of Object.entries(STATEMENT_MONTH_SETS) as [
      keyof typeof STATEMENT_MONTH_SETS,
      (typeof STATEMENT_MONTH_SETS)[keyof typeof STATEMENT_MONTH_SETS],
    ][]) {
      if (set.months.includes(id) || set.combined === id) {
        stmtKey = key;
        break;
      }
    }
    if (stmtKey) {
      if (seenStmt.has(stmtKey)) continue;
      seenStmt.add(stmtKey);
      const set = STATEMENT_MONTH_SETS[stmtKey];
      const files = app.files.filter(
        (f) =>
          (set.months.includes(f.slotId as BizDocSlotId) ||
            f.slotId === set.combined) &&
          f.status !== "not_uploaded",
      );
      if (!statementSetSatisfied(app, stmtKey)) return false;
      if (
        !files.every(
          (f) => f.status === "approved" || f.status === "not_applicable",
        )
      ) {
        return false;
      }
      continue;
    }
    const files = app.files.filter((f) => f.slotId === id);
    if (files.length === 0) return false;
    if (
      !files.every(
        (f) => f.status === "approved" || f.status === "not_applicable",
      )
    ) {
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
