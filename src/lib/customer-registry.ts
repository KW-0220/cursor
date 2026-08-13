import "server-only";
import { promises as fs } from "fs";
import path from "path";
import { z } from "zod";
import {
  customersUseMysql,
  mysqlClearCustomers,
  mysqlDeleteCustomer,
  mysqlGetCustomer,
  mysqlListCustomers,
  mysqlUpsertCustomer,
} from "@/lib/db/customers-mysql";
import { isMysqlConfigured } from "@/lib/db/mysql";
import {
  supabaseClearCustomers,
  supabaseCustomersReady,
  supabaseDeleteCustomer,
  supabaseFindCustomerByEmail,
  supabaseListCustomers,
  supabaseUpsertCustomer,
} from "@/lib/supabase/customers";
import { getSupabaseSecretKey, getSupabaseUrl } from "@/lib/supabase/env";

export const CustomerRegistrationSchema = z.object({
  id: z.string().optional(),
  // 申請人
  applicantNameZh: z.string().min(1),
  applicantNameEn: z.string().min(1),
  idNumber: z.string().min(1),
  phone: z.string().min(1),
  email: z.string().email().or(z.string().min(3)),
  title: z.string().min(1),
  relation: z.enum(["董事", "股東", "獲授權代表", "其他"]),
  // 公司
  companyNameZh: z.string().min(1),
  companyNameEn: z.string().min(1),
  brNumber: z.string().min(1),
  crNumber: z.string().min(1),
  foundedAt: z.string().min(1),
  companyType: z.string().min(1),
  industry: z.string().min(1),
  address: z.string().min(1),
  employees: z.coerce.number().int().nonnegative(),
  website: z.string().optional().nullable(),
  contactPerson: z.string().min(1),
  // meta
  source: z.string().optional(),
  notes: z.string().optional().nullable(),
});

export type CustomerRegistrationInput = z.infer<
  typeof CustomerRegistrationSchema
>;

export interface CustomerRegistrationRecord
  extends CustomerRegistrationInput {
  id: string;
  createdAt: string;
  updatedAt: string;
}

const DATA_DIR = path.join(process.cwd(), "data");
const DATA_FILE = path.join(DATA_DIR, "customers.json");
const REDIS_KEY = "slf:customers";

/** 進程內 fallback（Vercel 無持久碟時仍可用於同一實例） */
let memoryStore: CustomerRegistrationRecord[] | null = null;

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

export function getCustomerStorageMode():
  | "supabase"
  | "mysql"
  | "redis"
  | "file_or_memory" {
  if (getSupabaseUrl() && getSupabaseSecretKey()) return "supabase";
  if (isMysqlConfigured()) return "mysql";
  if (redisConfigured()) return "redis";
  return "file_or_memory";
}

export function customersPreferSupabase() {
  return getCustomerStorageMode() === "supabase";
}

function parseCustomerList(raw: unknown): CustomerRegistrationRecord[] {
  if (Array.isArray(raw)) return raw as CustomerRegistrationRecord[];
  if (typeof raw === "string") {
    try {
      const parsed: unknown = JSON.parse(raw);
      return Array.isArray(parsed)
        ? (parsed as CustomerRegistrationRecord[])
        : [];
    } catch {
      return [];
    }
  }
  return [];
}

async function ensureLoaded(): Promise<CustomerRegistrationRecord[]> {
  if (memoryStore) return memoryStore;

  if (redisConfigured()) {
    try {
      const fromRedis = await redisGet(REDIS_KEY);
      if (fromRedis != null && fromRedis !== "") {
        memoryStore = parseCustomerList(fromRedis);
        return memoryStore;
      }
    } catch {
      /* fall through */
    }
    memoryStore = [];
    return memoryStore;
  }

  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
    const raw = await fs.readFile(DATA_FILE, "utf8");
    memoryStore = parseCustomerList(raw);
  } catch {
    // 空庫起步；不再灌示範客戶
    memoryStore = [];
    try {
      await fs.mkdir(DATA_DIR, { recursive: true });
      await fs.writeFile(
        DATA_FILE,
        JSON.stringify(memoryStore, null, 2),
        "utf8",
      );
    } catch {
      // ignore
    }
  }
  return memoryStore;
}

async function persist(records: CustomerRegistrationRecord[]) {
  memoryStore = records;
  if (redisConfigured()) {
    await redisSet(REDIS_KEY, JSON.stringify(records));
  }
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
    await fs.writeFile(DATA_FILE, JSON.stringify(records, null, 2), "utf8");
  } catch {
    // ignore disk failures
  }
}

function nextId(records: CustomerRegistrationRecord[]) {
  const n = records.length + 1;
  return `CUS-${new Date().getFullYear()}-${String(n).padStart(4, "0")}`;
}

export async function listCustomers() {
  if (customersPreferSupabase()) {
    try {
      if (await supabaseCustomersReady()) {
        return supabaseListCustomers();
      }
    } catch (err) {
      console.error("[customers] supabase list failed, fallback", err);
    }
  }
  if (customersUseMysql()) {
    return mysqlListCustomers();
  }
  const records = await ensureLoaded();
  return [...records].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function getCustomer(id: string) {
  if (customersPreferSupabase()) {
    try {
      const all = await supabaseListCustomers();
      return all.find((r) => r.id === id) ?? null;
    } catch {
      /* fall through */
    }
  }
  if (customersUseMysql()) {
    return mysqlGetCustomer(id);
  }
  const records = await ensureLoaded();
  return records.find((r) => r.id === id) ?? null;
}

export async function getCustomerByEmail(email: string) {
  const key = email.trim().toLowerCase();
  if (!key) return null;
  if (customersPreferSupabase()) {
    try {
      if (await supabaseCustomersReady()) {
        return supabaseFindCustomerByEmail(key);
      }
    } catch (err) {
      console.error("[customers] supabase findByEmail failed", err);
    }
  }
  const all = await listCustomers();
  return (
    all.find((r) => r.email.trim().toLowerCase() === key) ?? null
  );
}

export type ClearCustomersResult = {
  supabase: number;
  mysql: number;
  redisOrFile: number;
  storage: ReturnType<typeof getCustomerStorageMode>;
};

/** 清空所有客戶登記（Supabase + MySQL + Redis／檔案／記憶體） */
export async function clearAllCustomers(): Promise<ClearCustomersResult> {
  let supabase = 0;
  let mysql = 0;

  if (getSupabaseUrl() && getSupabaseSecretKey()) {
    try {
      supabase = await supabaseClearCustomers();
    } catch (err) {
      console.error("[customers] supabase clear failed", err);
    }
  }

  if (isMysqlConfigured()) {
    try {
      mysql = await mysqlClearCustomers();
    } catch (err) {
      console.error("[customers] mysql clear failed", err);
    }
  }

  let redisOrFile = 0;
  try {
    const existing = await ensureLoaded();
    redisOrFile = existing.length;
  } catch {
    redisOrFile = 0;
  }
  await persist([]);
  return {
    supabase,
    mysql,
    redisOrFile,
    storage: getCustomerStorageMode(),
  };
}

export type DeleteCustomerResult = {
  ok: boolean;
  id: string;
  email: string | null;
  supabase: boolean;
  mysql: boolean;
  redisOrFile: boolean;
};

/** 刪除單一客戶（各後端各自嘗試；至少一處成功即 ok） */
export async function deleteCustomer(
  id: string,
): Promise<DeleteCustomerResult> {
  const cid = id.trim();
  const empty: DeleteCustomerResult = {
    ok: false,
    id: cid,
    email: null,
    supabase: false,
    mysql: false,
    redisOrFile: false,
  };
  if (!cid) return empty;

  let email: string | null = null;
  try {
    const existing = await getCustomer(cid);
    email = existing?.email ?? null;
  } catch {
    /* ignore */
  }

  let supabase = false;
  if (getSupabaseUrl() && getSupabaseSecretKey()) {
    try {
      supabase = await supabaseDeleteCustomer(cid);
    } catch (err) {
      console.error("[customers] supabase delete failed", err);
    }
  }

  let mysql = false;
  if (isMysqlConfigured()) {
    try {
      mysql = await mysqlDeleteCustomer(cid);
    } catch (err) {
      console.error("[customers] mysql delete failed", err);
    }
  }

  let redisOrFile = false;
  try {
    const records = await ensureLoaded();
    const next = records.filter((r) => r.id !== cid);
    if (next.length !== records.length) {
      await persist(next);
      redisOrFile = true;
    }
  } catch (err) {
    console.error("[customers] file/redis delete failed", err);
  }

  return {
    ok: supabase || mysql || redisOrFile,
    id: cid,
    email,
    supabase,
    mysql,
    redisOrFile,
  };
}

export async function upsertCustomer(input: CustomerRegistrationInput) {
  if (customersPreferSupabase()) {
    try {
      return await supabaseUpsertCustomer(input);
    } catch (err) {
      console.error("[customers] supabase upsert failed, fallback", err);
    }
  }
  if (customersUseMysql()) {
    return mysqlUpsertCustomer(input);
  }
  const records = await ensureLoaded();
  const now = new Date().toISOString();
  const emailKey = input.email.trim().toLowerCase();

  // 以電郵為主鍵對齊（註冊 stub → 完善公司資料唔會重複建檔）
  const existingIdx = records.findIndex(
    (r) =>
      (input.id && r.id === input.id) ||
      r.email.toLowerCase() === emailKey ||
      (r.email.toLowerCase() === emailKey &&
        r.brNumber === input.brNumber),
  );

  if (existingIdx >= 0) {
    const prev = records[existingIdx]!;
    const updated: CustomerRegistrationRecord = {
      ...prev,
      ...input,
      id: prev.id,
      email: emailKey,
      // 保留已完善公司欄，避免 stub 覆寫正式資料（僅當新值仍係 pending）
      companyNameZh:
        isPendingCompanyValue(input.companyNameZh) &&
        !isPendingCompanyValue(prev.companyNameZh)
          ? prev.companyNameZh
          : input.companyNameZh,
      companyNameEn:
        isPendingCompanyValue(input.companyNameEn) &&
        !isPendingCompanyValue(prev.companyNameEn)
          ? prev.companyNameEn
          : input.companyNameEn,
      brNumber:
        isPendingBr(input.brNumber) && !isPendingBr(prev.brNumber)
          ? prev.brNumber
          : input.brNumber,
      crNumber:
        isPendingBr(input.crNumber) && !isPendingBr(prev.crNumber)
          ? prev.crNumber
          : input.crNumber,
      createdAt: prev.createdAt,
      updatedAt: now,
    };
    records[existingIdx] = updated;
    await persist(records);
    return updated;
  }

  const created: CustomerRegistrationRecord = {
    ...input,
    id: input.id || nextId(records),
    email: emailKey,
    website: input.website ?? null,
    notes: input.notes ?? null,
    source: input.source ?? "register",
    createdAt: now,
    updatedAt: now,
  };
  records.push(created);
  await persist(records);
  return created;
}

function isPendingCompanyValue(v: string | null | undefined) {
  const s = String(v ?? "").trim();
  return (
    !s ||
    s === "（註冊後待完善）" ||
    s === "(Pending)" ||
    s === "待完善"
  );
}

function isPendingBr(v: string | null | undefined) {
  const s = String(v ?? "").trim().toUpperCase();
  return !s || s === "PENDING" || s.startsWith("PENDING-");
}

/**
 * 註冊帳號即寫入客戶登記（stub）；完成公司資料時會以電郵覆寫完善。
 * 確保後台 /admin/customers 可見所有已註冊申請人。
 */
export async function ensureCustomerFromAuthUser(input: {
  email: string;
  nameZh?: string | null;
  phone?: string | null;
  idNumber?: string | null;
  source?: string;
}): Promise<CustomerRegistrationRecord> {
  const email = input.email.trim().toLowerCase();
  const existing = await getCustomerByEmail(email);
  const name = (input.nameZh || "").trim() || email.split("@")[0] || "申請人";
  const phone = (input.phone || "").trim() || "待完善";
  const idNumber = (input.idNumber || "").trim() || "PENDING";

  if (existing) {
    // 只補空欄，唔覆蓋已完善公司資料
    return upsertCustomer({
      id: existing.id,
      applicantNameZh: existing.applicantNameZh || name,
      applicantNameEn: existing.applicantNameEn || name,
      idNumber:
        isPendingBr(existing.idNumber) && idNumber !== "PENDING"
          ? idNumber
          : existing.idNumber,
      phone:
        existing.phone === "待完善" && phone !== "待完善"
          ? phone
          : existing.phone,
      email,
      title: existing.title || "待完善",
      relation: existing.relation || "其他",
      companyNameZh: existing.companyNameZh,
      companyNameEn: existing.companyNameEn,
      brNumber: existing.brNumber,
      crNumber: existing.crNumber,
      foundedAt: existing.foundedAt,
      companyType: existing.companyType,
      industry: existing.industry,
      address: existing.address,
      employees: existing.employees,
      website: existing.website,
      contactPerson: existing.contactPerson || name,
      source: existing.source || input.source || "auth_register",
      notes: existing.notes,
    });
  }

  return upsertCustomer({
    applicantNameZh: name,
    applicantNameEn: name,
    idNumber,
    phone,
    email,
    title: "待完善",
    relation: "其他",
    companyNameZh: "（註冊後待完善）",
    companyNameEn: "(Pending)",
    brNumber: "PENDING",
    crNumber: "PENDING",
    foundedAt: new Date().toISOString().slice(0, 10),
    companyType: "待完善",
    industry: "待完善",
    address: "待完善",
    employees: 0,
    website: null,
    contactPerson: name,
    source: input.source || "auth_register",
    notes: "由帳戶註冊自動建立；待完善公司資料",
  });
}

/** 將尚未入客戶表嘅申請人帳戶同步到客戶登記 */
export async function syncApplicantUsersToCustomers(
  applicants: Array<{
    email: string;
    nameZh?: string | null;
    phone?: string | null;
    idNumber?: string | null;
  }>,
): Promise<{ created: number; updated: number }> {
  let created = 0;
  let updated = 0;
  for (const u of applicants) {
    if (!u.email?.trim()) continue;
    const before = await getCustomerByEmail(u.email);
    await ensureCustomerFromAuthUser({
      email: u.email,
      nameZh: u.nameZh,
      phone: u.phone,
      idNumber: u.idNumber,
      source: "auth_sync",
    });
    if (before) updated += 1;
    else created += 1;
  }
  return { created, updated };
}

export const CUSTOMER_EXCEL_COLUMNS: {
  key: keyof CustomerRegistrationRecord;
  header: string;
}[] = [
  { key: "id", header: "客戶編號" },
  { key: "createdAt", header: "登記時間" },
  { key: "updatedAt", header: "更新時間" },
  { key: "applicantNameZh", header: "申請人中文名" },
  { key: "applicantNameEn", header: "申請人英文名" },
  { key: "idNumber", header: "身份證／護照" },
  { key: "phone", header: "電話" },
  { key: "email", header: "電郵" },
  { key: "title", header: "職位" },
  { key: "relation", header: "與公司關係" },
  { key: "companyNameZh", header: "公司中文名" },
  { key: "companyNameEn", header: "公司英文名" },
  { key: "brNumber", header: "商業登記號碼" },
  { key: "crNumber", header: "公司註冊編號" },
  { key: "foundedAt", header: "成立日期" },
  { key: "companyType", header: "公司類型" },
  { key: "industry", header: "業務性質" },
  { key: "address", header: "營運地址" },
  { key: "employees", header: "員工人數" },
  { key: "website", header: "網站" },
  { key: "contactPerson", header: "主要聯絡人" },
  { key: "source", header: "來源" },
  { key: "notes", header: "備註" },
];

export async function buildCustomersExcelBuffer() {
  const XLSX = await import("xlsx");
  const records = await listCustomers();
  const rows = records.map((r) => {
    const row: Record<string, string | number> = {};
    for (const col of CUSTOMER_EXCEL_COLUMNS) {
      const v = r[col.key];
      row[col.header] = v == null ? "" : (v as string | number);
    }
    return row;
  });

  const sheet = XLSX.utils.json_to_sheet(rows, {
    header: CUSTOMER_EXCEL_COLUMNS.map((c) => c.header),
  });
  sheet["!cols"] = CUSTOMER_EXCEL_COLUMNS.map((c) => ({
    wch: Math.max(12, c.header.length + 4),
  }));

  const book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(book, sheet, "客戶登記");
  const buf = XLSX.write(book, { type: "buffer", bookType: "xlsx" }) as Buffer;
  return buf;
}
