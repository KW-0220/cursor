import "server-only";
import { promises as fs } from "fs";
import path from "path";
import {
  durableJsonGet,
  durableJsonSet,
  durableJsonStoreReady,
} from "@/lib/durable-json-store";
import { supabasePgCoreReady } from "@/lib/supabase/pg-core";
import {
  supabaseReplaceSupplements,
  supabaseListSupplements,
  supabaseSupplementsReady,
} from "@/lib/supabase/supplements";

export type SupplementNotifyChannel = "app_push" | "email";

export type SupplementRecord = {
  id: string;
  applicationId: string;
  documentType: string;
  /** 常用原因模板 */
  reasonTemplate: string;
  reason: string;
  detail: string;
  dueDate: string;
  required: boolean;
  needOcr: boolean;
  /** 通知方式（已移除 SMS） */
  notifyChannels: SupplementNotifyChannel[];
  /** 收件電郵（有勾 email 時） */
  toEmail: string | null;
  customerId: string | null;
  companyNameZh: string | null;
  applicantNameZh: string | null;
  /** 實際寄出的電郵主旨（客製化） */
  emailSubject: string | null;
  status: "open" | "fulfilled" | "cancelled";
  emailStatus: "skipped" | "sent" | "failed" | "pending";
  emailId: string | null;
  emailError: string | null;
  pushStatus: "skipped" | "queued" | "failed";
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
};

const DATA_DIR = path.join(process.cwd(), "data");
const DATA_FILE = path.join(DATA_DIR, "supplements.json");
const DURABLE_PATH = "supplements.json";

let memoryStore: SupplementRecord[] | null = null;

function parseList(raw: unknown): SupplementRecord[] {
  if (Array.isArray(raw)) return raw as SupplementRecord[];
  if (typeof raw === "string") {
    try {
      const parsed: unknown = JSON.parse(raw);
      return Array.isArray(parsed) ? (parsed as SupplementRecord[]) : [];
    } catch {
      return [];
    }
  }
  return [];
}

async function loadLegacySupplements(): Promise<SupplementRecord[]> {
  if (durableJsonStoreReady()) {
    const fromDurable = await durableJsonGet<unknown>(DURABLE_PATH);
    if (fromDurable != null) return parseList(fromDurable);
  }
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
    const raw = await fs.readFile(DATA_FILE, "utf8");
    return parseList(raw);
  } catch {
    return [];
  }
}

async function ensureLoaded(): Promise<SupplementRecord[]> {
  if (supabasePgCoreReady()) {
    try {
      if (await supabaseSupplementsReady()) {
        const fromPg = await supabaseListSupplements();
        if (fromPg.length > 0) {
          memoryStore = fromPg;
          return memoryStore;
        }
        const legacy = await loadLegacySupplements();
        if (legacy.length > 0) {
          await supabaseReplaceSupplements(legacy);
          memoryStore = legacy;
          return memoryStore;
        }
        memoryStore = [];
        return memoryStore;
      }
    } catch (err) {
      console.error("[supplements] supabase load failed, fallback", err);
    }
  }
  if (durableJsonStoreReady()) {
    const fromDurable = await durableJsonGet<unknown>(DURABLE_PATH);
    if (fromDurable != null) {
      memoryStore = parseList(fromDurable);
      return memoryStore;
    }
  }
  if (memoryStore) return memoryStore;
  memoryStore = await loadLegacySupplements();
  return memoryStore;
}

async function persist(records: SupplementRecord[]) {
  memoryStore = records;
  if (supabasePgCoreReady()) {
    try {
      await supabaseReplaceSupplements(records);
    } catch (err) {
      console.error("[supplements] supabase persist failed", err);
    }
  }
  if (durableJsonStoreReady()) {
    await durableJsonSet(DURABLE_PATH, records);
  }
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
    await fs.writeFile(DATA_FILE, JSON.stringify(records, null, 2), "utf8");
  } catch {
    /* ignore */
  }
}

function newId() {
  return `SUP-${Date.now().toString(36).toUpperCase()}-${Math.random()
    .toString(36)
    .slice(2, 6)
    .toUpperCase()}`;
}

export async function listSupplements(opts?: {
  status?: SupplementRecord["status"];
}) {
  const all = await ensureLoaded();
  const sorted = [...all].sort((a, b) =>
    b.createdAt.localeCompare(a.createdAt),
  );
  if (!opts?.status) return sorted;
  return sorted.filter((s) => s.status === opts.status);
}

export async function createSupplement(
  input: Omit<
    SupplementRecord,
    "id" | "createdAt" | "updatedAt" | "status"
  > & { status?: SupplementRecord["status"] },
) {
  const records = await ensureLoaded();
  const now = new Date().toISOString();
  const record: SupplementRecord = {
    ...input,
    id: newId(),
    status: input.status ?? "open",
    createdAt: now,
    updatedAt: now,
  };
  records.unshift(record);
  await persist(records);
  return record;
}

export async function updateSupplement(
  id: string,
  patch: Partial<SupplementRecord>,
) {
  const records = await ensureLoaded();
  const idx = records.findIndex((r) => r.id === id);
  if (idx < 0) return null;
  records[idx] = {
    ...records[idx]!,
    ...patch,
    id: records[idx]!.id,
    updatedAt: new Date().toISOString(),
  };
  await persist(records);
  return records[idx]!;
}
