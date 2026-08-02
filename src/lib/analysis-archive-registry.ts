import "server-only";
import { promises as fs } from "fs";
import path from "path";
import {
  durableJsonGet,
  durableJsonSet,
  durableJsonStoreReady,
} from "@/lib/durable-json-store";

export type ArchivedAnalysisRecord = {
  id: string;
  title: string;
  fileName: string | null;
  docKind: string;
  companyName: string | null;
  /** 對應客戶登記 id（可選） */
  customerId: string | null;
  loanType: string | null;
  amountHkd: number | null;
  purpose: string | null;
  summary: string | null;
  overall: string | null;
  /** 完整分析 JSON（已裁剪過大欄位） */
  payload: Record<string, unknown>;
  notes: string | null;
  archivedBy: string | null;
  archivedAt: string;
  updatedAt: string;
};

const DATA_DIR = path.join(process.cwd(), "data");
const DATA_FILE = path.join(DATA_DIR, "analysis-archive.json");
const DURABLE_PATH = "analysis-archive.json";

let memoryStore: ArchivedAnalysisRecord[] | null = null;

function parseList(raw: unknown): ArchivedAnalysisRecord[] {
  if (Array.isArray(raw)) return raw as ArchivedAnalysisRecord[];
  if (typeof raw === "string") {
    try {
      const parsed: unknown = JSON.parse(raw);
      return Array.isArray(parsed) ? (parsed as ArchivedAnalysisRecord[]) : [];
    } catch {
      return [];
    }
  }
  return [];
}

async function ensureLoaded(): Promise<ArchivedAnalysisRecord[]> {
  if (durableJsonStoreReady()) {
    const fromDurable = await durableJsonGet<unknown>(DURABLE_PATH);
    if (fromDurable != null) {
      memoryStore = parseList(fromDurable);
      return memoryStore;
    }
  }
  if (memoryStore) return memoryStore;
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
    const raw = await fs.readFile(DATA_FILE, "utf8");
    memoryStore = parseList(raw);
  } catch {
    memoryStore = [];
  }
  return memoryStore;
}

async function persist(records: ArchivedAnalysisRecord[]) {
  memoryStore = records;
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

/** 裁剪過大 preview，避免 archive JSON 爆 */
export function sanitizeAnalysisPayload(
  raw: Record<string, unknown>,
): Record<string, unknown> {
  const copy: Record<string, unknown> = { ...raw };
  if (typeof copy.textPreview === "string" && copy.textPreview.length > 2000) {
    copy.textPreview = `${copy.textPreview.slice(0, 2000)}…`;
  }
  if (typeof copy.text === "string" && copy.text.length > 2000) {
    copy.text = `${(copy.text as string).slice(0, 2000)}…`;
  }
  return copy;
}

export async function listArchivedAnalyses() {
  const records = await ensureLoaded();
  return [...records].sort((a, b) => b.archivedAt.localeCompare(a.archivedAt));
}

export async function getArchivedAnalysis(id: string) {
  const records = await ensureLoaded();
  return records.find((r) => r.id === id) ?? null;
}

export async function archiveAnalysis(
  input: Omit<ArchivedAnalysisRecord, "id" | "archivedAt" | "updatedAt"> & {
    id?: string;
  },
) {
  const records = await ensureLoaded();
  const now = new Date().toISOString();
  const id =
    input.id?.trim() ||
    `ARC-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
  const record: ArchivedAnalysisRecord = {
    id,
    title: input.title.trim() || input.fileName || "未命名分析",
    fileName: input.fileName,
    docKind: input.docKind || "auto",
    companyName: input.companyName,
    customerId: input.customerId ?? null,
    loanType: input.loanType,
    amountHkd: input.amountHkd,
    purpose: input.purpose,
    summary: input.summary,
    overall: input.overall,
    payload: sanitizeAnalysisPayload(input.payload),
    notes: input.notes,
    archivedBy: input.archivedBy,
    archivedAt: now,
    updatedAt: now,
  };
  const idx = records.findIndex((r) => r.id === id);
  if (idx >= 0) {
    records[idx] = {
      ...records[idx],
      ...record,
      archivedAt: records[idx].archivedAt,
      updatedAt: now,
    };
  } else {
    records.unshift(record);
  }
  // 上限 500 筆，避免 storage 過大
  if (records.length > 500) records.length = 500;
  await persist(records);
  return idx >= 0 ? records[idx]! : record;
}

export async function updateArchivedAnalysis(
  id: string,
  patch: Partial<
    Pick<ArchivedAnalysisRecord, "title" | "notes" | "customerId" | "companyName">
  >,
) {
  const records = await ensureLoaded();
  const idx = records.findIndex((r) => r.id === id);
  if (idx < 0) return null;
  records[idx] = {
    ...records[idx],
    title: patch.title?.trim() || records[idx].title,
    notes:
      patch.notes !== undefined
        ? patch.notes?.trim() || null
        : records[idx].notes,
    customerId:
      patch.customerId !== undefined
        ? patch.customerId?.trim() || null
        : records[idx].customerId ?? null,
    companyName:
      patch.companyName !== undefined
        ? patch.companyName?.trim() || null
        : records[idx].companyName,
    updatedAt: new Date().toISOString(),
  };
  await persist(records);
  return records[idx];
}

/** 將歸檔分析綁定到客戶（上載／分析後自動歸戶） */
export async function linkArchiveToCustomer(
  archiveId: string,
  customerId: string,
) {
  return updateArchivedAnalysis(archiveId, { customerId });
}

export async function deleteArchivedAnalysis(id: string) {
  const records = await ensureLoaded();
  const next = records.filter((r) => r.id !== id);
  if (next.length === records.length) return false;
  await persist(next);
  return true;
}
