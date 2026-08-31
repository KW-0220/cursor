import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { DocumentKind, StoredDocument } from "@/lib/documents-registry";
import { createAdminClient } from "@/lib/supabase/admin";
import { supabasePgCoreReady } from "@/lib/supabase/pg-core";

export type SlfDocumentRow = {
  id: string;
  customer_id: string | null;
  application_id: string;
  kind: string;
  slot: string;
  file_name: string;
  mime_type: string;
  size: number;
  storage_path: string;
  storage: string;
  created_at: string;
};

export function rowToDocument(r: SlfDocumentRow): StoredDocument {
  return {
    id: r.id,
    customerId: r.customer_id,
    applicationId: r.application_id,
    kind: r.kind as DocumentKind,
    slot: r.slot,
    fileName: r.file_name,
    mimeType: r.mime_type,
    size: Number(r.size) || 0,
    storagePath: r.storage_path,
    storage: r.storage === "local" ? "local" : "supabase",
    createdAt: r.created_at,
  };
}

export function documentToRow(d: StoredDocument): SlfDocumentRow {
  return {
    id: d.id,
    customer_id: d.customerId,
    application_id: d.applicationId,
    kind: d.kind,
    slot: d.slot,
    file_name: d.fileName,
    mime_type: d.mimeType,
    size: d.size,
    storage_path: d.storagePath,
    storage: d.storage,
    created_at: d.createdAt,
  };
}

export async function supabaseListDocuments(
  filter?: { customerId?: string; applicationId?: string },
  client?: SupabaseClient,
) {
  if (!supabasePgCoreReady() && !client) return [];
  const db = client ?? createAdminClient();
  let q = db.from("slf_documents").select("*").order("created_at", {
    ascending: false,
  });
  if (filter?.applicationId) q = q.eq("application_id", filter.applicationId);
  if (filter?.customerId) q = q.eq("customer_id", filter.customerId);
  const { data, error } = await q;
  if (error) throw error;
  return ((data as SlfDocumentRow[]) || []).map(rowToDocument);
}

export async function supabaseUpsertDocument(
  doc: StoredDocument,
  client?: SupabaseClient,
) {
  const db = client ?? createAdminClient();
  const { data, error } = await db
    .from("slf_documents")
    .upsert(documentToRow(doc), { onConflict: "id" })
    .select("*")
    .single();
  if (error) throw error;
  return rowToDocument(data as SlfDocumentRow);
}

export async function supabaseReplaceDocuments(
  docs: StoredDocument[],
  client?: SupabaseClient,
) {
  const db = client ?? createAdminClient();
  const { data: existing, error: listErr } = await db
    .from("slf_documents")
    .select("id");
  if (listErr) throw listErr;
  const keep = new Set(docs.map((d) => d.id));
  const toDelete = ((existing as { id: string }[]) || [])
    .map((r) => r.id)
    .filter((id) => !keep.has(id));
  if (toDelete.length) {
    const { error: delErr } = await db
      .from("slf_documents")
      .delete()
      .in("id", toDelete);
    if (delErr) throw delErr;
  }
  if (docs.length) {
    const { error } = await db
      .from("slf_documents")
      .upsert(docs.map(documentToRow), { onConflict: "id" });
    if (error) throw error;
  }
  return docs;
}

export async function supabaseDeleteDocumentsByApplication(
  applicationId: string,
  client?: SupabaseClient,
) {
  const db = client ?? createAdminClient();
  const { data, error } = await db
    .from("slf_documents")
    .delete()
    .eq("application_id", applicationId)
    .select("id");
  if (error) throw error;
  return data?.length ?? 0;
}

export async function supabaseDeleteDocumentsByCustomer(
  customerId: string,
  client?: SupabaseClient,
) {
  const db = client ?? createAdminClient();
  const { data, error } = await db
    .from("slf_documents")
    .delete()
    .eq("customer_id", customerId)
    .select("id");
  if (error) throw error;
  return data?.length ?? 0;
}

export async function supabaseDocumentsReady(client?: SupabaseClient) {
  try {
    if (!supabasePgCoreReady() && !client) return false;
    const db = client ?? createAdminClient();
    const { error } = await db.from("slf_documents").select("id").limit(1);
    return !error;
  } catch {
    return false;
  }
}
