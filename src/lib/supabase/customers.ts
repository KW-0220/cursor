import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  CustomerRegistrationInput,
  CustomerRegistrationRecord,
} from "@/lib/customer-registry";
import { createAdminClient } from "@/lib/supabase/admin";

export type CustomerRow = {
  id: string;
  applicant_name_zh: string;
  applicant_name_en: string;
  id_number: string;
  phone: string;
  email: string;
  title: string;
  relation: string;
  company_name_zh: string;
  company_name_en: string;
  br_number: string;
  cr_number: string;
  founded_at: string;
  company_type: string;
  industry: string;
  address: string;
  employees: number;
  website: string | null;
  contact_person: string;
  source: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export function rowToCustomer(r: CustomerRow): CustomerRegistrationRecord {
  return {
    id: r.id,
    applicantNameZh: r.applicant_name_zh,
    applicantNameEn: r.applicant_name_en,
    idNumber: r.id_number,
    phone: r.phone,
    email: r.email,
    title: r.title,
    relation: r.relation as CustomerRegistrationRecord["relation"],
    companyNameZh: r.company_name_zh,
    companyNameEn: r.company_name_en,
    brNumber: r.br_number,
    crNumber: r.cr_number,
    foundedAt: r.founded_at,
    companyType: r.company_type,
    industry: r.industry,
    address: r.address,
    employees: r.employees,
    website: r.website,
    contactPerson: r.contact_person,
    source: r.source ?? "register",
    notes: r.notes,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

export function customerToRow(
  c: Omit<CustomerRegistrationRecord, "createdAt" | "updatedAt"> & {
    createdAt?: string;
    updatedAt?: string;
  },
): Omit<CustomerRow, "created_at" | "updated_at"> & {
  created_at?: string;
  updated_at?: string;
} {
  return {
    id: c.id,
    applicant_name_zh: c.applicantNameZh,
    applicant_name_en: c.applicantNameEn,
    id_number: c.idNumber,
    phone: c.phone,
    email: c.email,
    title: c.title,
    relation: c.relation,
    company_name_zh: c.companyNameZh,
    company_name_en: c.companyNameEn,
    br_number: c.brNumber,
    cr_number: c.crNumber,
    founded_at: c.foundedAt,
    company_type: c.companyType,
    industry: c.industry,
    address: c.address,
    employees: c.employees,
    website: c.website ?? null,
    contact_person: c.contactPerson,
    source: c.source ?? "register",
    notes: c.notes ?? null,
    created_at: c.createdAt,
    updated_at: c.updatedAt,
  };
}

export async function supabaseListCustomers(client?: SupabaseClient) {
  const db = client ?? createAdminClient();
  const { data, error } = await db
    .from("customers")
    .select("*")
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return (data as CustomerRow[]).map(rowToCustomer);
}

export async function supabaseFindCustomerByEmail(
  email: string,
  client?: SupabaseClient,
) {
  const db = client ?? createAdminClient();
  const key = email.trim().toLowerCase();
  const { data, error } = await db
    .from("customers")
    .select("*")
    .ilike("email", key)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data ? rowToCustomer(data as CustomerRow) : null;
}

export async function supabaseUpsertCustomer(
  input: CustomerRegistrationInput,
  client?: SupabaseClient,
) {
  const db = client ?? createAdminClient();
  const now = new Date().toISOString();
  const emailKey = input.email.trim().toLowerCase();

  let existingId: string | null = input.id ?? null;
  if (!existingId) {
    // 先以電郵對齊（註冊 stub／完善資料同一客戶）
    const byEmail = await supabaseFindCustomerByEmail(emailKey, db);
    if (byEmail?.id) {
      existingId = byEmail.id;
    } else {
      const { data: byEmailBr } = await db
        .from("customers")
        .select("id, created_at")
        .eq("email", emailKey)
        .eq("br_number", input.brNumber)
        .maybeSingle();
      if (byEmailBr?.id) existingId = byEmailBr.id;
    }
  }

  const id =
    existingId ||
    `CUS-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`;

  let createdAt = now;
  let prevRow: CustomerRegistrationRecord | null = null;
  if (existingId) {
    const { data: prev } = await db
      .from("customers")
      .select("*")
      .eq("id", existingId)
      .maybeSingle();
    if (prev) {
      prevRow = rowToCustomer(prev as CustomerRow);
      if (prevRow.createdAt) createdAt = prevRow.createdAt;
    }
  }

  const merged: CustomerRegistrationInput = {
    ...input,
    email: emailKey,
    companyNameZh:
      isPendingCompany(input.companyNameZh) &&
      prevRow &&
      !isPendingCompany(prevRow.companyNameZh)
        ? prevRow.companyNameZh
        : input.companyNameZh,
    companyNameEn:
      isPendingCompany(input.companyNameEn) &&
      prevRow &&
      !isPendingCompany(prevRow.companyNameEn)
        ? prevRow.companyNameEn
        : input.companyNameEn,
    brNumber:
      isPendingCode(input.brNumber) &&
      prevRow &&
      !isPendingCode(prevRow.brNumber)
        ? prevRow.brNumber
        : input.brNumber,
    crNumber:
      isPendingCode(input.crNumber) &&
      prevRow &&
      !isPendingCode(prevRow.crNumber)
        ? prevRow.crNumber
        : input.crNumber,
  };

  const row = customerToRow({
    ...merged,
    id,
    email: emailKey,
    website: merged.website ?? null,
    notes: merged.notes ?? null,
    source: merged.source ?? "register",
    createdAt,
    updatedAt: now,
  });

  const { data, error } = await db
    .from("customers")
    .upsert(row, { onConflict: "id" })
    .select("*")
    .single();
  if (error) throw error;
  return rowToCustomer(data as CustomerRow);
}

function isPendingCompany(v: string | null | undefined) {
  const s = String(v ?? "").trim();
  return (
    !s ||
    s === "（註冊後待完善）" ||
    s === "(Pending)" ||
    s === "待完善"
  );
}

function isPendingCode(v: string | null | undefined) {
  const s = String(v ?? "").trim().toUpperCase();
  return !s || s === "PENDING" || s.startsWith("PENDING-");
}

export async function supabaseCustomersReady(client?: SupabaseClient) {
  const db = client ?? createAdminClient();
  const { error } = await db.from("customers").select("id").limit(1);
  return !error;
}

/** 刪除單一客戶登記列 */
export async function supabaseDeleteCustomer(
  id: string,
  client?: SupabaseClient,
) {
  const cid = id.trim();
  if (!cid) return false;
  const db = client ?? createAdminClient();
  const { data, error } = await db
    .from("customers")
    .delete()
    .eq("id", cid)
    .select("id");
  if (error) throw error;
  return (data?.length ?? 0) > 0;
}

/** 刪除全部客戶登記列（service／admin client） */
export async function supabaseClearCustomers(client?: SupabaseClient) {
  const db = client ?? createAdminClient();
  const { count, error: countErr } = await db
    .from("customers")
    .select("id", { count: "exact", head: true });
  if (countErr) throw countErr;
  const before = count ?? 0;
  if (before === 0) return 0;
  // id 永非空；neq 觸發全表 delete（secret client bypass RLS）
  const { error: delErr } = await db.from("customers").delete().neq("id", "");
  if (delErr) throw delErr;
  return before;
}
