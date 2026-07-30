import "server-only";
import type { RowDataPacket } from "mysql2";
import {
  isMysqlConfigured,
  mysqlExecute,
  mysqlQuery,
} from "@/lib/db/mysql";
import type { AuthRole, AuthUser } from "@/lib/auth";

type UserRow = RowDataPacket & {
  id: string;
  email: string;
  password_hash: string;
  name_zh: string | null;
  phone: string | null;
  id_number: string | null;
  profile_completed: number | boolean;
  role: string | null;
  created_at: Date | string;
  updated_at: Date | string;
};

function toIso(v: Date | string): string {
  if (v instanceof Date) return v.toISOString();
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? String(v) : d.toISOString();
}

function rowToUser(r: UserRow): AuthUser {
  const role =
    r.role === "admin" || r.role === "applicant"
      ? (r.role as AuthRole)
      : undefined;
  return {
    id: r.id,
    email: r.email,
    passwordHash: r.password_hash,
    nameZh: r.name_zh,
    phone: r.phone,
    idNumber: r.id_number,
    profileCompleted: Boolean(r.profile_completed),
    role,
    createdAt: toIso(r.created_at),
    updatedAt: toIso(r.updated_at),
  };
}

export function authUsesMysql() {
  return isMysqlConfigured();
}

export async function mysqlFindUserByEmail(
  email: string,
): Promise<AuthUser | null> {
  const rows = await mysqlQuery<UserRow[]>(
    `SELECT id, email, password_hash, name_zh, phone, id_number,
            profile_completed, role, created_at, updated_at
     FROM users WHERE email = ? LIMIT 1`,
    [email.trim().toLowerCase()],
  );
  return rows[0] ? rowToUser(rows[0]) : null;
}

export async function mysqlFindUserById(id: string): Promise<AuthUser | null> {
  const rows = await mysqlQuery<UserRow[]>(
    `SELECT id, email, password_hash, name_zh, phone, id_number,
            profile_completed, role, created_at, updated_at
     FROM users WHERE id = ? LIMIT 1`,
    [id],
  );
  return rows[0] ? rowToUser(rows[0]) : null;
}

export async function mysqlInsertUser(user: AuthUser): Promise<void> {
  await mysqlExecute(
    `INSERT INTO users
      (id, email, password_hash, name_zh, phone, id_number,
       profile_completed, role, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      user.id,
      user.email.toLowerCase(),
      user.passwordHash,
      user.nameZh,
      user.phone,
      user.idNumber,
      user.profileCompleted ? 1 : 0,
      user.role ?? null,
      new Date(user.createdAt),
      new Date(user.updatedAt),
    ],
  );
}

export async function mysqlUpdateUser(user: AuthUser): Promise<void> {
  await mysqlExecute(
    `UPDATE users SET
      email = ?, password_hash = ?, name_zh = ?, phone = ?, id_number = ?,
      profile_completed = ?, role = ?, updated_at = ?
     WHERE id = ?`,
    [
      user.email.toLowerCase(),
      user.passwordHash,
      user.nameZh,
      user.phone,
      user.idNumber,
      user.profileCompleted ? 1 : 0,
      user.role ?? null,
      new Date(user.updatedAt),
      user.id,
    ],
  );
}

/** 清空非管理員用戶；保留 role=admin 或 admin@sme.com */
export async function mysqlClearApplicantUsers(): Promise<number> {
  const result = await mysqlExecute(
    `DELETE FROM users
     WHERE COALESCE(role, '') <> 'admin'
       AND LOWER(email) <> 'admin@sme.com'`,
  );
  return Number(result.affectedRows) || 0;
}

export async function mysqlUpsertUser(user: AuthUser): Promise<void> {
  await mysqlExecute(
    `INSERT INTO users
      (id, email, password_hash, name_zh, phone, id_number,
       profile_completed, role, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
      email = VALUES(email),
      password_hash = VALUES(password_hash),
      name_zh = VALUES(name_zh),
      phone = VALUES(phone),
      id_number = VALUES(id_number),
      profile_completed = VALUES(profile_completed),
      role = VALUES(role),
      updated_at = VALUES(updated_at)`,
    [
      user.id,
      user.email.toLowerCase(),
      user.passwordHash,
      user.nameZh,
      user.phone,
      user.idNumber,
      user.profileCompleted ? 1 : 0,
      user.role ?? null,
      new Date(user.createdAt),
      new Date(user.updatedAt),
    ],
  );
}
