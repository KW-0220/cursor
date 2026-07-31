import "server-only";
import type { RowDataPacket } from "mysql2";
import {
  isMysqlConfigured,
  mysqlExecute,
  mysqlQuery,
} from "@/lib/db/mysql";
import type {
  CustomerRegistrationInput,
  CustomerRegistrationRecord,
} from "@/lib/customer-registry";

type CustomerRow = RowDataPacket & {
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
  created_at: Date | string;
  updated_at: Date | string;
};

function toIso(v: Date | string): string {
  if (v instanceof Date) return v.toISOString();
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? String(v) : d.toISOString();
}

function rowToCustomer(r: CustomerRow): CustomerRegistrationRecord {
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
    employees: Number(r.employees) || 0,
    website: r.website,
    contactPerson: r.contact_person,
    source: r.source ?? undefined,
    notes: r.notes,
    createdAt: toIso(r.created_at),
    updatedAt: toIso(r.updated_at),
  };
}

export function customersUseMysql() {
  return isMysqlConfigured();
}

export async function mysqlListCustomers(): Promise<
  CustomerRegistrationRecord[]
> {
  const rows = await mysqlQuery<CustomerRow[]>(
    `SELECT * FROM customers ORDER BY updated_at DESC`,
  );
  return rows.map(rowToCustomer);
}

export async function mysqlGetCustomer(
  id: string,
): Promise<CustomerRegistrationRecord | null> {
  const rows = await mysqlQuery<CustomerRow[]>(
    `SELECT * FROM customers WHERE id = ? LIMIT 1`,
    [id],
  );
  return rows[0] ? rowToCustomer(rows[0]) : null;
}

export async function mysqlFindCustomerByEmailBr(
  email: string,
  brNumber: string,
): Promise<CustomerRegistrationRecord | null> {
  const rows = await mysqlQuery<CustomerRow[]>(
    `SELECT * FROM customers WHERE email = ? AND br_number = ? LIMIT 1`,
    [email.trim().toLowerCase(), brNumber],
  );
  return rows[0] ? rowToCustomer(rows[0]) : null;
}

export async function mysqlCountCustomers(): Promise<number> {
  const rows = await mysqlQuery<(RowDataPacket & { c: number })[]>(
    `SELECT COUNT(*) AS c FROM customers`,
  );
  return Number(rows[0]?.c ?? 0);
}

function nextCustomerId(count: number) {
  return `CUS-${new Date().getFullYear()}-${String(count + 1).padStart(4, "0")}`;
}

export async function mysqlUpsertCustomer(
  input: CustomerRegistrationInput,
): Promise<CustomerRegistrationRecord> {
  const now = new Date().toISOString();
  const email = input.email.trim();
  const existingById = input.id ? await mysqlGetCustomer(input.id) : null;
  const existing =
    existingById ||
    (await mysqlFindCustomerByEmailBr(email, input.brNumber));

  if (existing) {
    const updated: CustomerRegistrationRecord = {
      ...existing,
      ...input,
      id: existing.id,
      email,
      website: input.website ?? null,
      notes: input.notes ?? null,
      source: input.source ?? existing.source ?? "register",
      createdAt: existing.createdAt,
      updatedAt: now,
    };
    await mysqlExecute(
      `UPDATE customers SET
        applicant_name_zh = ?, applicant_name_en = ?, id_number = ?,
        phone = ?, email = ?, title = ?, relation = ?,
        company_name_zh = ?, company_name_en = ?, br_number = ?, cr_number = ?,
        founded_at = ?, company_type = ?, industry = ?, address = ?,
        employees = ?, website = ?, contact_person = ?, source = ?, notes = ?,
        updated_at = ?
       WHERE id = ?`,
      [
        updated.applicantNameZh,
        updated.applicantNameEn,
        updated.idNumber,
        updated.phone,
        updated.email.toLowerCase(),
        updated.title,
        updated.relation,
        updated.companyNameZh,
        updated.companyNameEn,
        updated.brNumber,
        updated.crNumber,
        updated.foundedAt,
        updated.companyType,
        updated.industry,
        updated.address,
        updated.employees,
        updated.website ?? null,
        updated.contactPerson,
        updated.source ?? null,
        updated.notes ?? null,
        new Date(updated.updatedAt),
        updated.id,
      ],
    );
    return updated;
  }

  const count = await mysqlCountCustomers();
  const created: CustomerRegistrationRecord = {
    ...input,
    id: input.id || nextCustomerId(count),
    email,
    website: input.website ?? null,
    notes: input.notes ?? null,
    source: input.source ?? "register",
    createdAt: now,
    updatedAt: now,
  };

  await mysqlExecute(
    `INSERT INTO customers
      (id, applicant_name_zh, applicant_name_en, id_number, phone, email,
       title, relation, company_name_zh, company_name_en, br_number, cr_number,
       founded_at, company_type, industry, address, employees, website,
       contact_person, source, notes, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      created.id,
      created.applicantNameZh,
      created.applicantNameEn,
      created.idNumber,
      created.phone,
      created.email.toLowerCase(),
      created.title,
      created.relation,
      created.companyNameZh,
      created.companyNameEn,
      created.brNumber,
      created.crNumber,
      created.foundedAt,
      created.companyType,
      created.industry,
      created.address,
      created.employees,
      created.website ?? null,
      created.contactPerson,
      created.source ?? null,
      created.notes ?? null,
      new Date(created.createdAt),
      new Date(created.updatedAt),
    ],
  );
  return created;
}

export async function mysqlClearCustomers(): Promise<number> {
  const result = await mysqlExecute(`DELETE FROM customers`);
  return Number(result.affectedRows) || 0;
}

export async function mysqlDeleteCustomer(id: string): Promise<boolean> {
  const cid = id.trim();
  if (!cid) return false;
  const result = await mysqlExecute(`DELETE FROM customers WHERE id = ?`, [
    cid,
  ]);
  return (Number(result.affectedRows) || 0) > 0;
}

export async function mysqlInsertCustomer(
  record: CustomerRegistrationRecord,
): Promise<void> {
  await mysqlExecute(
    `INSERT INTO customers
      (id, applicant_name_zh, applicant_name_en, id_number, phone, email,
       title, relation, company_name_zh, company_name_en, br_number, cr_number,
       founded_at, company_type, industry, address, employees, website,
       contact_person, source, notes, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE id = id`,
    [
      record.id,
      record.applicantNameZh,
      record.applicantNameEn,
      record.idNumber,
      record.phone,
      record.email.toLowerCase(),
      record.title,
      record.relation,
      record.companyNameZh,
      record.companyNameEn,
      record.brNumber,
      record.crNumber,
      record.foundedAt,
      record.companyType,
      record.industry,
      record.address,
      record.employees,
      record.website ?? null,
      record.contactPerson,
      record.source ?? null,
      record.notes ?? null,
      new Date(record.createdAt),
      new Date(record.updatedAt),
    ],
  );
}
