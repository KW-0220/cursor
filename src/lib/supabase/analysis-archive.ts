import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { ArchivedAnalysisRecord } from "@/lib/analysis-archive-registry";
import { createAdminClient } from "@/lib/supabase/admin";
import { supabasePgCoreReady } from "@/lib/supabase/pg-core";

export type SlfArchiveRow = {
  id: string;
  title: string;
  file_name: string | null;
  doc_kind: string;
  company_name: string | null;
  customer_id: string | null;
  loan_type: string | null;
  amount_hkd: number | null;
  purpose: string | null;
  summary: string | null;
  overall: string | null;
  payload: Record<string, unknown> | null;
  notes: string | null;
  archived_by: string | null;
  archived_at: string;
  updated_at: string;
};

export function rowToArchive(r: SlfArchiveRow): ArchivedAnalysisRecord {
  return {
    id: r.id,
    title: r.title,
    fileName: r.file_name,
    docKind: r.doc_kind,
    companyName: r.company_name,
    customerId: r.customer_id,
    loanType: r.loan_type,
    amountHkd: r.amount_hkd == null ? null : Number(r.amount_hkd),
    purpose: r.purpose,
    summary: r.summary,
    overall: r.overall,
    payload: (r.payload && typeof r.payload === "object" ? r.payload : {}) as Record<
      string,
      unknown
    >,
    notes: r.notes,
    archivedBy: r.archived_by,
    archivedAt: r.archived_at,
    updatedAt: r.updated_at,
  };
}

export function archiveToRow(a: ArchivedAnalysisRecord): SlfArchiveRow {
  return {
    id: a.id,
    title: a.title,
    file_name: a.fileName,
    doc_kind: a.docKind,
    company_name: a.companyName,
    customer_id: a.customerId,
    loan_type: a.loanType,
    amount_hkd: a.amountHkd,
    purpose: a.purpose,
    summary: a.summary,
    overall: a.overall,
    payload: a.payload,
    notes: a.notes,
    archived_by: a.archivedBy,
    archived_at: a.archivedAt,
    updated_at: a.updatedAt,
  };
}

export async function supabaseListArchivedAnalyses(client?: SupabaseClient) {
  if (!supabasePgCoreReady() && !client) return [];
  const db = client ?? createAdminClient();
  const { data, error } = await db
    .from("slf_analysis_archive")
    .select("*")
    .order("archived_at", { ascending: false });
  if (error) throw error;
  return ((data as SlfArchiveRow[]) || []).map(rowToArchive);
}

export async function supabaseGetArchivedAnalysis(
  id: string,
  client?: SupabaseClient,
) {
  if (!supabasePgCoreReady() && !client) return null;
  const db = client ?? createAdminClient();
  const { data, error } = await db
    .from("slf_analysis_archive")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data ? rowToArchive(data as SlfArchiveRow) : null;
}

export async function supabaseUpsertArchivedAnalysis(
  a: ArchivedAnalysisRecord,
  client?: SupabaseClient,
) {
  const db = client ?? createAdminClient();
  const { data, error } = await db
    .from("slf_analysis_archive")
    .upsert(archiveToRow(a), { onConflict: "id" })
    .select("*")
    .single();
  if (error) throw error;
  return rowToArchive(data as SlfArchiveRow);
}

export async function supabaseDeleteArchivedAnalysis(
  id: string,
  client?: SupabaseClient,
) {
  const db = client ?? createAdminClient();
  const { data, error } = await db
    .from("slf_analysis_archive")
    .delete()
    .eq("id", id)
    .select("id");
  if (error) throw error;
  return (data?.length ?? 0) > 0;
}

export async function supabaseReplaceArchivedAnalyses(
  rows: ArchivedAnalysisRecord[],
  client?: SupabaseClient,
) {
  const db = client ?? createAdminClient();
  const { data: existing, error: listErr } = await db
    .from("slf_analysis_archive")
    .select("id");
  if (listErr) throw listErr;
  const keep = new Set(rows.map((r) => r.id));
  const toDelete = ((existing as { id: string }[]) || [])
    .map((r) => r.id)
    .filter((id) => !keep.has(id));
  if (toDelete.length) {
    const { error: delErr } = await db
      .from("slf_analysis_archive")
      .delete()
      .in("id", toDelete);
    if (delErr) throw delErr;
  }
  if (rows.length) {
    const { error } = await db
      .from("slf_analysis_archive")
      .upsert(rows.map(archiveToRow), { onConflict: "id" });
    if (error) throw error;
  }
  return rows;
}

export async function supabaseArchiveReady(client?: SupabaseClient) {
  try {
    if (!supabasePgCoreReady() && !client) return false;
    const db = client ?? createAdminClient();
    const { error } = await db
      .from("slf_analysis_archive")
      .select("id")
      .limit(1);
    return !error;
  } catch {
    return false;
  }
}
