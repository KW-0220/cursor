import "server-only";

import { randomUUID } from "crypto";
import { promises as fs } from "fs";
import path from "path";
import {
  draftExpiryDays,
  isEditableDraftStatus,
  type LoanAppStatus,
} from "@/lib/loan-app-status";

/**
 * 申請／草稿主庫（規格 §十二）
 * DATABASE_PROVIDER=file|redis（預設）— 持久化到 data/applications.json 或 Upstash
 * DATABASE_PROVIDER=postgres — 預留（需 DATABASE_URL + 跑 sql/001）
 *
 * Optimistic locking：PATCH 須帶 version_number；不符 → VERSION_CONFLICT
 */

export type ApplicationDraftPayload = Record<string, unknown>;

export type DocumentRecord = {
  id: string;
  applicationId: string;
  storagePath: string;
  originalFilename: string;
  docKind: string | null;
  fileSize: number;
  mimeType: string;
  fileHash: string | null;
  uploadedBy: string;
  uploadStatus:
    | "PENDING"
    | "UPLOADING"
    | "PAUSED"
    | "FAILED"
    | "UPLOADED"
    | "AWAITING_ANALYSIS"
    | "ANALYZING"
    | "ANALYZED"
    | "NEEDS_ATTENTION";
  analysisStatus: string | null;
  analysisResult: unknown | null;
  version: number;
  accessPolicy: string;
  retainUntil: string | null;
  createdAt: string;
  updatedAt: string;
};

export type LoanApplicationRecord = {
  id: string;
  companyId: string | null;
  applicantUserId: string;
  loanType: "secured" | "unsecured" | null;
  requestedAmount: number | null;
  purpose: string | null;
  status: LoanAppStatus;
  currentStep: number;
  completionPercentage: number;
  missingItems: string[];
  nextStepLabel: string | null;
  draftData: ApplicationDraftPayload;
  versionNumber: number;
  lastSavedAt: string;
  submittedAt: string | null;
  expiresAt: string | null;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
  documents: DocumentRecord[];
};

type StoreShape = {
  applications: LoanApplicationRecord[];
};

const DATA_DIR = path.join(process.cwd(), "data");
const DATA_FILE = path.join(DATA_DIR, "applications.json");
const REDIS_KEY = "slf:applications";

let memory: StoreShape | null = null;

async function redisGet(key: string): Promise<string | null> {
  const url =
    process.env.UPSTASH_REDIS_REST_URL?.trim() ||
    process.env.KV_REST_API_URL?.trim();
  const token =
    process.env.UPSTASH_REDIS_REST_TOKEN?.trim() ||
    process.env.KV_REST_API_TOKEN?.trim();
  if (!url || !token) return null;
  const res = await fetch(`${url}/get/${encodeURIComponent(key)}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (!res.ok) return null;
  const data = (await res.json()) as { result: string | null };
  return data.result;
}

async function redisSet(key: string, value: string) {
  const url =
    process.env.UPSTASH_REDIS_REST_URL?.trim() ||
    process.env.KV_REST_API_URL?.trim();
  const token =
    process.env.UPSTASH_REDIS_REST_TOKEN?.trim() ||
    process.env.KV_REST_API_TOKEN?.trim();
  if (!url || !token) return false;
  const res = await fetch(`${url}/set/${encodeURIComponent(key)}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(value),
  });
  return res.ok;
}

async function loadStore(): Promise<StoreShape> {
  if (memory) return memory;
  const fromRedis = await redisGet(REDIS_KEY);
  if (fromRedis) {
    try {
      memory = JSON.parse(fromRedis) as StoreShape;
      return memory;
    } catch {
      /* fall through */
    }
  }
  try {
    const raw = await fs.readFile(DATA_FILE, "utf8");
    memory = JSON.parse(raw) as StoreShape;
    return memory;
  } catch {
    memory = { applications: [] };
    return memory;
  }
}

async function saveStore(store: StoreShape) {
  memory = store;
  const payload = JSON.stringify(store);
  await redisSet(REDIS_KEY, payload);
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(DATA_FILE, payload, "utf8");
}

function newAppId() {
  const y = new Date().getFullYear();
  return `SLF-${y}-${randomUUID().slice(0, 8).toUpperCase()}`;
}

function expiresIso(from = new Date()) {
  const d = new Date(from);
  d.setDate(d.getDate() + draftExpiryDays());
  return d.toISOString();
}

export function getApplicationsStorageMode() {
  const db = (process.env.DATABASE_PROVIDER || "file").trim().toLowerCase();
  if (db === "postgres") return "postgres-pending";
  const hasRedis = Boolean(
    process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL,
  );
  return hasRedis ? "redis+file" : "file";
}

export async function listApplicationsForUser(
  userId: string,
  opts?: { includeDeleted?: boolean },
): Promise<LoanApplicationRecord[]> {
  const store = await loadStore();
  return store.applications
    .filter((a) => a.applicantUserId === userId)
    .filter((a) => opts?.includeDeleted || !a.deletedAt)
    .sort(
      (a, b) =>
        new Date(b.lastSavedAt).getTime() - new Date(a.lastSavedAt).getTime(),
    );
}

export async function getApplication(
  id: string,
  userId?: string,
): Promise<LoanApplicationRecord | null> {
  const store = await loadStore();
  const app = store.applications.find((a) => a.id === id && !a.deletedAt);
  if (!app) return null;
  if (userId && app.applicantUserId !== userId) return null;
  return app;
}

export async function createApplication(params: {
  userId: string;
  loanType?: "secured" | "unsecured" | null;
  draftData?: ApplicationDraftPayload;
  currentStep?: number;
}): Promise<LoanApplicationRecord> {
  const now = new Date().toISOString();
  const app: LoanApplicationRecord = {
    id: newAppId(),
    companyId: null,
    applicantUserId: params.userId,
    loanType: params.loanType ?? null,
    requestedAmount: null,
    purpose: null,
    status: "DRAFT",
    currentStep: params.currentStep ?? 0,
    completionPercentage: 0,
    missingItems: [],
    nextStepLabel: "選擇貸款類型",
    draftData: params.draftData ?? {},
    versionNumber: 1,
    lastSavedAt: now,
    submittedAt: null,
    expiresAt: expiresIso(new Date(now)),
    deletedAt: null,
    createdAt: now,
    updatedAt: now,
    documents: [],
  };
  const store = await loadStore();
  store.applications.unshift(app);
  await saveStore(store);
  return app;
}

export class VersionConflictError extends Error {
  constructor(
    public current: LoanApplicationRecord,
  ) {
    super("VERSION_CONFLICT");
    this.name = "VersionConflictError";
  }
}

export async function patchApplication(params: {
  id: string;
  userId: string;
  expectedVersion: number;
  patch: {
    loanType?: "secured" | "unsecured" | null;
    requestedAmount?: number | null;
    purpose?: string | null;
    status?: LoanAppStatus;
    currentStep?: number;
    completionPercentage?: number;
    missingItems?: string[];
    nextStepLabel?: string | null;
    draftData?: ApplicationDraftPayload;
    mergeDraft?: boolean;
  };
}): Promise<LoanApplicationRecord> {
  const store = await loadStore();
  const idx = store.applications.findIndex(
    (a) => a.id === params.id && !a.deletedAt,
  );
  if (idx < 0) throw new Error("NOT_FOUND");
  const current = store.applications[idx]!;
  if (current.applicantUserId !== params.userId) throw new Error("FORBIDDEN");
  if (!isEditableDraftStatus(current.status) && params.patch.status !== "WITHDRAWN") {
    // 已提交後唔准改草稿內容（除非撤回）
    if (params.patch.draftData || params.patch.currentStep != null) {
      throw new Error("NOT_EDITABLE");
    }
  }
  if (current.versionNumber !== params.expectedVersion) {
    throw new VersionConflictError(current);
  }

  const now = new Date().toISOString();
  const draftData = params.patch.mergeDraft
    ? { ...current.draftData, ...(params.patch.draftData ?? {}) }
    : (params.patch.draftData ?? current.draftData);

  let status = params.patch.status ?? current.status;
  if (
    status === "DRAFT" &&
    (params.patch.currentStep ?? current.currentStep) > 0
  ) {
    status = "IN_PROGRESS";
  }
  if (
    (params.patch.completionPercentage ?? current.completionPercentage) >= 95 &&
    isEditableDraftStatus(status)
  ) {
    status = "READY_TO_SUBMIT";
  }

  const updated: LoanApplicationRecord = {
    ...current,
    loanType:
      params.patch.loanType !== undefined
        ? params.patch.loanType
        : current.loanType,
    requestedAmount:
      params.patch.requestedAmount !== undefined
        ? params.patch.requestedAmount
        : current.requestedAmount,
    purpose:
      params.patch.purpose !== undefined
        ? params.patch.purpose
        : current.purpose,
    status,
    currentStep: params.patch.currentStep ?? current.currentStep,
    completionPercentage:
      params.patch.completionPercentage ?? current.completionPercentage,
    missingItems: params.patch.missingItems ?? current.missingItems,
    nextStepLabel:
      params.patch.nextStepLabel !== undefined
        ? params.patch.nextStepLabel
        : current.nextStepLabel,
    draftData,
    versionNumber: current.versionNumber + 1,
    lastSavedAt: now,
    updatedAt: now,
  };

  store.applications[idx] = updated;
  await saveStore(store);
  return updated;
}

export async function submitApplication(params: {
  id: string;
  userId: string;
  expectedVersion: number;
}): Promise<LoanApplicationRecord> {
  return patchApplication({
    id: params.id,
    userId: params.userId,
    expectedVersion: params.expectedVersion,
    patch: {
      status: "SUBMITTED",
    },
  }).then(async (app) => {
    const store = await loadStore();
    const idx = store.applications.findIndex((a) => a.id === app.id);
    if (idx >= 0) {
      const now = new Date().toISOString();
      store.applications[idx] = {
        ...store.applications[idx]!,
        submittedAt: now,
        status: "SUBMITTED",
        updatedAt: now,
      };
      await saveStore(store);
      return store.applications[idx]!;
    }
    return app;
  });
}

export async function softDeleteApplication(params: {
  id: string;
  userId: string;
}): Promise<void> {
  const store = await loadStore();
  const idx = store.applications.findIndex(
    (a) => a.id === params.id && !a.deletedAt,
  );
  if (idx < 0) throw new Error("NOT_FOUND");
  const current = store.applications[idx]!;
  if (current.applicantUserId !== params.userId) throw new Error("FORBIDDEN");
  if (!isEditableDraftStatus(current.status)) {
    throw new Error("NOT_DELETABLE");
  }
  const now = new Date().toISOString();
  store.applications[idx] = {
    ...current,
    deletedAt: now,
    status: "WITHDRAWN",
    updatedAt: now,
    versionNumber: current.versionNumber + 1,
  };
  await saveStore(store);
}

export async function addDocumentRecord(
  doc: Omit<DocumentRecord, "createdAt" | "updatedAt" | "version"> & {
    version?: number;
  },
): Promise<DocumentRecord> {
  const store = await loadStore();
  const idx = store.applications.findIndex(
    (a) => a.id === doc.applicationId && !a.deletedAt,
  );
  if (idx < 0) throw new Error("NOT_FOUND");
  const now = new Date().toISOString();
  const record: DocumentRecord = {
    ...doc,
    version: doc.version ?? 1,
    createdAt: now,
    updatedAt: now,
  };
  store.applications[idx]!.documents.push(record);
  store.applications[idx]!.updatedAt = now;
  store.applications[idx]!.lastSavedAt = now;
  store.applications[idx]!.versionNumber += 1;
  await saveStore(store);
  return record;
}

export async function listAllApplications(opts?: {
  includeDeleted?: boolean;
}): Promise<LoanApplicationRecord[]> {
  const store = await loadStore();
  return store.applications
    .filter((a) => opts?.includeDeleted || !a.deletedAt)
    .sort(
      (a, b) =>
        new Date(b.lastSavedAt).getTime() - new Date(a.lastSavedAt).getTime(),
    );
}

export async function findActiveDraft(
  userId: string,
): Promise<LoanApplicationRecord | null> {
  const list = await listApplicationsForUser(userId);
  return (
    list.find((a) => isEditableDraftStatus(a.status)) ?? null
  );
}
