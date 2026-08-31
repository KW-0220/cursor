import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  ApplicationDocumentRef,
  ApplicationRecord,
} from "@/lib/applications-registry";
import type { ApplicationAiAnalysis } from "@/lib/ai-application-decision";
import type { ClientAppStatus } from "@/lib/application-status";
import { createAdminClient } from "@/lib/supabase/admin";
import { supabasePgCoreReady } from "@/lib/supabase/pg-core";

export type SlfApplicationRow = {
  id: string;
  loan_type: string | null;
  amount: number;
  purpose: string;
  status: string;
  failure_reason: string | null;
  docs_pct: number | null;
  bank_count: number | null;
  customer_id: string | null;
  applicant_name_zh: string | null;
  company_name_zh: string | null;
  email: string | null;
  phone: string | null;
  documents: ApplicationDocumentRef[] | null;
  ai_analysis: ApplicationAiAnalysis | null;
  mortgage_kind: string | null;
  is_shell_company: boolean | null;
  mortgage_calc: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
};

export function rowToApplication(r: SlfApplicationRow): ApplicationRecord {
  return {
    id: r.id,
    loanType: (r.loan_type as ApplicationRecord["loanType"]) ?? null,
    amount: Number(r.amount) || 0,
    purpose: r.purpose || "",
    status: (r.status as ClientAppStatus) || "under_review",
    failureReason: r.failure_reason,
    docsPct: r.docs_pct == null ? undefined : Number(r.docs_pct),
    bankCount: r.bank_count == null ? undefined : Number(r.bank_count),
    customerId: r.customer_id,
    applicantNameZh: r.applicant_name_zh,
    companyNameZh: r.company_name_zh,
    email: r.email,
    phone: r.phone,
    documents: Array.isArray(r.documents) ? r.documents : [],
    aiAnalysis: r.ai_analysis ?? null,
    mortgageKind:
      (r.mortgage_kind as ApplicationRecord["mortgageKind"]) ?? null,
    isShellCompany: r.is_shell_company,
    mortgageCalc: r.mortgage_calc,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

export function applicationToRow(a: ApplicationRecord): SlfApplicationRow {
  return {
    id: a.id,
    loan_type: a.loanType,
    amount: a.amount,
    purpose: a.purpose,
    status: a.status,
    failure_reason: a.failureReason,
    docs_pct: a.docsPct ?? null,
    bank_count: a.bankCount ?? null,
    customer_id: a.customerId ?? null,
    applicant_name_zh: a.applicantNameZh ?? null,
    company_name_zh: a.companyNameZh ?? null,
    email: a.email ?? null,
    phone: a.phone ?? null,
    documents: a.documents ?? [],
    ai_analysis: a.aiAnalysis ?? null,
    mortgage_kind: a.mortgageKind ?? null,
    is_shell_company: a.isShellCompany ?? null,
    mortgage_calc: a.mortgageCalc ?? null,
    created_at: a.createdAt,
    updated_at: a.updatedAt,
  };
}

export async function supabaseListApplications(client?: SupabaseClient) {
  if (!supabasePgCoreReady() && !client) return [];
  const db = client ?? createAdminClient();
  const { data, error } = await db
    .from("slf_applications")
    .select("*")
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return ((data as SlfApplicationRow[]) || []).map(rowToApplication);
}

export async function supabaseGetApplication(
  id: string,
  client?: SupabaseClient,
) {
  if (!supabasePgCoreReady() && !client) return null;
  const db = client ?? createAdminClient();
  const { data, error } = await db
    .from("slf_applications")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data ? rowToApplication(data as SlfApplicationRow) : null;
}

export async function supabaseUpsertApplication(
  app: ApplicationRecord,
  client?: SupabaseClient,
) {
  const db = client ?? createAdminClient();
  const row = applicationToRow(app);
  const { data, error } = await db
    .from("slf_applications")
    .upsert(row, { onConflict: "id" })
    .select("*")
    .single();
  if (error) throw error;
  return rowToApplication(data as SlfApplicationRow);
}

export async function supabaseDeleteApplication(
  id: string,
  client?: SupabaseClient,
) {
  const db = client ?? createAdminClient();
  const { data, error } = await db
    .from("slf_applications")
    .delete()
    .eq("id", id)
    .select("id");
  if (error) throw error;
  return (data?.length ?? 0) > 0;
}

export async function supabaseReplaceApplications(
  apps: ApplicationRecord[],
  client?: SupabaseClient,
) {
  const db = client ?? createAdminClient();
  const { data: existing, error: listErr } = await db
    .from("slf_applications")
    .select("id");
  if (listErr) throw listErr;
  const keep = new Set(apps.map((a) => a.id));
  const toDelete = ((existing as { id: string }[]) || [])
    .map((r) => r.id)
    .filter((id) => !keep.has(id));
  if (toDelete.length) {
    const { error: delErr } = await db
      .from("slf_applications")
      .delete()
      .in("id", toDelete);
    if (delErr) throw delErr;
  }
  if (apps.length) {
    const { error } = await db
      .from("slf_applications")
      .upsert(apps.map(applicationToRow), { onConflict: "id" });
    if (error) throw error;
  }
  return apps;
}

export async function supabaseApplicationsReady(client?: SupabaseClient) {
  try {
    if (!supabasePgCoreReady() && !client) return false;
    const db = client ?? createAdminClient();
    const { error } = await db.from("slf_applications").select("id").limit(1);
    return !error;
  } catch {
    return false;
  }
}
