import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
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

/** 確認 env + publishable／secret client（唔暴露完整 key） */
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
    ok: configured && authOk && adminOk && jwksOk,
    configured,
    adminConfigured,
    url,
    jwksUrl,
    publishableKeyPrefix: publishable.slice(0, 18) + "…",
    secretKeyPrefix: secret ? secret.slice(0, 12) + "…" : null,
    authOk,
    adminOk,
    jwksOk,
    detail,
  });
}
