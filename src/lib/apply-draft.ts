/**
 * 申請草稿：localStorage（表單）+ IndexedDB（上載檔案）
 * 防止中途離開 App 後資料盡失。
 */

import type { ApplyDocsState, UploadedMeta } from "@/components/app/apply-documents-upload";
import type { LoanType } from "@/lib/types";

const DRAFT_VERSION = 1 as const;
const LS_PREFIX = "slf_apply_draft";
const IDB_NAME = "slf-apply-files";
const IDB_STORE = "files";

export type FileMeta = {
  name: string;
  size: number;
  type: string;
};

export type ApplyDraftV1 = {
  version: typeof DRAFT_VERSION;
  savedAt: string;
  step: number;
  loanType: LoanType | null;
  amount: number | "";
  purpose: string;
  tenureYears: string;
  fundingDate: string;
  targetBank: string;
  extraNotes: string;
  hasExistingLoan: boolean | null;
  lender: string;
  debtType: string;
  facility: string;
  outstanding: string;
  consents: Record<string, boolean>;
  bankMonths: string[];
  docsMeta: {
    br: FileMeta | null;
    audited: FileMeta[];
    identity: FileMeta[];
    companyOther: FileMeta[];
    bank: Record<string, FileMeta | null>;
  };
};

function lsKey(userKey: string) {
  return `${LS_PREFIX}:${userKey || "anon"}`;
}

function toMeta(f: UploadedMeta | null): FileMeta | null {
  if (!f) return null;
  return { name: f.name, size: f.size, type: f.type };
}

export function buildApplyDraft(input: {
  step: number;
  loanType: LoanType | null;
  amount: number | "";
  purpose: string;
  tenureYears: string;
  fundingDate: string;
  targetBank: string;
  extraNotes: string;
  hasExistingLoan: boolean | null;
  lender: string;
  debtType: string;
  facility: string;
  outstanding: string;
  consents: Record<string, boolean>;
  bankMonths: string[];
  docs: ApplyDocsState;
}): ApplyDraftV1 {
  const { docs, bankMonths } = input;
  return {
    version: DRAFT_VERSION,
    savedAt: new Date().toISOString(),
    step: input.step,
    loanType: input.loanType,
    amount: input.amount,
    purpose: input.purpose,
    tenureYears: input.tenureYears,
    fundingDate: input.fundingDate,
    targetBank: input.targetBank,
    extraNotes: input.extraNotes,
    hasExistingLoan: input.hasExistingLoan,
    lender: input.lender,
    debtType: input.debtType,
    facility: input.facility,
    outstanding: input.outstanding,
    consents: input.consents,
    bankMonths,
    docsMeta: {
      br: toMeta(docs.br),
      audited: docs.audited.map((f) => toMeta(f)!),
      identity: docs.identity.map((f) => toMeta(f)!),
      companyOther: docs.companyOther.map((f) => toMeta(f)!),
      bank: Object.fromEntries(
        bankMonths.map((m) => [m, toMeta(docs.bank[m] ?? null)]),
      ),
    },
  };
}

export function loadApplyDraft(userKey: string): ApplyDraftV1 | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(lsKey(userKey));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ApplyDraftV1;
    if (!parsed || parsed.version !== DRAFT_VERSION) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveApplyDraftLocal(userKey: string, draft: ApplyDraftV1) {
  localStorage.setItem(lsKey(userKey), JSON.stringify(draft));
}

export function clearApplyDraft(userKey: string) {
  try {
    localStorage.removeItem(lsKey(userKey));
  } catch {
    /* ignore */
  }
  void clearApplyFiles(userKey);
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(IDB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(IDB_STORE)) {
        db.createObjectStore(IDB_STORE);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error("IDB_OPEN_FAILED"));
  });
}

function fileKey(userKey: string, slot: string) {
  return `${userKey || "anon"}:${slot}`;
}

async function idbPut(key: string, value: Blob) {
  const db = await openDb();
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, "readwrite");
    tx.objectStore(IDB_STORE).put(value, key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error("IDB_PUT_FAILED"));
  });
}

async function idbGet(key: string): Promise<Blob | null> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, "readonly");
    const req = tx.objectStore(IDB_STORE).get(key);
    req.onsuccess = () => resolve((req.result as Blob | undefined) ?? null);
    req.onerror = () => reject(req.error ?? new Error("IDB_GET_FAILED"));
  });
}

async function idbDeletePrefix(prefix: string) {
  const db = await openDb();
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, "readwrite");
    const store = tx.objectStore(IDB_STORE);
    const req = store.openCursor();
    req.onsuccess = () => {
      const cursor = req.result;
      if (!cursor) return;
      if (String(cursor.key).startsWith(prefix)) cursor.delete();
      cursor.continue();
    };
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error("IDB_CLEAR_FAILED"));
  });
}

export async function clearApplyFiles(userKey: string) {
  if (typeof indexedDB === "undefined") return;
  try {
    await idbDeletePrefix(`${userKey || "anon"}:`);
  } catch {
    /* ignore */
  }
}

/** 把 docs 內 File 寫入 IndexedDB */
export async function saveApplyFiles(
  userKey: string,
  docs: ApplyDocsState,
  bankMonths: string[],
) {
  if (typeof indexedDB === "undefined") return;
  const jobs: Promise<void>[] = [];

  const put = (slot: string, meta: UploadedMeta | null | undefined) => {
    if (!meta?.file) return;
    jobs.push(idbPut(fileKey(userKey, slot), meta.file));
  };

  put("br", docs.br);
  docs.audited.forEach((f, i) => put(`audited:${i}`, f));
  docs.identity.forEach((f, i) => put(`identity:${i}`, f));
  docs.companyOther.forEach((f, i) => put(`companyOther:${i}`, f));
  for (const m of bankMonths) put(`bank:${m}`, docs.bank[m]);

  await Promise.all(jobs);
}

async function blobToUploaded(
  meta: FileMeta | null | undefined,
  blob: Blob | null,
): Promise<UploadedMeta | null> {
  if (!meta || !blob) return null;
  const file = new File([blob], meta.name, {
    type: meta.type || blob.type || "application/octet-stream",
    lastModified: Date.now(),
  });
  return {
    name: meta.name,
    size: meta.size || file.size,
    type: meta.type || file.type,
    file,
  };
}

/** 由草稿 meta + IndexedDB 還原 ApplyDocsState */
export async function restoreApplyDocs(
  userKey: string,
  draft: ApplyDraftV1,
  fallbackMonths: string[],
): Promise<ApplyDocsState> {
  const months =
    draft.bankMonths?.length > 0 ? draft.bankMonths : fallbackMonths;
  const emptyBank = Object.fromEntries(months.map((m) => [m, null])) as Record<
    string,
    UploadedMeta | null
  >;

  const brBlob = await idbGet(fileKey(userKey, "br")).catch(() => null);
  const br = await blobToUploaded(draft.docsMeta.br, brBlob);

  const audited: UploadedMeta[] = [];
  for (let i = 0; i < (draft.docsMeta.audited?.length ?? 0); i++) {
    const blob = await idbGet(fileKey(userKey, `audited:${i}`)).catch(
      () => null,
    );
    const u = await blobToUploaded(draft.docsMeta.audited[i], blob);
    if (u) audited.push(u);
  }

  const identity: UploadedMeta[] = [];
  for (let i = 0; i < (draft.docsMeta.identity?.length ?? 0); i++) {
    const blob = await idbGet(fileKey(userKey, `identity:${i}`)).catch(
      () => null,
    );
    const u = await blobToUploaded(draft.docsMeta.identity[i], blob);
    if (u) identity.push(u);
  }

  const companyOther: UploadedMeta[] = [];
  for (let i = 0; i < (draft.docsMeta.companyOther?.length ?? 0); i++) {
    const blob = await idbGet(fileKey(userKey, `companyOther:${i}`)).catch(
      () => null,
    );
    const u = await blobToUploaded(draft.docsMeta.companyOther[i], blob);
    if (u) companyOther.push(u);
  }

  const bank = { ...emptyBank };
  for (const m of months) {
    const blob = await idbGet(fileKey(userKey, `bank:${m}`)).catch(() => null);
    bank[m] = await blobToUploaded(draft.docsMeta.bank?.[m], blob);
  }

  return { br, audited, identity, companyOther, bank };
}

export async function persistApplyDraft(
  userKey: string,
  draft: ApplyDraftV1,
  docs: ApplyDocsState,
  bankMonths: string[],
) {
  saveApplyDraftLocal(userKey, draft);
  await saveApplyFiles(userKey, docs, bankMonths);
}

export function formatDraftSavedAt(iso: string) {
  try {
    return new Date(iso).toLocaleString("zh-HK", { hour12: false });
  } catch {
    return iso;
  }
}
