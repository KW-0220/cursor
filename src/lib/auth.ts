import "server-only";
import { createHash } from "crypto";
import { promises as fs } from "fs";
import path from "path";
import bcrypt from "bcryptjs";
import { EncryptJWT, SignJWT, jwtDecrypt, jwtVerify } from "jose";
import { z } from "zod";

export const RegisterSchema = z.object({
  email: z.string().email("請輸入有效電郵"),
  password: z.string().min(8, "密碼至少 8 位"),
  nameZh: z.string().min(1, "請輸入姓名").optional(),
  phone: z
    .string({ required_error: "請輸入手機號碼" })
    .trim()
    .min(8, "請輸入有效手機號碼（含區號）"),
});

export const LoginSchema = z.object({
  email: z.string().email("請輸入有效電郵"),
  password: z.string().min(1, "請輸入密碼"),
});

export type AuthRole = "applicant" | "admin";

export interface AuthUser {
  id: string;
  email: string;
  passwordHash: string;
  nameZh: string | null;
  phone: string | null;
  profileCompleted: boolean;
  role?: AuthRole;
  createdAt: string;
  updatedAt: string;
}

export type PublicUser = Omit<AuthUser, "passwordHash">;

/** 示範後台管理員（固定帳密） */
export const ADMIN_EMAIL = "admin@sme.com";
export const ADMIN_PASSWORD = "Sme2026!";

export function isAdminEmail(email: string) {
  return email.trim().toLowerCase() === ADMIN_EMAIL;
}

export function isAdminCredentials(email: string, password: string) {
  return isAdminEmail(email) && password === ADMIN_PASSWORD;
}

const DATA_DIR = path.join(process.cwd(), "data");
const DATA_FILE = path.join(DATA_DIR, "users.json");
const COOKIE_NAME = "slf_session";
/** 同瀏覽器備援：無 Redis 時仍可重新登入（EncryptJWT） */
const VAULT_COOKIE = "slf_vault";
const VAULT_MAX_USERS = 30;

let memoryUsers: AuthUser[] | null = null;

function sessionSecret() {
  const secret =
    process.env.AUTH_SECRET?.trim() ||
    process.env.OPENAI_API_KEY?.trim()?.slice(0, 48) ||
    "sme-loanflow-dev-secret-change-me";
  return new TextEncoder().encode(secret);
}

/** A256GCM 需要剛好 32 bytes */
function vaultKey() {
  return createHash("sha256").update(sessionSecret()).digest();
}

function toPublic(u: AuthUser): PublicUser {
  const { passwordHash: _, ...rest } = u;
  return rest;
}

async function redisGet(key: string): Promise<string | null> {
  const url =
    process.env.UPSTASH_REDIS_REST_URL?.trim() ||
    process.env.KV_REST_API_URL?.trim();
  const token =
    process.env.UPSTASH_REDIS_REST_TOKEN?.trim() ||
    process.env.KV_REST_API_TOKEN?.trim();
  if (!url || !token) return null;
  const res = await fetch(`${url}/get/${encodeURIComponent(key)}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (!res.ok) return null;
  const data = (await res.json()) as { result: string | null };
  return data.result;
}

async function redisSet(key: string, value: string) {
  const url =
    process.env.UPSTASH_REDIS_REST_URL?.trim() ||
    process.env.KV_REST_API_URL?.trim();
  const token =
    process.env.UPSTASH_REDIS_REST_TOKEN?.trim() ||
    process.env.KV_REST_API_TOKEN?.trim();
  if (!url || !token) return false;
  const res = await fetch(`${url}/set/${encodeURIComponent(key)}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(value),
  });
  return res.ok;
}

async function loadUsers(): Promise<AuthUser[]> {
  if (memoryUsers) return memoryUsers;

  const fromRedis = await redisGet("slf:users");
  if (fromRedis) {
    try {
      memoryUsers = JSON.parse(fromRedis) as AuthUser[];
      return memoryUsers;
    } catch {
      // fall through
    }
  }

  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
    const raw = await fs.readFile(DATA_FILE, "utf8");
    memoryUsers = JSON.parse(raw) as AuthUser[];
  } catch {
    memoryUsers = [];
  }
  return memoryUsers;
}

async function saveUsers(users: AuthUser[]) {
  memoryUsers = users;
  await redisSet("slf:users", JSON.stringify(users));
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
    await fs.writeFile(DATA_FILE, JSON.stringify(users, null, 2), "utf8");
  } catch {
    // Vercel 可能無持久碟
  }
}

export function getAuthStorageMode() {
  if (
    (process.env.UPSTASH_REDIS_REST_URL &&
      process.env.UPSTASH_REDIS_REST_TOKEN) ||
    (process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN)
  ) {
    return "redis" as const;
  }
  return "file_or_memory" as const;
}

export async function findUserByEmail(email: string) {
  const users = await loadUsers();
  const key = email.trim().toLowerCase();
  return users.find((u) => u.email.toLowerCase() === key) ?? null;
}

export async function registerUser(
  input: z.infer<typeof RegisterSchema>,
  vaultUsers?: AuthUser[],
) {
  const email = input.email.trim().toLowerCase();
  const existing =
    (await findUserByEmail(email)) ||
    vaultUsers?.find((u) => u.email.toLowerCase() === email) ||
    null;
  if (existing) {
    throw new Error("EMAIL_EXISTS");
  }
  const users = await loadUsers();
  const now = new Date().toISOString();
  const user: AuthUser = {
    id: `USR-${Date.now()}`,
    email,
    passwordHash: await bcrypt.hash(input.password, 10),
    nameZh: input.nameZh?.trim() || null,
    phone: input.phone.trim() || null,
    profileCompleted: false,
    createdAt: now,
    updatedAt: now,
  };
  users.push(user);
  await saveUsers(users);
  return toPublic(user);
}

/** 確保管理員帳戶存在且密碼為現行固定值 */
export async function ensureAdminUser(): Promise<PublicUser> {
  const users = await loadUsers();
  const now = new Date().toISOString();
  const hash = await bcrypt.hash(ADMIN_PASSWORD, 10);
  const idx = users.findIndex((u) => isAdminEmail(u.email));
  if (idx >= 0) {
    users[idx] = {
      ...users[idx],
      passwordHash: hash,
      role: "admin",
      nameZh: users[idx].nameZh || "系統管理員",
      profileCompleted: true,
      updatedAt: now,
    };
    await saveUsers(users);
    return toPublic(users[idx]);
  }
  const user: AuthUser = {
    id: "USR-ADMIN",
    email: ADMIN_EMAIL,
    passwordHash: hash,
    nameZh: "系統管理員",
    phone: null,
    profileCompleted: true,
    role: "admin",
    createdAt: now,
    updatedAt: now,
  };
  users.push(user);
  await saveUsers(users);
  return toPublic(user);
}

export async function verifyLogin(
  input: z.infer<typeof LoginSchema>,
  vaultUsers?: AuthUser[],
) {
  if (isAdminCredentials(input.email, input.password)) {
    return ensureAdminUser();
  }

  let user = await findUserByEmail(input.email);
  if (!user && vaultUsers?.length) {
    const key = input.email.trim().toLowerCase();
    const fromVault = vaultUsers.find((u) => u.email.toLowerCase() === key);
    if (fromVault) {
      // 把 vault 用戶灌回 server store（同 instance / Redis）
      const users = await loadUsers();
      if (!users.some((u) => u.email.toLowerCase() === key)) {
        users.push(fromVault);
        await saveUsers(users);
      }
      user = fromVault;
    }
  }
  if (!user) throw new Error("INVALID_CREDENTIALS");
  if (user.role === "admin" || isAdminEmail(user.email)) {
    // 管理員只接受固定密碼，避免舊 hash 殘留
    throw new Error("INVALID_CREDENTIALS");
  }
  const ok = await bcrypt.compare(input.password, user.passwordHash);
  if (!ok) throw new Error("INVALID_CREDENTIALS");
  return toPublic(user);
}

export async function upsertUserIntoStore(user: AuthUser) {
  const users = await loadUsers();
  const idx = users.findIndex((u) => u.id === user.id || u.email === user.email);
  if (idx >= 0) users[idx] = user;
  else users.push(user);
  await saveUsers(users);
  return toPublic(user);
}

export async function readVaultFromCookieHeader(
  cookieHeader: string | null,
): Promise<AuthUser[]> {
  if (!cookieHeader) return [];
  const match = cookieHeader
    .split(";")
    .map((p) => p.trim())
    .find((p) => p.startsWith(`${VAULT_COOKIE}=`));
  if (!match) return [];
  const token = decodeURIComponent(match.slice(VAULT_COOKIE.length + 1));
  try {
    const { payload } = await jwtDecrypt(token, vaultKey());
    const users = (payload.users as AuthUser[]) || [];
    return Array.isArray(users) ? users : [];
  } catch {
    return [];
  }
}

export async function mergeVaultCookie(
  existingCookieHeader: string | null,
  user: AuthUser,
) {
  const current = await readVaultFromCookieHeader(existingCookieHeader);
  const next = [
    user,
    ...current.filter((u) => u.email.toLowerCase() !== user.email.toLowerCase()),
  ].slice(0, VAULT_MAX_USERS);
  const token = await new EncryptJWT({ users: next })
    .setProtectedHeader({ alg: "dir", enc: "A256GCM" })
    .setIssuedAt()
    .setExpirationTime("365d")
    .encrypt(vaultKey());
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return `${VAULT_COOKIE}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${60 * 60 * 24 * 365}${secure}`;
}

export async function markProfileCompleted(userId: string) {
  const users = await loadUsers();
  const idx = users.findIndex((u) => u.id === userId);
  if (idx < 0) return null;
  users[idx] = {
    ...users[idx],
    profileCompleted: true,
    updatedAt: new Date().toISOString(),
  };
  await saveUsers(users);
  return toPublic(users[idx]);
}

export async function updateUserContact(
  userId: string,
  patch: { nameZh?: string; phone?: string },
) {
  const users = await loadUsers();
  const idx = users.findIndex((u) => u.id === userId);
  if (idx < 0) return null;
  users[idx] = {
    ...users[idx],
    nameZh: patch.nameZh ?? users[idx].nameZh,
    phone: patch.phone ?? users[idx].phone,
    updatedAt: new Date().toISOString(),
  };
  await saveUsers(users);
  return toPublic(users[idx]);
}

export async function createSessionToken(user: PublicUser) {
  const role: AuthRole =
    user.role === "admin" || isAdminEmail(user.email) ? "admin" : "applicant";
  return new SignJWT({
    sub: user.id,
    email: user.email,
    nameZh: user.nameZh,
    profileCompleted: user.profileCompleted,
    role,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(sessionSecret());
}

export async function readSessionToken(token: string) {
  try {
    const { payload } = await jwtVerify(token, sessionSecret());
    const email = String(payload.email ?? "");
    const role: AuthRole =
      payload.role === "admin" || isAdminEmail(email) ? "admin" : "applicant";
    return {
      id: String(payload.sub),
      email,
      nameZh: (payload.nameZh as string | null) ?? null,
      profileCompleted: Boolean(payload.profileCompleted),
      role,
    };
  } catch {
    return null;
  }
}

export async function getSessionFromCookieHeader(cookieHeader: string | null) {
  if (!cookieHeader) return null;
  const match = cookieHeader
    .split(";")
    .map((p) => p.trim())
    .find((p) => p.startsWith(`${COOKIE_NAME}=`));
  if (!match) return null;
  const token = decodeURIComponent(match.slice(COOKIE_NAME.length + 1));
  return readSessionToken(token);
}

export function sessionCookie(token: string) {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return `${COOKIE_NAME}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${60 * 60 * 24 * 30}${secure}`;
}

export function clearSessionCookie() {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return `${COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure}`;
}

export function clearVaultCookie() {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return `${VAULT_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure}`;
}

export { COOKIE_NAME, VAULT_COOKIE };
