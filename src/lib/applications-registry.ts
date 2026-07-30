import "server-only";
import { promises as fs } from "fs";
import path from "path";
import {
  normalizeClientAppStatus,
  type ClientAppStatus,
} from "@/lib/application-status";

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
  loanType: "secured" | "unsecured" | null;
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
  createdAt: string;
  updatedAt: string;
};

const DATA_DIR = path.join(process.cwd(), "data");
const DATA_FILE = path.join(DATA_DIR, "applications.json");
const REDIS_KEY = "slf:applications";

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

export async function upsertApplication(
  input: Partial<ApplicationRecord> & {
    id: string;
    loanType: "secured" | "unsecured" | null;
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
    const updated: ApplicationRecord = {
      ...records[idx],
      ...input,
      status,
      failureReason:
        status === "rejected"
          ? failureReason
          : null,
      documents: input.documents ?? records[idx].documents ?? [],
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
