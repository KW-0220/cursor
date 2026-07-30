import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { supabaseCustomersReady } from "@/lib/supabase/customers";
import {
  getSupabaseJwksUrl,
  getSupabasePublishableKey,
  getSupabaseSecretKey,
  getSupabaseUrl,
  isSupabaseAdminConfigured,
  isSupabaseConfigured,
} from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

/** 確認 env + publishable／secret／customers table／@supabase/server */
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

  return NextResponse.json({
    ok: configured && authOk && adminOk && jwksOk && customersOk,
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
    detail,
  });
}
