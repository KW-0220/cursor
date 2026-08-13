import "server-only";
import { promises as fs } from "fs";
import path from "path";
import type { ApplicationAiAnalysis } from "@/lib/ai-application-decision";
import {
  normalizeClientAppStatus,
  type ClientAppStatus,
} from "@/lib/application-status";
import {
  durableJsonGet,
  durableJsonSet,
  durableJsonStoreReady,
} from "@/lib/durable-json-store";

export type ApplicationDocumentRef = {
  id: string;
  kind: string;
  slot: string;
  fileName: string;
  size: number;
  mimeType: string;
};

export type ApplicationRecord = {
  id: string;
  loanType:
    | "secured"
    | "unsecured"
    | "personal_mortgage"
    | "company_mortgage"
    | null;
  amount: number;
  purpose: string;
  status: ClientAppStatus;
  failureReason: string | null;
  docsPct?: number;
  bankCount?: number;
  customerId?: string | null;
  applicantNameZh?: string | null;
  companyNameZh?: string | null;
  email?: string | null;
  phone?: string | null;
  documents?: ApplicationDocumentRef[];
  /** 提交時持久化的文件 AI 分析＋批核決定 */
  aiAnalysis?: ApplicationAiAnalysis | null;
  mortgageKind?: "new_buy" | "refinance" | null;
  isShellCompany?: boolean | null;
  mortgageCalc?: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
};

const DATA_DIR = path.join(process.cwd(), "data");
const DATA_FILE = path.join(DATA_DIR, "applications.json");
const REDIS_KEY = "slf:applications";
const DURABLE_PATH = "applications.json";

let memoryStore: ApplicationRecord[] | null = null;

function redisConfigured() {
  return Boolean(
    (process.env.UPSTASH_REDIS_REST_URL &&
      process.env.UPSTASH_REDIS_REST_TOKEN) ||
      (process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN),
  );
}

async function redisGet(key: string): Promise<unknown> {
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
  const data = (await res.json()) as { result: unknown };
  return data.result ?? null;
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

function parseList(raw: unknown): ApplicationRecord[] {
  if (Array.isArray(raw)) return raw as ApplicationRecord[];
  if (typeof raw === "string") {
    try {
      const parsed: unknown = JSON.parse(raw);
      return Array.isArray(parsed) ? (parsed as ApplicationRecord[]) : [];
    } catch {
      return [];
    }
  }
  return [];
}

async function ensureLoaded(): Promise<ApplicationRecord[]> {
  // Supabase Storage：每次重讀，避免 Vercel 多 instance memory 不同步
  if (durableJsonStoreReady()) {
    const fromDurable = await durableJsonGet<unknown>(DURABLE_PATH);
    if (fromDurable != null) {
      memoryStore = parseList(fromDurable);
      return memoryStore;
    }
  }
  if (memoryStore) return memoryStore;
  if (redisConfigured()) {
    try {
      const fromRedis = await redisGet(REDIS_KEY);
      if (fromRedis != null && fromRedis !== "") {
        memoryStore = parseList(fromRedis);
        return memoryStore;
      }
    } catch {
      /* fall through */
    }
  }
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
    const raw = await fs.readFile(DATA_FILE, "utf8");
    memoryStore = parseList(raw);
  } catch {
    memoryStore = [];
  }
  return memoryStore;
}

async function persist(records: ApplicationRecord[]) {
  memoryStore = records;
  if (durableJsonStoreReady()) {
    await durableJsonSet(DURABLE_PATH, records);
  }
  if (redisConfigured()) {
    await redisSet(REDIS_KEY, JSON.stringify(records));
  }
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
    await fs.writeFile(DATA_FILE, JSON.stringify(records, null, 2), "utf8");
  } catch {
    /* ignore */
  }
}

export async function listApplications() {
  const records = await ensureLoaded();
  return [...records].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function getApplication(id: string) {
  const records = await ensureLoaded();
  return records.find((r) => r.id === id) ?? null;
}

const STUB_PURPOSE = "（文件上載時補建）";

function isStubPurpose(purpose: string | null | undefined) {
  return !purpose || purpose === STUB_PURPOSE;
}

function pickStr(
  next: string | null | undefined,
  prev: string | null | undefined,
) {
  const n = typeof next === "string" ? next.trim() : next;
  if (n) return n;
  const p = typeof prev === "string" ? prev.trim() : prev;
  return p || null;
}

/**
 * 文件上載用：確保申請存在，並綁定客戶；唔會用空 stub 覆蓋已有完整資料。
 */
export async function ensureApplicationForDocuments(
  id: string,
  link?: {
    customerId?: string | null;
    email?: string | null;
    applicantNameZh?: string | null;
    phone?: string | null;
  },
) {
  const records = await ensureLoaded();
  const now = new Date().toISOString();
  const idx = records.findIndex((r) => r.id === id);
  const customerId = link?.customerId?.trim() || null;
  const email = link?.email?.trim().toLowerCase() || null;
  const applicantNameZh = link?.applicantNameZh?.trim() || null;
  const phone = link?.phone?.trim() || null;

  if (idx >= 0) {
    const prev = records[idx];
    const updated: ApplicationRecord = {
      ...prev,
      customerId: customerId || prev.customerId || null,
      email: email || prev.email || null,
      applicantNameZh: applicantNameZh || prev.applicantNameZh || null,
      phone: phone || prev.phone || null,
      updatedAt: now,
    };
    const changed =
      updated.customerId !== prev.customerId ||
      updated.email !== prev.email ||
      updated.applicantNameZh !== prev.applicantNameZh ||
      updated.phone !== prev.phone;
    if (changed) {
      records[idx] = updated;
      await persist(records);
    }
    return changed ? updated : prev;
  }

  const created: ApplicationRecord = {
    id,
    loanType: null,
    amount: 0,
    purpose: STUB_PURPOSE,
    customerId,
    applicantNameZh,
    companyNameZh: null,
    email,
    phone,
    documents: [],
    aiAnalysis: null,
    status: "under_review",
    failureReason: null,
    createdAt: now,
    updatedAt: now,
  };
  records.unshift(created);
  await persist(records);
  return created;
}

export async function upsertApplication(
  input: Partial<ApplicationRecord> & {
    id: string;
    loanType:
      | "secured"
      | "unsecured"
      | "personal_mortgage"
      | "company_mortgage"
      | null;
    amount: number;
    purpose: string;
  },
) {
  const records = await ensureLoaded();
  const now = new Date().toISOString();
  const status = normalizeClientAppStatus(input.status ?? "under_review");
  const failureReason =
    status === "rejected"
      ? input.failureReason?.trim() || "未有提供失敗原因"
      : input.failureReason ?? null;

  const idx = records.findIndex((r) => r.id === input.id);
  if (idx >= 0) {
    const prev = records[idx];
    // 防止補件 stub（amount=0／stub purpose／null 客戶）覆蓋已有完整申請
    const incomingStub =
      isStubPurpose(input.purpose) &&
      (input.amount == null || input.amount === 0) &&
      !input.email &&
      !input.customerId;

    const updated: ApplicationRecord = {
      ...prev,
      ...input,
      loanType:
        input.loanType != null
          ? input.loanType
          : prev.loanType,
      amount:
        incomingStub && prev.amount > 0
          ? prev.amount
          : input.amount,
      purpose:
        incomingStub && !isStubPurpose(prev.purpose)
          ? prev.purpose
          : input.purpose,
      customerId: pickStr(input.customerId, prev.customerId),
      email: pickStr(input.email, prev.email),
      applicantNameZh: pickStr(input.applicantNameZh, prev.applicantNameZh),
      companyNameZh: pickStr(input.companyNameZh, prev.companyNameZh),
      phone: pickStr(input.phone, prev.phone),
      status: incomingStub ? prev.status : status,
      failureReason: incomingStub
        ? prev.failureReason
        : status === "rejected"
          ? failureReason
          : null,
      documents: input.documents ?? prev.documents ?? [],
      aiAnalysis:
        input.aiAnalysis !== undefined
          ? input.aiAnalysis
          : prev.aiAnalysis ?? null,
      mortgageKind:
        input.mortgageKind !== undefined
          ? input.mortgageKind
          : prev.mortgageKind ?? null,
      isShellCompany:
        input.isShellCompany !== undefined
          ? input.isShellCompany
          : prev.isShellCompany ?? null,
      mortgageCalc:
        input.mortgageCalc !== undefined
          ? input.mortgageCalc
          : prev.mortgageCalc ?? null,
      updatedAt: now,
    };
    records[idx] = updated;
    await persist(records);
    return updated;
  }

  const created: ApplicationRecord = {
    id: input.id,
    loanType: input.loanType,
    amount: input.amount,
    purpose: input.purpose,
    docsPct: input.docsPct,
    bankCount: input.bankCount,
    customerId: input.customerId ?? null,
    applicantNameZh: input.applicantNameZh ?? null,
    companyNameZh: input.companyNameZh ?? null,
    email: input.email ?? null,
    phone: input.phone ?? null,
    documents: input.documents ?? [],
    aiAnalysis: input.aiAnalysis ?? null,
    mortgageKind: input.mortgageKind ?? null,
    isShellCompany: input.isShellCompany ?? null,
    mortgageCalc: input.mortgageCalc ?? null,
    status,
    failureReason: status === "rejected" ? failureReason : null,
    createdAt: input.createdAt || now,
    updatedAt: now,
  };
  records.unshift(created);
  await persist(records);
  return created;
}

export async function attachDocumentsToApplication(
  id: string,
  docs: ApplicationDocumentRef[],
) {
  const records = await ensureLoaded();
  const idx = records.findIndex((r) => r.id === id);
  if (idx < 0) return null;
  const existing = records[idx].documents ?? [];
  const byId = new Map(existing.map((d) => [d.id, d]));
  for (const d of docs) byId.set(d.id, d);
  records[idx] = {
    ...records[idx],
    documents: [...byId.values()],
    updatedAt: new Date().toISOString(),
  };
  await persist(records);
  return records[idx];
}

export async function updateApplicationStatus(
  id: string,
  status: ClientAppStatus | string,
  failureReason?: string | null,
) {
  const records = await ensureLoaded();
  const idx = records.findIndex((r) => r.id === id);
  if (idx < 0) return null;
  const normalized = normalizeClientAppStatus(status);
  records[idx] = {
    ...records[idx],
    status: normalized,
    failureReason:
      normalized === "rejected"
        ? failureReason?.trim() ||
          records[idx].failureReason ||
          "未有提供失敗原因"
        : null,
    updatedAt: new Date().toISOString(),
  };
  await persist(records);
  return records[idx];
}

/** 刪除單一申請（唔動客戶登記） */
export async function deleteApplication(id: string) {
  const records = await ensureLoaded();
  const next = records.filter((r) => r.id !== id);
  if (next.length === records.length) return false;
  await persist(next);
  return true;
}

/** 批次刪除；ids 省略則清空全部。 */
export async function deleteApplications(ids?: string[]) {
  const records = await ensureLoaded();
  if (!ids) {
    const removedIds = records.map((r) => r.id);
    await persist([]);
    return { removed: removedIds.length, ids: removedIds };
  }
  const want = new Set(ids);
  const kept = records.filter((r) => !want.has(r.id));
  const removedIds = records.filter((r) => want.has(r.id)).map((r) => r.id);
  await persist(kept);
  return { removed: removedIds.length, ids: removedIds };
}
