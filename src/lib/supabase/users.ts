import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { AuthRole, AuthUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { supabasePgCoreReady } from "@/lib/supabase/pg-core";

export type SlfUserRow = {
  id: string;
  email: string;
  password_hash: string;
  name_zh: string | null;
  phone: string | null;
  id_number: string | null;
  profile_completed: boolean;
  role: string | null;
  created_at: string;
  updated_at: string;
};

export function rowToAuthUser(r: SlfUserRow): AuthUser {
  return {
    id: r.id,
    email: r.email,
    passwordHash: r.password_hash,
    nameZh: r.name_zh,
    phone: r.phone,
    idNumber: r.id_number,
    profileCompleted: Boolean(r.profile_completed),
    role: (r.role as AuthRole | null) || undefined,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

export function authUserToRow(u: AuthUser): SlfUserRow {
  return {
    id: u.id,
    email: u.email.trim().toLowerCase(),
    password_hash: u.passwordHash,
    name_zh: u.nameZh,
    phone: u.phone,
    id_number: u.idNumber,
    profile_completed: Boolean(u.profileCompleted),
    role: u.role ?? null,
    created_at: u.createdAt,
    updated_at: u.updatedAt,
  };
}

export async function supabaseListUsers(client?: SupabaseClient) {
  if (!supabasePgCoreReady() && !client) return [];
  const db = client ?? createAdminClient();
  const { data, error } = await db
    .from("slf_users")
    .select("*")
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return ((data as SlfUserRow[]) || []).map(rowToAuthUser);
}

export async function supabaseFindUserByEmail(
  email: string,
  client?: SupabaseClient,
) {
  if (!supabasePgCoreReady() && !client) return null;
  const key = email.trim().toLowerCase();
  if (!key) return null;
  const db = client ?? createAdminClient();
  const { data, error } = await db
    .from("slf_users")
    .select("*")
    .ilike("email", key)
    .maybeSingle();
  if (error) throw error;
  return data ? rowToAuthUser(data as SlfUserRow) : null;
}

export async function supabaseUpsertUser(
  user: AuthUser,
  client?: SupabaseClient,
) {
  if (!supabasePgCoreReady() && !client) {
    throw new Error("SUPABASE_PG_NOT_READY");
  }
  const db = client ?? createAdminClient();
  const row = authUserToRow(user);
  const { data, error } = await db
    .from("slf_users")
    .upsert(row, { onConflict: "id" })
    .select("*")
    .single();
  if (error) throw error;
  return rowToAuthUser(data as SlfUserRow);
}

export async function supabaseReplaceUsers(
  users: AuthUser[],
  client?: SupabaseClient,
) {
  if (!supabasePgCoreReady() && !client) {
    throw new Error("SUPABASE_PG_NOT_READY");
  }
  const db = client ?? createAdminClient();
  const { data: existing, error: listErr } = await db
    .from("slf_users")
    .select("id");
  if (listErr) throw listErr;
  const keep = new Set(users.map((u) => u.id));
  const toDelete = ((existing as { id: string }[]) || [])
    .map((r) => r.id)
    .filter((id) => !keep.has(id));
  if (toDelete.length) {
    const { error: delErr } = await db
      .from("slf_users")
      .delete()
      .in("id", toDelete);
    if (delErr) throw delErr;
  }
  if (users.length) {
    const rows = users.map(authUserToRow);
    const { error } = await db.from("slf_users").upsert(rows, {
      onConflict: "id",
    });
    if (error) throw error;
  }
  return users;
}

export async function supabaseDeleteUserByEmail(
  email: string,
  client?: SupabaseClient,
) {
  if (!supabasePgCoreReady() && !client) return false;
  const key = email.trim().toLowerCase();
  const db = client ?? createAdminClient();
  const { data, error } = await db
    .from("slf_users")
    .delete()
    .ilike("email", key)
    .select("id");
  if (error) throw error;
  return (data?.length ?? 0) > 0;
}

export async function supabaseUsersReady(client?: SupabaseClient) {
  try {
    if (!supabasePgCoreReady() && !client) return false;
    const db = client ?? createAdminClient();
    const { error } = await db.from("slf_users").select("id").limit(1);
    return !error;
  } catch {
    return false;
  }
}
