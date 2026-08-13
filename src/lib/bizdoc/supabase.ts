import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import { computeCompleteness } from "@/lib/bizdoc/completeness";
import { normalizeApplication } from "@/lib/bizdoc/normalize";
import type { BizApplication } from "@/lib/bizdoc/types";

function db(): SupabaseClient {
  return createAdminClient() as unknown as SupabaseClient;
}

export type BizApplicationRow = {
  id: string;
  status: string;
  completeness: number;
  assignee: string | null;
  applicant_name: string | null;
  applicant_email: string | null;
  applicant_phone: string | null;
  applicant_whatsapp: string | null;
  applicant_relation: string | null;
  applicant_best_contact_time: string | null;
  applicant_preferred_language: string | null;
  applicant_authorized: boolean | null;
  company_name_zh: string | null;
  company_name_en: string | null;
  br_number: string | null;
  cr_number: string | null;
  company_type: string | null;
  company_founded_at: string | null;
  company_phone: string | null;
  company_email: string | null;
  company_nature: string | null;
  company_products: string | null;
  company_registered_address: string | null;
  company_business_address: string | null;
  company_monthly_turnover: string | null;
  company_yearly_turnover: string | null;
  company_employees: string | null;
  payload: BizApplication;
  submitted_at: string | null;
  created_at: string;
  updated_at: string;
};

export function appToRow(app: BizApplication): Omit<
  BizApplicationRow,
  "created_at" | "updated_at"
> {
  const completeness = computeCompleteness(app);
  return {
    id: app.id,
    status: app.status,
    completeness,
    assignee: app.assignee ?? null,
    applicant_name: app.applicant.name || null,
    applicant_email: app.applicant.email || null,
    applicant_phone: app.applicant.phone || null,
    applicant_whatsapp: app.applicant.whatsapp || null,
    applicant_relation: app.applicant.relation || null,
    applicant_best_contact_time: app.applicant.bestContactTime || null,
    applicant_preferred_language: app.applicant.preferredLanguage || null,
    applicant_authorized: app.applicant.authorized,
    company_name_zh: app.company.nameZh || null,
    company_name_en: app.company.nameEn || null,
    br_number: app.company.brNumber || null,
    cr_number: app.company.crNumber || null,
    company_type: app.company.companyType || null,
    company_founded_at: app.company.foundedAt || null,
    company_phone: app.company.phone || null,
    company_email: app.company.email || null,
    company_nature: app.company.nature || null,
    company_products: app.company.products || null,
    company_registered_address: app.company.registeredAddress || null,
    company_business_address: app.company.businessAddress || null,
    company_monthly_turnover: app.company.monthlyTurnover || null,
    company_yearly_turnover: app.company.yearlyTurnover || null,
    company_employees: app.company.employees || null,
    payload: { ...app, completeness },
    submitted_at: app.submittedAt ?? null,
  };
}

export function rowToApp(row: BizApplicationRow): BizApplication {
  const payload = row.payload;
  const base = normalizeApplication({
    ...payload,
    id: row.id,
    status: (row.status as BizApplication["status"]) || payload.status,
    completeness: row.completeness ?? payload.completeness,
    assignee: row.assignee ?? payload.assignee,
    createdAt: row.created_at || payload.createdAt,
    updatedAt: row.updated_at || payload.updatedAt,
    submittedAt: row.submitted_at ?? payload.submittedAt,
  });

  // 表格欄位優先於 payload（後台／查詢以欄位為準）
  return {
    ...base,
    applicant: {
      ...base.applicant,
      name: row.applicant_name ?? base.applicant.name,
      email: row.applicant_email ?? base.applicant.email,
      phone: row.applicant_phone ?? base.applicant.phone,
      whatsapp: row.applicant_whatsapp ?? base.applicant.whatsapp,
      relation: row.applicant_relation ?? base.applicant.relation,
      bestContactTime:
        row.applicant_best_contact_time ?? base.applicant.bestContactTime,
      preferredLanguage: (row.applicant_preferred_language as
        | "zh-Hant"
        | "en"
        | null) ?? base.applicant.preferredLanguage,
      authorized:
        row.applicant_authorized ?? base.applicant.authorized,
    },
    company: {
      ...base.company,
      nameZh: row.company_name_zh ?? base.company.nameZh,
      nameEn: row.company_name_en ?? base.company.nameEn,
      brNumber: row.br_number ?? base.company.brNumber,
      crNumber: row.cr_number ?? base.company.crNumber,
      companyType: row.company_type ?? base.company.companyType,
      foundedAt: row.company_founded_at ?? base.company.foundedAt,
      phone: row.company_phone ?? base.company.phone,
      email: row.company_email ?? base.company.email,
      nature: row.company_nature ?? base.company.nature,
      products: row.company_products ?? base.company.products,
      registeredAddress:
        row.company_registered_address ?? base.company.registeredAddress,
      businessAddress:
        row.company_business_address ?? base.company.businessAddress,
      monthlyTurnover:
        row.company_monthly_turnover ?? base.company.monthlyTurnover,
      yearlyTurnover:
        row.company_yearly_turnover ?? base.company.yearlyTurnover,
      employees: row.company_employees ?? base.company.employees,
    },
  };
}

export async function listBizApplicationsFromDb(): Promise<BizApplication[]> {
  const admin = db();
  const { data, error } = await admin
    .from("biz_applications")
    .select("*")
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return ((data || []) as BizApplicationRow[]).map(rowToApp);
}

export async function getBizApplicationFromDb(
  id: string,
): Promise<BizApplication | null> {
  const admin = db();
  const { data, error } = await admin
    .from("biz_applications")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return rowToApp(data as BizApplicationRow);
}

export async function upsertBizApplicationToDb(
  app: BizApplication,
): Promise<BizApplication> {
  const admin = db();
  const row = appToRow(app);
  const { data, error } = await admin
    .from("biz_applications")
    .upsert(
      {
        ...row,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" },
    )
    .select("*")
    .single();
  if (error) throw error;
  return rowToApp(data as BizApplicationRow);
}

export async function deleteBizApplicationFromDb(id: string): Promise<void> {
  const admin = db();
  const { error } = await admin.from("biz_applications").delete().eq("id", id);
  if (error) throw error;
}

export async function countBizApplications(): Promise<number> {
  const admin = db();
  const { count, error } = await admin
    .from("biz_applications")
    .select("id", { count: "exact", head: true });
  if (error) throw error;
  return count ?? 0;
}
