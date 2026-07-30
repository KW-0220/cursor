import "server-only";
import { createAdminClient as createServerAdminClient } from "@supabase/server/core";
import type { SupabaseEnv } from "@supabase/server";
import {
  getSupabasePublishableKey,
  getSupabaseSecretKey,
  getSupabaseUrl,
} from "@/lib/supabase/env";

function adminEnv(): Partial<SupabaseEnv> {
  const url = getSupabaseUrl();
  const publishableKey = getSupabasePublishableKey();
  const secretKey = getSupabaseSecretKey();
  if (!secretKey) throw new Error("MISSING_SUPABASE_SECRET_KEY");
  return {
    url,
    publishableKeys: publishableKey ? { default: publishableKey } : {},
    secretKeys: { default: secretKey },
  };
}

/**
 * Service / secret client via `@supabase/server/core`（bypass RLS）。
 * 只喺 Route Handler／Server Action／後台用。
 */
export function createAdminClient() {
  return createServerAdminClient({ env: adminEnv() });
}

/** 確保固定後台帳存在於 Supabase Auth（app_metadata.role=admin） */
export async function ensureSupabaseAdminUser(opts?: {
  email?: string;
  password?: string;
  nameZh?: string;
}) {
  const email = (opts?.email || "admin@sme.com").trim().toLowerCase();
  const password = opts?.password || "Sme2026!";
  const nameZh = opts?.nameZh || "系統管理員";
  const admin = createAdminClient();

  const listed = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
  if (listed.error) throw listed.error;
  const existing = listed.data.users.find(
    (u) => u.email?.toLowerCase() === email,
  );

  if (existing) {
    const { data, error } = await admin.auth.admin.updateUserById(existing.id, {
      password,
      email_confirm: true,
      app_metadata: { ...existing.app_metadata, role: "admin" },
      user_metadata: { ...existing.user_metadata, nameZh },
    });
    if (error) throw error;
    return data.user;
  }

  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    app_metadata: { role: "admin" },
    user_metadata: { nameZh },
  });
  if (error) throw error;
  return data.user;
}
