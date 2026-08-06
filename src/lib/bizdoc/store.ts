import {
  buildChecklist,
  computeCompleteness,
  createEmptyApplication,
  deriveClientStatus,
} from "./completeness";
import { emptyRelatedCompany, type BizApplication, type BizApplicationStatus, type BizDocStatus, type BizUploadedFile, type WhatsAppSendStatus } from "./types";
import { normalizeApplication } from "./normalize";

/** v2：不再自動灌入示範資料，新客戶從空白表單開始 */
const STORAGE_KEY = "bizdoc.application.v2";
const ADMIN_KEY = "bizdoc.admin.applications.v2";
const LEGACY_STORAGE_KEY = "bizdoc.application.v1";
const LEGACY_ADMIN_KEY = "bizdoc.admin.applications.v1";
const DEMO_APP_IDS = new Set(["BA-2026-10482", "BA-2026-11003"]);

function now() {
  return new Date().toISOString();
}

export function seedDemo(): BizApplication {
  const app = createEmptyApplication({
    id: "BA-2026-10482",
  });
  app.applicant = {
    name: "陳雅婷",
    relation: "董事",
    email: "yat.ting@example.com",
    phone: "+85291234567",
    whatsapp: "+85291234567",
    bestContactTime: "工作日 10:00–18:00",
    preferredLanguage: "zh-Hant",
    authorized: true,
  };
  app.company = {
    nameZh: "智航貿易有限公司",
    nameEn: "SmartSail Trading Limited",
    crNumber: "7654321",
    brNumber: "12345678-000-01-26-A",
    foundedAt: "2024-03-18",
    companyType: "有限公司",
    registeredAddress: "香港九龍觀塘成業街 7 號寧晉中心 12 樓 A 室",
    businessAddress: "香港九龍觀塘成業街 7 號寧晉中心 12 樓 A 室",
    phone: "+85221234567",
    email: "ops@smartsail.example",
    website: "https://smartsail.example",
    nature: "進出口貿易",
    products: "電子配件及周邊產品",
    incomeSource: "產品銷售",
    monthlyTurnover: "800000",
    yearlyTurnover: "9600000",
    employees: "8",
    hasOtherBankAccount: false,
    appliedBefore: false,
    rejectedBefore: false,
  };
  app.accountNeeds = {
    hkd: true,
    cny: true,
    usd: true,
    otherFx: false,
    internetBanking: true,
    debitCard: true,
    remittance: true,
    firstDeposit: "200000",
    monthlyVolume: "1500000",
    preferredBank: "",
    expectedDate: "2026-09-30",
    purpose: "日常營運收款及供應商付款",
  };
  app.directors = [
    {
      id: "d1",
      nameZh: "陳雅婷",
      nameEn: "Chan Nga Ting",
      idType: "hkid",
      idNumber: "A123456(7)",
      nationality: "中國香港",
      dateOfBirth: "1990-05-12",
      phone: "+85291234567",
      email: "yat.ting@example.com",
      residenceCountry: "香港",
      isShareholder: true,
      sharePercent: "60",
      isPrimaryContact: true,
    },
    {
      id: "d2",
      nameZh: "李浩然",
      nameEn: "Lee Ho Yin",
      idType: "passport",
      idNumber: "P45891289",
      nationality: "加拿大",
      dateOfBirth: "1988-11-02",
      phone: "+14165550123",
      email: "hoyin@example.com",
      residenceCountry: "加拿大",
      isShareholder: true,
      sharePercent: "40",
      isPrimaryContact: false,
    },
  ];
  app.shareholders = [
    {
      id: "s1",
      name: "陳雅婷",
      type: "individual",
      sharePercent: "60",
      isDirector: true,
      isUbo: true,
    },
    {
      id: "s2",
      name: "李浩然",
      type: "individual",
      sharePercent: "40",
      isDirector: true,
      isUbo: true,
    },
  ];
  app.ubos = [
    {
      id: "u1",
      name: "陳雅婷",
      ownershipPercent: "60",
      nationality: "中國香港",
      idType: "hkid",
      idNumber: "A123456(7)",
    },
    {
      id: "u2",
      name: "李浩然",
      ownershipPercent: "40",
      nationality: "加拿大",
      idType: "passport",
      idNumber: "P45891289",
    },
  ];
  app.classification = {
    shareholderIdentity: "hk_local",
    companyAge: "over_one_year",
    hasRelatedCompany: "no",
    systemCategory: 6,
    clientConfirmed: true,
    confirmedAt: "2026-07-20T10:10:00.000Z",
    overrideCategory: null,
  };
  app.relatedCompany = emptyRelatedCompany();
  app.nar1Option = "has_nar1";
  app.tradingStatus = "operating";
  app.businessRegion = {
    operatingCountries: ["香港", "中國內地"],
    customerCountries: ["香港", "新加坡", "美國"],
    supplierCountries: ["中國內地", "台灣"],
    receiveCountries: ["香港", "新加坡"],
    payCountries: ["中國內地", "香港"],
    crossBorder: true,
    mainCurrencies: ["HKD", "USD", "CNY"],
    monthlyReceiveCount: "20",
    monthlyPayCount: "15",
    monthlyReceiveAmount: "800000",
    monthlyPayAmount: "650000",
    maxSingleAmount: "200000",
    cashTransactions: false,
    onlineSales: true,
    thirdPartyPayment: false,
  };
  app.businessSet1 = {
    docType: "銷售發票",
    counterparty: "Pacific Gadgets Pte Ltd",
    tradeDate: "2026-05-12",
    amount: "48000",
    currency: "USD",
    description: "電子配件出口",
    countries: ["新加坡"],
  };
  app.businessSet2 = {
    docType: "採購發票",
    counterparty: "深圳芯聯科技有限公司",
    tradeDate: "2026-04-28",
    amount: "210000",
    currency: "CNY",
    description: "零件採購",
    countries: ["中國內地"],
  };
  app.files = [
    file("br", "BR_SmartSail.pdf", "approved"),
    file("ci", "CI_SmartSail.pdf", "approved"),
    file("id_hkid", "HKID_Chan.jpg", "needs_resubmit", {
      issueType: "文件不清晰",
      issueReason: "身份證反面部份反光，無法確認出生日期。",
    }),
    file("cv", "CV_Chan.pdf", "awaiting_review"),
    file("personal_bank_m1", "Personal_Bank_M1.pdf", "awaiting_review"),
    file("personal_bank_m2", "Personal_Bank_M2.pdf", "awaiting_review"),
    file("work_experience", "MPF_Chan.pdf", "awaiting_review"),
    file("hk_bank_m1", "HK_Bank_M1.pdf", "awaiting_review"),
    file("hk_bank_m2", "HK_Bank_M2.pdf", "awaiting_review"),
    file("audit_report", "Audit_2025.pdf", "awaiting_review"),
  ];
  app.interviewChecklist = {
    cv_print: "needed",
    id_original: "needed",
    passport_original: "na",
    permit_original: "na",
    bank_other: "needed",
    extra: "na",
  };
  app.status = "needs_supplement";
  app.submittedAt = "2026-08-01T09:20:00.000Z";
  app.assignee = "林雅雯";
  app.completeness = computeCompleteness(app);
  app.timeline = [
    {
      id: "t1",
      status: "account_created",
      label: "帳戶已建立",
      at: "2026-07-20T10:00:00.000Z",
      description: "客戶完成電郵註冊。",
    },
    {
      id: "t2",
      status: "draft",
      label: "申請資料填寫中",
      at: "2026-07-20T10:05:00.000Z",
      description: "開始填寫公司及董事資料。",
    },
    {
      id: "t3",
      status: "submitted",
      label: "申請已提交",
      at: "2026-08-01T09:20:00.000Z",
      description: "客戶正式提交申請。",
    },
    {
      id: "t4",
      status: "whatsapp_sent",
      label: "WhatsApp 通知已發送",
      at: "2026-08-01T09:20:30.000Z",
      description: "已通知申請進入處理中。",
      whatsappStatus: "delivered",
    },
    {
      id: "t5",
      status: "doc_review",
      label: "文件檢查中",
      at: "2026-08-02T11:00:00.000Z",
      description: "文件審核員開始逐項檢查。",
    },
    {
      id: "t6",
      status: "needs_supplement",
      label: "需要補交資料",
      at: "2026-08-04T15:40:00.000Z",
      description: "董事身份證明需重新上載。",
      clientAction: "查看補件要求",
      whatsappStatus: "delivered",
    },
  ];
  app.whatsapp = [
    {
      id: "w1",
      type: "submitted",
      content:
        "我們已收到你提交的公司及商業戶口申請資料（BA-2026-10482｜智航貿易有限公司）。團隊現正逐項檢查文件，申請狀態已更新為「處理中」。",
      phone: "+85291234567",
      sentAt: "2026-08-01T09:20:30.000Z",
      status: "delivered",
    },
    {
      id: "w2",
      type: "supplement",
      content:
        "你的申請（BA-2026-10482｜智航貿易有限公司）有 1 項資料需要重新上載。請登入申請平台查看詳細要求。",
      phone: "+85291234567",
      sentAt: "2026-08-04T15:41:00.000Z",
      status: "delivered",
    },
  ];
  app.internalNotes = [
    {
      id: "n1",
      author: "林雅雯",
      content: "海外董事地址證明接受加拿大銀行月結單。",
      createdAt: "2026-08-03T10:12:00.000Z",
    },
  ];
  app.auditLog = [
    {
      id: "a1",
      actor: "system",
      action: "create_application",
      detail: "建立申請",
      at: "2026-07-20T10:00:00.000Z",
    },
    {
      id: "a2",
      actor: "陳雅婷",
      action: "submit",
      detail: "正式提交申請",
      at: "2026-08-01T09:20:00.000Z",
    },
    {
      id: "a3",
      actor: "林雅雯",
      action: "request_supplement",
      detail: "董事身份證明：文件不清晰",
      at: "2026-08-04T15:40:00.000Z",
    },
  ];
  return app;
}

function file(
  slotId: BizUploadedFile["slotId"],
  originalName: string,
  status: BizDocStatus,
  extra?: Partial<BizUploadedFile>,
): BizUploadedFile {
  return {
    id: `f-${slotId}-${originalName}`,
    slotId,
    originalName,
    storedName: `${slotId}_${Date.now()}_${originalName}`,
    sizeBytes: 1_200_000,
    mimeType: originalName.endsWith(".pdf") ? "application/pdf" : "image/jpeg",
    uploadedAt: "2026-07-28T14:00:00.000Z",
    uploadedBy: "陳雅婷",
    status,
    version: 1,
    ...extra,
  };
}

function readLocal<T>(key: string): T | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function writeLocal(key: string, value: unknown) {
  if (typeof window === "undefined") return;
  localStorage.setItem(key, JSON.stringify(value));
}

function isDemoApplication(app: BizApplication): boolean {
  if (DEMO_APP_IDS.has(app.id)) return true;
  if (app.applicant?.name === "陳雅婷" && app.company?.nameZh === "智航貿易有限公司") {
    return true;
  }
  if (app.applicant?.name === "王俊傑" && app.company?.nameZh === "創啟顧問有限公司") {
    return true;
  }
  return false;
}

export function loadClientApplication(): BizApplication {
  const existing = readLocal<BizApplication>(STORAGE_KEY);
  if (existing && !isDemoApplication(existing)) {
    return normalizeApplication(existing);
  }

  // 舊版 localStorage 若是真實客戶資料則遷移；示範資料則丟棄
  const legacy = readLocal<BizApplication>(LEGACY_STORAGE_KEY);
  if (legacy && !isDemoApplication(legacy)) {
    const migrated = normalizeApplication(legacy);
    writeLocal(STORAGE_KEY, migrated);
    try {
      localStorage.removeItem(LEGACY_STORAGE_KEY);
    } catch {
      /* ignore */
    }
    return migrated;
  }

  const fresh = createEmptyApplication();
  writeLocal(STORAGE_KEY, fresh);
  try {
    localStorage.removeItem(LEGACY_STORAGE_KEY);
  } catch {
    /* ignore */
  }
  return fresh;
}

export function saveClientApplication(app: BizApplication): BizApplication {
  const next = {
    ...app,
    updatedAt: now(),
    completeness: computeCompleteness(app),
    status: deriveClientStatus({
      ...app,
      completeness: computeCompleteness(app),
    }),
  };
  writeLocal(STORAGE_KEY, next);
  upsertAdminCopy(next);
  return next;
}

export function resetClientApplication(): BizApplication {
  const fresh = createEmptyApplication();
  writeLocal(STORAGE_KEY, fresh);
  upsertAdminCopy(fresh);
  return fresh;
}

export function submitClientApplication(app: BizApplication): BizApplication {
  const checklist = buildChecklist(app);
  if (checklist.some((c) => !c.done)) {
    throw new Error("尚有未完成項目，無法提交");
  }
  const at = now();
  const submitted: BizApplication = {
    ...app,
    submittedAt: at,
    updatedAt: at,
    status: "submitted",
    completeness: 100,
    timeline: [
      ...app.timeline,
      {
        id: `t-submit-${at}`,
        status: "submitted",
        label: "申請已提交",
        at,
        description: "系統已收到申請，團隊將開始檢查。",
      },
      {
        id: `t-wa-${at}`,
        status: "whatsapp_sent",
        label: "WhatsApp 通知已發送",
        at,
        description: "已發送「申請已提交，現正處理中」通知。",
        whatsappStatus: "sent",
      },
    ],
    whatsapp: [
      ...app.whatsapp,
      {
        id: `w-submit-${at}`,
        type: "submitted",
        content: `我們已收到你提交的公司及商業戶口申請資料（${app.id}｜${app.company.nameZh || "未命名公司"}）。團隊現正逐項檢查文件，申請狀態已更新為「處理中」。如需要補充資料，我們將透過 WhatsApp 通知你。`,
        phone: app.applicant.whatsapp,
        sentAt: at,
        status: "sent",
      },
    ],
    auditLog: [
      ...app.auditLog,
      {
        id: `a-submit-${at}`,
        actor: app.applicant.name || "客戶",
        action: "submit",
        detail: "正式提交申請",
        at,
      },
    ],
  };
  writeLocal(STORAGE_KEY, submitted);
  upsertAdminCopy(submitted);
  return submitted;
}

function upsertAdminCopy(app: BizApplication) {
  const list = listAdminApplications().filter((a) => a.id !== app.id);
  list.unshift(app);
  writeLocal(ADMIN_KEY, list);
}

export function listAdminApplications(): BizApplication[] {
  const list = readLocal<BizApplication[]>(ADMIN_KEY);
  if (list) {
    const cleaned = list
      .map(normalizeApplication)
      .filter((a) => !isDemoApplication(a));
    if (cleaned.length !== list.length) writeLocal(ADMIN_KEY, cleaned);
    return cleaned;
  }

  const legacy = readLocal<BizApplication[]>(LEGACY_ADMIN_KEY);
  if (legacy) {
    const cleaned = legacy
      .map(normalizeApplication)
      .filter((a) => !isDemoApplication(a));
    writeLocal(ADMIN_KEY, cleaned);
    try {
      localStorage.removeItem(LEGACY_ADMIN_KEY);
    } catch {
      /* ignore */
    }
    return cleaned;
  }

  writeLocal(ADMIN_KEY, []);
  return [];
}

export function createDraftSecondary(): BizApplication {
  const app = createEmptyApplication({ id: "BA-2026-11003" });
  app.applicant = {
    name: "王俊傑",
    relation: "獲授權代表",
    email: "wang@example.com",
    phone: "+85298881234",
    whatsapp: "+85298881234",
    bestContactTime: "下午",
    preferredLanguage: "zh-Hant",
    authorized: true,
  };
  app.company.nameZh = "創啟顧問有限公司";
  app.company.nameEn = "LaunchKey Advisory Limited";
  app.status = "draft";
  app.completeness = 18;
  return app;
}

export function getAdminApplication(id: string): BizApplication | null {
  return listAdminApplications().find((a) => a.id === id) ?? null;
}

export function updateAdminApplication(
  id: string,
  updater: (app: BizApplication) => BizApplication,
): BizApplication {
  const list = listAdminApplications();
  const idx = list.findIndex((a) => a.id === id);
  if (idx < 0) throw new Error("申請不存在");
  const next = updater(list[idx]);
  next.updatedAt = now();
  next.completeness = computeCompleteness(next);
  list[idx] = next;
  writeLocal(ADMIN_KEY, list);
  const client = readLocal<BizApplication>(STORAGE_KEY);
  if (client?.id === id) writeLocal(STORAGE_KEY, next);
  return next;
}

export function setFileStatus(
  appId: string,
  fileId: string,
  status: BizDocStatus,
  meta?: { issueType?: string; issueReason?: string; adminNote?: string },
) {
  return updateAdminApplication(appId, (app) => ({
    ...app,
    files: app.files.map((f) =>
      f.id === fileId
        ? {
            ...f,
            status,
            issueType: meta?.issueType ?? f.issueType,
            issueReason: meta?.issueReason ?? f.issueReason,
            adminNote: meta?.adminNote ?? f.adminNote,
          }
        : f,
    ),
    auditLog: [
      ...app.auditLog,
      {
        id: `a-${now()}`,
        actor: app.assignee || "審核員",
        action: "update_file_status",
        detail: `${fileId} → ${status}`,
        at: now(),
      },
    ],
  }));
}

export function requestSupplement(
  appId: string,
  fileId: string,
  issueType: string,
  issueReason: string,
) {
  const at = now();
  return updateAdminApplication(appId, (app) => {
    const file = app.files.find((f) => f.id === fileId);
    const phone = app.applicant.whatsapp;
    return {
      ...app,
      status: "needs_supplement" as BizApplicationStatus,
      files: app.files.map((f) =>
        f.id === fileId
          ? {
              ...f,
              status: "needs_resubmit" as BizDocStatus,
              issueType,
              issueReason,
            }
          : f,
      ),
      timeline: [
        ...app.timeline,
        {
          id: `t-sup-${at}`,
          status: "needs_supplement",
          label: "需要補交資料",
          at,
          description: `${file?.originalName || "文件"}：${issueType}`,
          clientAction: "查看補件要求",
          whatsappStatus: "sent" as WhatsAppSendStatus,
        },
      ],
      whatsapp: [
        ...app.whatsapp,
        {
          id: `w-sup-${at}`,
          type: "supplement",
          content: `你的申請（${app.id}｜${app.company.nameZh || "未命名公司"}）有部分資料或文件需要補充或重新上載。請登入申請平台查看詳細要求。`,
          phone,
          sentAt: at,
          status: "sent",
        },
      ],
      auditLog: [
        ...app.auditLog,
        {
          id: `a-sup-${at}`,
          actor: app.assignee || "審核員",
          action: "request_supplement",
          detail: `${file?.originalName}: ${issueType} — ${issueReason}`,
          at,
        },
      ],
    };
  });
}

export function confirmDocsComplete(appId: string, actor: string) {
  const at = now();
  return updateAdminApplication(appId, (app) => ({
    ...app,
    status: "docs_complete",
    timeline: [
      ...app.timeline,
      {
        id: `t-done-${at}`,
        status: "docs_complete",
        label: "文件已收齊",
        at,
        description: "所有初步所需文件已確認收齊。",
        whatsappStatus: "sent",
      },
    ],
    whatsapp: [
      ...app.whatsapp,
      {
        id: `w-done-${at}`,
        type: "docs_complete",
        content: `你的申請（${app.id}｜${app.company.nameZh || "未命名公司"}）所需文件已完成初步檢查並確認收齊。團隊將進入下一階段處理；文件收齊不代表商業戶口已獲批。`,
        phone: app.applicant.whatsapp,
        sentAt: at,
        status: "sent",
      },
    ],
    auditLog: [
      ...app.auditLog,
      {
        id: `a-done-${at}`,
        actor,
        action: "confirm_docs_complete",
        detail: "確認文件已收齊",
        at,
      },
    ],
  }));
}

export function addMockUpload(
  app: BizApplication,
  slotId: BizUploadedFile["slotId"],
  fileMeta: { name: string; size: number; type: string },
): BizApplication {
  const at = now();
  const version =
    Math.max(0, ...app.files.filter((f) => f.slotId === slotId).map((f) => f.version)) +
    1;
  const uploaded: BizUploadedFile = {
    id: `f-${slotId}-${at}`,
    slotId,
    originalName: fileMeta.name,
    storedName: `${slotId}_${at}_${fileMeta.name}`,
    sizeBytes: fileMeta.size,
    mimeType: fileMeta.type || "application/octet-stream",
    uploadedAt: at,
    uploadedBy: app.applicant.name || "客戶",
    status: app.submittedAt ? "reuploaded" : "uploaded",
    version,
  };

  let files: BizUploadedFile[];
  if (app.submittedAt) {
    files = [...app.files, uploaded];
  } else {
    files = [...app.files.filter((f) => f.slotId !== slotId), uploaded];
  }

  return saveClientApplication({
    ...app,
    files,
    status: app.submittedAt ? "supplement_review" : app.status,
    auditLog: [
      ...app.auditLog,
      {
        id: `a-up-${at}`,
        actor: app.applicant.name || "客戶",
        action: "upload_file",
        detail: `${slotId}: ${fileMeta.name}`,
        at,
      },
    ],
  });
}
