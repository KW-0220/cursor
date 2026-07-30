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

export async function supabaseUpsertCustomer(
  input: CustomerRegistrationInput,
  client?: SupabaseClient,
) {
  const db = client ?? createAdminClient();
  const now = new Date().toISOString();

  let existingId: string | null = input.id ?? null;
  if (!existingId) {
    const { data: byEmailBr } = await db
      .from("customers")
      .select("id, created_at")
      .eq("email", input.email.trim().toLowerCase())
      .eq("br_number", input.brNumber)
      .maybeSingle();
    if (byEmailBr?.id) existingId = byEmailBr.id;
  }

  const id =
    existingId ||
    `CUS-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`;

  let createdAt = now;
  if (existingId) {
    const { data: prev } = await db
      .from("customers")
      .select("created_at")
      .eq("id", existingId)
      .maybeSingle();
    if (prev?.created_at) createdAt = prev.created_at;
  }

  const row = customerToRow({
    ...input,
    id,
    email: input.email.trim().toLowerCase(),
    website: input.website ?? null,
    notes: input.notes ?? null,
    source: input.source ?? "register",
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

export async function supabaseCustomersReady(client?: SupabaseClient) {
  const db = client ?? createAdminClient();
  const { error } = await db.from("customers").select("id").limit(1);
  return !error;
}
