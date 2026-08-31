import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  SupplementNotifyChannel,
  SupplementRecord,
} from "@/lib/supplements-registry";
import { createAdminClient } from "@/lib/supabase/admin";
import { supabasePgCoreReady } from "@/lib/supabase/pg-core";

export type SlfSupplementRow = {
  id: string;
  application_id: string;
  document_type: string;
  reason_template: string;
  reason: string;
  detail: string;
  due_date: string;
  required: boolean;
  need_ocr: boolean;
  notify_channels: SupplementNotifyChannel[] | null;
  to_email: string | null;
  customer_id: string | null;
  company_name_zh: string | null;
  applicant_name_zh: string | null;
  email_subject: string | null;
  status: string;
  email_status: string;
  email_id: string | null;
  email_error: string | null;
  push_status: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export function rowToSupplement(r: SlfSupplementRow): SupplementRecord {
  return {
    id: r.id,
    applicationId: r.application_id,
    documentType: r.document_type,
    reasonTemplate: r.reason_template,
    reason: r.reason,
    detail: r.detail,
    dueDate: r.due_date,
    required: Boolean(r.required),
    needOcr: Boolean(r.need_ocr),
    notifyChannels: Array.isArray(r.notify_channels) ? r.notify_channels : [],
    toEmail: r.to_email,
    customerId: r.customer_id,
    companyNameZh: r.company_name_zh,
    applicantNameZh: r.applicant_name_zh,
    emailSubject: r.email_subject,
    status: r.status as SupplementRecord["status"],
    emailStatus: r.email_status as SupplementRecord["emailStatus"],
    emailId: r.email_id,
    emailError: r.email_error,
    pushStatus: r.push_status as SupplementRecord["pushStatus"],
    createdBy: r.created_by,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

export function supplementToRow(s: SupplementRecord): SlfSupplementRow {
  return {
    id: s.id,
    application_id: s.applicationId,
    document_type: s.documentType,
    reason_template: s.reasonTemplate,
    reason: s.reason,
    detail: s.detail,
    due_date: s.dueDate,
    required: s.required,
    need_ocr: s.needOcr,
    notify_channels: s.notifyChannels,
    to_email: s.toEmail,
    customer_id: s.customerId,
    company_name_zh: s.companyNameZh,
    applicant_name_zh: s.applicantNameZh,
    email_subject: s.emailSubject,
    status: s.status,
    email_status: s.emailStatus,
    email_id: s.emailId,
    email_error: s.emailError,
    push_status: s.pushStatus,
    created_by: s.createdBy,
    created_at: s.createdAt,
    updated_at: s.updatedAt,
  };
}

export async function supabaseListSupplements(
  opts?: { status?: SupplementRecord["status"] },
  client?: SupabaseClient,
) {
  if (!supabasePgCoreReady() && !client) return [];
  const db = client ?? createAdminClient();
  let q = db
    .from("slf_supplements")
    .select("*")
    .order("updated_at", { ascending: false });
  if (opts?.status) q = q.eq("status", opts.status);
  const { data, error } = await q;
  if (error) throw error;
  return ((data as SlfSupplementRow[]) || []).map(rowToSupplement);
}

export async function supabaseUpsertSupplement(
  s: SupplementRecord,
  client?: SupabaseClient,
) {
  const db = client ?? createAdminClient();
  const { data, error } = await db
    .from("slf_supplements")
    .upsert(supplementToRow(s), { onConflict: "id" })
    .select("*")
    .single();
  if (error) throw error;
  return rowToSupplement(data as SlfSupplementRow);
}

export async function supabaseReplaceSupplements(
  rows: SupplementRecord[],
  client?: SupabaseClient,
) {
  const db = client ?? createAdminClient();
  const { data: existing, error: listErr } = await db
    .from("slf_supplements")
    .select("id");
  if (listErr) throw listErr;
  const keep = new Set(rows.map((r) => r.id));
  const toDelete = ((existing as { id: string }[]) || [])
    .map((r) => r.id)
    .filter((id) => !keep.has(id));
  if (toDelete.length) {
    const { error: delErr } = await db
      .from("slf_supplements")
      .delete()
      .in("id", toDelete);
    if (delErr) throw delErr;
  }
  if (rows.length) {
    const { error } = await db
      .from("slf_supplements")
      .upsert(rows.map(supplementToRow), { onConflict: "id" });
    if (error) throw error;
  }
  return rows;
}

export async function supabaseSupplementsReady(client?: SupabaseClient) {
  try {
    if (!supabasePgCoreReady() && !client) return false;
    const db = client ?? createAdminClient();
    const { error } = await db.from("slf_supplements").select("id").limit(1);
    return !error;
  } catch {
    return false;
  }
}
