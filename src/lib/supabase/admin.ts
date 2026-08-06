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

/** 開戶文件通後台帳（app_metadata.role=biz_admin）— 與 SME admin 分離 */
export async function ensureSupabaseBizAdminUser(opts?: {
  email?: string;
  password?: string;
  nameZh?: string;
}) {
  const email = (opts?.email || "admin@hkbank.com").trim().toLowerCase();
  const password = opts?.password || "HkBank2026!";
  const nameZh = opts?.nameZh || "開戶文件審核員";
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
      app_metadata: { ...existing.app_metadata, role: "biz_admin" },
      user_metadata: { ...existing.user_metadata, nameZh },
    });
    if (error) throw error;
    return data.user;
  }

  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    app_metadata: { role: "biz_admin" },
    user_metadata: { nameZh },
  });
  if (error) throw error;
  return data.user;
}

/** 刪除 Supabase Auth 非管理員用戶，逼重新註冊；保留 admin@sme.com */
export async function clearSupabaseApplicantUsers(opts?: {
  keepEmail?: string;
}) {
  const keep = (opts?.keepEmail || "admin@sme.com").trim().toLowerCase();
  const admin = createAdminClient();
  let removed = 0;
  let page = 1;
  for (;;) {
    const listed = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (listed.error) throw listed.error;
    const users = listed.data.users;
    if (!users.length) break;
    for (const u of users) {
      const email = u.email?.toLowerCase() ?? "";
      const role = u.app_metadata?.role;
      if (email === keep || role === "admin" || role === "biz_admin") continue;
      const { error } = await admin.auth.admin.deleteUser(u.id);
      if (error) throw error;
      removed += 1;
    }
    if (users.length < 200) break;
    page += 1;
  }
  await ensureSupabaseAdminUser({ email: keep });
  return { removed, keptAdmin: true as const };
}

/** 按電郵刪除單一申請人 Auth 帳戶（管理員／admin email 略過） */
export async function deleteSupabaseUserByEmail(email: string) {
  const key = email.trim().toLowerCase();
  if (!key || key === "admin@sme.com" || key === "admin@hkbank.com") {
    return { removed: false, skipped: true as const };
  }
  const admin = createAdminClient();
  let page = 1;
  for (;;) {
    const listed = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (listed.error) throw listed.error;
    const users = listed.data.users;
    if (!users.length) break;
    const hit = users.find((u) => (u.email?.toLowerCase() ?? "") === key);
    if (hit) {
      if (
        hit.app_metadata?.role === "admin" ||
        hit.app_metadata?.role === "biz_admin"
      ) {
        return { removed: false, skipped: true as const };
      }
      const { error } = await admin.auth.admin.deleteUser(hit.id);
      if (error) throw error;
      return { removed: true, skipped: false as const };
    }
    if (users.length < 200) break;
    page += 1;
  }
  return { removed: false, skipped: false as const };
}
