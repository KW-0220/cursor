import "server-only";
import { promises as fs } from "fs";
import path from "path";
import { z } from "zod";
import {
  customersUseMysql,
  mysqlCountCustomers,
  mysqlGetCustomer,
  mysqlInsertCustomer,
  mysqlListCustomers,
  mysqlUpsertCustomer,
} from "@/lib/db/customers-mysql";
import { isMysqlConfigured } from "@/lib/db/mysql";

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

function seedRecords(): CustomerRegistrationRecord[] {
  const now = new Date().toISOString();
  return [
    {
      id: "CUS-2026-0001",
      applicantNameZh: "陳大文",
      applicantNameEn: "Chan Tai Man",
      idNumber: "A123456(7)",
      phone: "+852 9123 4567",
      email: "tm.chan@smartcreate.example",
      title: "董事",
      relation: "董事",
      companyNameZh: "智創科技有限公司",
      companyNameEn: "SmartCreate Technology Ltd.",
      brNumber: "12345678",
      crNumber: "7890123",
      foundedAt: "2018-03-12",
      companyType: "有限公司",
      industry: "資訊科技服務",
      address: "香港九龍觀塘成業街 27 號日昇中心 12 樓 A 室",
      employees: 28,
      website: "https://smartcreate.example",
      contactPerson: "陳大文",
      source: "seed",
      notes: "示範客戶",
      createdAt: now,
      updatedAt: now,
    },
  ];
}

function redisConfigured() {
  return Boolean(
    (process.env.UPSTASH_REDIS_REST_URL &&
      process.env.UPSTASH_REDIS_REST_TOKEN) ||
      (process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN),
  );
}

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

export function getCustomerStorageMode(): "mysql" | "redis" | "file_or_memory" {
  if (isMysqlConfigured()) return "mysql";
  if (redisConfigured()) return "redis";
  return "file_or_memory";
}

async function ensureLoaded(): Promise<CustomerRegistrationRecord[]> {
  if (memoryStore) return memoryStore;

  if (redisConfigured()) {
    const fromRedis = await redisGet(REDIS_KEY);
    if (fromRedis) {
      try {
        memoryStore = JSON.parse(fromRedis) as CustomerRegistrationRecord[];
        return memoryStore;
      } catch {
        /* fall through */
      }
    }
    memoryStore = [];
    return memoryStore;
  }

  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
    const raw = await fs.readFile(DATA_FILE, "utf8");
    const parsed = JSON.parse(raw) as CustomerRegistrationRecord[];
    memoryStore = Array.isArray(parsed) ? parsed : seedRecords();
  } catch {
    // Vercel 無碟：空庫起步（唔再每次 cold start 灌 seed，避免蓋過真實登記觀感）
    memoryStore = process.env.VERCEL ? [] : seedRecords();
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
  if (customersUseMysql()) {
    const count = await mysqlCountCustomers();
    if (count === 0 && !process.env.VERCEL) {
      for (const seed of seedRecords()) {
        await mysqlInsertCustomer(seed);
      }
    }
    return mysqlListCustomers();
  }
  const records = await ensureLoaded();
  return [...records].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function getCustomer(id: string) {
  if (customersUseMysql()) {
    return mysqlGetCustomer(id);
  }
  const records = await ensureLoaded();
  return records.find((r) => r.id === id) ?? null;
}

export async function upsertCustomer(input: CustomerRegistrationInput) {
  if (customersUseMysql()) {
    return mysqlUpsertCustomer(input);
  }
  const records = await ensureLoaded();
  const now = new Date().toISOString();

  // 以電郵 + BR 號碼視為同一客戶
  const existingIdx = records.findIndex(
    (r) =>
      (input.id && r.id === input.id) ||
      (r.email.toLowerCase() === input.email.toLowerCase() &&
        r.brNumber === input.brNumber),
  );

  if (existingIdx >= 0) {
    const updated: CustomerRegistrationRecord = {
      ...records[existingIdx],
      ...input,
      id: records[existingIdx].id,
      createdAt: records[existingIdx].createdAt,
      updatedAt: now,
    };
    records[existingIdx] = updated;
    await persist(records);
    return updated;
  }

  const created: CustomerRegistrationRecord = {
    ...input,
    id: input.id || nextId(records),
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
