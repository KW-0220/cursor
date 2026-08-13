import "server-only";
import { promises as fs } from "fs";
import path from "path";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  durableJsonGet,
  durableJsonSet,
  durableJsonStoreReady,
} from "@/lib/durable-json-store";
import { getSupabaseSecretKey, getSupabaseUrl } from "@/lib/supabase/env";
import { mortgageDocTitleById } from "@/lib/mortgage";

export type DocumentKind =
  | "br"
  | "audited"
  | "identity"
  | "company_other"
  | "bank"
  | "mortgage"
  | "other";

export type StoredDocument = {
  id: string;
  customerId: string | null;
  applicationId: string;
  kind: DocumentKind;
  slot: string;
  fileName: string;
  mimeType: string;
  size: number;
  /** Supabase Storage path 或 local relative path */
  storagePath: string;
  storage: "supabase" | "local";
  createdAt: string;
};

const BUCKET = "customer-documents";
const DATA_DIR = path.join(process.cwd(), "data");
const META_FILE = path.join(DATA_DIR, "documents.json");
const LOCAL_DIR = path.join(DATA_DIR, "documents");
const REDIS_KEY = "slf:documents";
const DURABLE_PATH = "documents.json";

let memoryStore: StoredDocument[] | null = null;

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

function parseList(raw: unknown): StoredDocument[] {
  if (Array.isArray(raw)) return raw as StoredDocument[];
  if (typeof raw === "string") {
    try {
      const parsed: unknown = JSON.parse(raw);
      return Array.isArray(parsed) ? (parsed as StoredDocument[]) : [];
    } catch {
      return [];
    }
  }
  return [];
}

async function ensureLoaded(): Promise<StoredDocument[]> {
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
    const raw = await fs.readFile(META_FILE, "utf8");
    memoryStore = parseList(raw);
  } catch {
    memoryStore = [];
  }
  return memoryStore;
}

async function persist(records: StoredDocument[]) {
  memoryStore = records;
  if (durableJsonStoreReady()) {
    await durableJsonSet(DURABLE_PATH, records);
  }
  if (redisConfigured()) {
    await redisSet(REDIS_KEY, JSON.stringify(records));
  }
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
    await fs.writeFile(META_FILE, JSON.stringify(records, null, 2), "utf8");
  } catch {
    /* ignore */
  }
}

function supabaseStorageReady() {
  return Boolean(getSupabaseUrl() && getSupabaseSecretKey());
}

async function uploadBytes(params: {
  storagePath: string;
  bytes: Buffer;
  mimeType: string;
}): Promise<"supabase" | "local"> {
  if (supabaseStorageReady()) {
    try {
      const db = createAdminClient();
      const { error } = await db.storage
        .from(BUCKET)
        .upload(params.storagePath, params.bytes, {
          contentType: params.mimeType || "application/octet-stream",
          upsert: true,
        });
      if (!error) return "supabase";
      console.error("[documents] supabase upload failed", error.message);
    } catch (err) {
      console.error("[documents] supabase upload error", err);
    }
  }
  await fs.mkdir(LOCAL_DIR, { recursive: true });
  const localPath = path.join(LOCAL_DIR, params.storagePath.replace(/\//g, "__"));
  await fs.writeFile(localPath, params.bytes);
  return "local";
}

export async function listDocuments(filter?: {
  customerId?: string;
  applicationId?: string;
}) {
  const all = await ensureLoaded();
  return all
    .filter((d) => {
      if (filter?.customerId && d.customerId !== filter.customerId) return false;
      if (filter?.applicationId && d.applicationId !== filter.applicationId)
        return false;
      return true;
    })
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function getDocument(id: string) {
  const all = await ensureLoaded();
  return all.find((d) => d.id === id) ?? null;
}

/** 將某申請下尚未歸戶的文件補上 customerId */
export async function linkDocumentsCustomer(
  applicationId: string,
  customerId: string,
) {
  const cid = customerId.trim();
  if (!cid) return 0;
  const all = await ensureLoaded();
  let changed = 0;
  for (let i = 0; i < all.length; i++) {
    const d = all[i]!;
    if (d.applicationId !== applicationId) continue;
    if (d.customerId === cid) continue;
    all[i] = { ...d, customerId: cid };
    changed += 1;
  }
  if (changed) await persist(all);
  return changed;
}

function buildStoragePath(
  applicationId: string,
  slot: string,
  fileName: string,
) {
  const safeName = fileName.replace(/[^\w.\-()\u4e00-\u9fff]+/g, "_");
  return `${applicationId}/${slot}-${safeName}`;
}

export async function saveDocument(input: {
  customerId?: string | null;
  applicationId: string;
  kind: DocumentKind;
  slot: string;
  fileName: string;
  mimeType: string;
  bytes: Buffer;
}) {
  const id = `DOC-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
  const storagePath = buildStoragePath(
    input.applicationId,
    input.slot,
    input.fileName,
  );
  const storage = await uploadBytes({
    storagePath,
    bytes: input.bytes,
    mimeType: input.mimeType,
  });
  const record: StoredDocument = {
    id,
    customerId: input.customerId ?? null,
    applicationId: input.applicationId,
    kind: input.kind,
    slot: input.slot,
    fileName: input.fileName,
    mimeType: input.mimeType,
    size: input.bytes.length,
    storagePath,
    storage,
    createdAt: new Date().toISOString(),
  };
  const all = await ensureLoaded();
  all.unshift(record);
  await persist(all);
  return record;
}

/** 已直傳 Storage 後，只登記 metadata */
export async function registerDocument(input: {
  customerId?: string | null;
  applicationId: string;
  kind: DocumentKind;
  slot: string;
  fileName: string;
  mimeType: string;
  size: number;
  storagePath: string;
  storage?: "supabase" | "local";
}) {
  const record: StoredDocument = {
    id: `DOC-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
    customerId: input.customerId ?? null,
    applicationId: input.applicationId,
    kind: input.kind,
    slot: input.slot,
    fileName: input.fileName,
    mimeType: input.mimeType,
    size: input.size,
    storagePath: input.storagePath,
    storage: input.storage ?? "supabase",
    createdAt: new Date().toISOString(),
  };
  const all = await ensureLoaded();
  all.unshift(record);
  await persist(all);
  return record;
}

export type SignedDocumentUpload = {
  kind: DocumentKind;
  slot: string;
  fileName: string;
  mimeType: string;
  size: number;
  storagePath: string;
  signedUrl: string;
  token: string;
};

/** 產生直傳 Supabase 的 signed upload URL（繞過 Vercel 4.5MB body 限制） */
export async function prepareSignedDocumentUploads(
  applicationId: string,
  files: Array<{
    kind: DocumentKind;
    slot: string;
    fileName: string;
    mimeType: string;
    size: number;
  }>,
): Promise<SignedDocumentUpload[]> {
  if (!supabaseStorageReady()) {
    throw new Error("文件直傳未就緒（缺少 Supabase Storage）");
  }
  const db = createAdminClient();
  const out: SignedDocumentUpload[] = [];
  for (const f of files) {
    if (f.size <= 0) continue;
    if (f.size > 15 * 1024 * 1024) {
      throw new Error(`${f.fileName} 超過 15MB`);
    }
    const storagePath = buildStoragePath(applicationId, f.slot, f.fileName);
    const { data, error } = await db.storage
      .from(BUCKET)
      .createSignedUploadUrl(storagePath, { upsert: true });
    if (error || !data?.signedUrl) {
      throw new Error(
        error?.message || `無法建立上載連結：${f.fileName}`,
      );
    }
    out.push({
      kind: f.kind,
      slot: f.slot,
      fileName: f.fileName,
      mimeType: f.mimeType || "application/octet-stream",
      size: f.size,
      storagePath: data.path || storagePath,
      signedUrl: data.signedUrl,
      token: data.token,
    });
  }
  return out;
}

export async function readDocumentBytes(
  doc: StoredDocument,
): Promise<Buffer | null> {
  if (doc.storage === "supabase" && supabaseStorageReady()) {
    try {
      const db = createAdminClient();
      const { data, error } = await db.storage
        .from(BUCKET)
        .download(doc.storagePath);
      if (error || !data) {
        console.error("[documents] download failed", error?.message);
      } else {
        const ab = await data.arrayBuffer();
        return Buffer.from(ab);
      }
    } catch (err) {
      console.error("[documents] download error", err);
    }
  }
  try {
    const localPath = path.join(
      LOCAL_DIR,
      doc.storagePath.replace(/\//g, "__"),
    );
    return await fs.readFile(localPath);
  } catch {
    return null;
  }
}

export function documentKindLabel(kind: DocumentKind | string) {
  const map: Record<string, string> = {
    br: "商業登記證 BR",
    audited: "審計報告",
    identity: "身份證明",
    company_other: "公司其他文件",
    bank: "銀行月結單",
    mortgage: "按揭文件",
    other: "其他",
  };
  return map[kind] || kind;
}

/** 優先用 slot 顯示按揭文件中文名 */
export function documentDisplayLabel(kind: string, slot?: string | null) {
  if (slot?.startsWith("mortgage:")) {
    const title = mortgageDocTitleById(slot.slice("mortgage:".length));
    if (title) return title;
  }
  return documentKindLabel(kind);
}

async function removeStorageObject(doc: StoredDocument) {
  if (doc.storage === "supabase" && supabaseStorageReady()) {
    try {
      const db = createAdminClient();
      const { error } = await db.storage.from(BUCKET).remove([doc.storagePath]);
      if (error) {
        console.error("[documents] storage remove failed", error.message);
      }
    } catch (err) {
      console.error("[documents] storage remove error", err);
    }
  }
  try {
    const localPath = path.join(
      LOCAL_DIR,
      doc.storagePath.replace(/\//g, "__"),
    );
    await fs.unlink(localPath);
  } catch {
    /* ignore missing local */
  }
}

/** 刪除某申請下所有文件 metadata（及 Storage 物件） */
export async function deleteDocumentsByApplication(applicationId: string) {
  const all = await ensureLoaded();
  const keep: StoredDocument[] = [];
  const removed: StoredDocument[] = [];
  for (const d of all) {
    if (d.applicationId === applicationId) removed.push(d);
    else keep.push(d);
  }
  if (!removed.length) return 0;
  await persist(keep);
  await Promise.all(removed.map((d) => removeStorageObject(d)));
  return removed.length;
}

/** 批次按申請編號刪文件 */
export async function deleteDocumentsByApplications(applicationIds: string[]) {
  if (!applicationIds.length) return 0;
  const want = new Set(applicationIds);
  const all = await ensureLoaded();
  const keep: StoredDocument[] = [];
  const removed: StoredDocument[] = [];
  for (const d of all) {
    if (want.has(d.applicationId)) removed.push(d);
    else keep.push(d);
  }
  if (!removed.length) return 0;
  await persist(keep);
  await Promise.all(removed.map((d) => removeStorageObject(d)));
  return removed.length;
}

/** 刪除直接掛喺客戶上的文件（含未綁申請） */
export async function deleteDocumentsByCustomer(customerId: string) {
  const cid = customerId.trim();
  if (!cid) return 0;
  const all = await ensureLoaded();
  const keep: StoredDocument[] = [];
  const removed: StoredDocument[] = [];
  for (const d of all) {
    if (d.customerId === cid) removed.push(d);
    else keep.push(d);
  }
  if (!removed.length) return 0;
  await persist(keep);
  await Promise.all(removed.map((d) => removeStorageObject(d)));
  return removed.length;
}
