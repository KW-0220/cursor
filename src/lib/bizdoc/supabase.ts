import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import { computeCompleteness } from "@/lib/bizdoc/completeness";
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
  company_name_zh: string | null;
  company_name_en: string | null;
  br_number: string | null;
  cr_number: string | null;
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
    company_name_zh: app.company.nameZh || null,
    company_name_en: app.company.nameEn || null,
    br_number: app.company.brNumber || null,
    cr_number: app.company.crNumber || null,
    payload: { ...app, completeness },
    submitted_at: app.submittedAt ?? null,
  };
}

export function rowToApp(row: BizApplicationRow): BizApplication {
  const payload = row.payload;
  return {
    ...payload,
    id: row.id,
    status: (row.status as BizApplication["status"]) || payload.status,
    completeness: row.completeness ?? payload.completeness,
    assignee: row.assignee ?? payload.assignee,
    createdAt: row.created_at || payload.createdAt,
    updatedAt: row.updated_at || payload.updatedAt,
    submittedAt: row.submitted_at ?? payload.submittedAt,
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
