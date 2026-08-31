import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { supabaseArchiveReady } from "@/lib/supabase/analysis-archive";
import { supabaseApplicationsReady } from "@/lib/supabase/applications";
import { supabaseCustomersReady } from "@/lib/supabase/customers";
import { supabaseDocumentsReady } from "@/lib/supabase/documents-meta";
import {
  getSupabaseJwksUrl,
  getSupabasePublishableKey,
  getSupabaseSecretKey,
  getSupabaseUrl,
  isSupabaseAdminConfigured,
  isSupabaseConfigured,
} from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";
import { supabaseSupplementsReady } from "@/lib/supabase/supplements";
import { supabaseUsersReady } from "@/lib/supabase/users";

export const runtime = "nodejs";

/** 確認 env + publishable／secret／core tables／@supabase/server */
export async function GET() {
  const url = getSupabaseUrl();
  const publishable = getSupabasePublishableKey();
  const secret = getSupabaseSecretKey();
  const jwksUrl = getSupabaseJwksUrl();
  const configured = isSupabaseConfigured();
  const adminConfigured = isSupabaseAdminConfigured();

  let authOk = false;
  let adminOk = false;
  let jwksOk = false;
  let customersOk = false;
  let usersOk = false;
  let applicationsOk = false;
  let documentsOk = false;
  let supplementsOk = false;
  let archiveOk = false;
  let detail: string | null = null;

  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.getSession();
    authOk = !error;
    if (error) detail = error.message;
  } catch (err) {
    detail = err instanceof Error ? err.message : "UNKNOWN";
  }

  if (adminConfigured) {
    try {
      const admin = createAdminClient();
      const { error } = await admin.auth.getSession();
      adminOk = !error;
      if (error && !detail) detail = error.message;
      customersOk = await supabaseCustomersReady(admin);
      usersOk = await supabaseUsersReady(admin);
      applicationsOk = await supabaseApplicationsReady(admin);
      documentsOk = await supabaseDocumentsReady(admin);
      supplementsOk = await supabaseSupplementsReady(admin);
      archiveOk = await supabaseArchiveReady(admin);
    } catch (err) {
      if (!detail) detail = err instanceof Error ? err.message : "ADMIN_FAIL";
    }
  }

  try {
    const res = await fetch(jwksUrl, { cache: "no-store" });
    if (res.ok) {
      const body = (await res.json()) as { keys?: unknown[] };
      jwksOk = Array.isArray(body.keys);
    }
  } catch (err) {
    if (!detail) detail = err instanceof Error ? err.message : "JWKS_FAIL";
  }

  const coreTables =
    customersOk &&
    usersOk &&
    applicationsOk &&
    documentsOk &&
    supplementsOk &&
    archiveOk;

  return NextResponse.json({
    ok: configured && authOk && adminOk && jwksOk && coreTables,
    configured,
    adminConfigured,
    adminConnected: true,
    serverPackage: "@supabase/server",
    url,
    jwksUrl,
    publishableKeyPrefix: publishable.slice(0, 18) + "…",
    secretKeyPrefix: secret ? secret.slice(0, 12) + "…" : null,
    authOk,
    adminOk,
    jwksOk,
    customersTable: customersOk,
    tables: {
      customers: customersOk,
      users: usersOk,
      applications: applicationsOk,
      documents: documentsOk,
      supplements: supplementsOk,
      analysisArchive: archiveOk,
    },
    detail,
  });
}
