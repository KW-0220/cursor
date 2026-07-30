import "server-only";
import { createDecipheriv, createHash } from "crypto";

/**
 * Supabase env（server）
 * 優先序：process.env → sealed fallback（Vercel 未設 Dashboard env 時）
 *
 * SECRET 永唔放 NEXT_PUBLIC_*／browser bundle。
 */

type SealedSupabase = {
  url: string;
  publishableKey: string;
  secretKey: string;
  jwksUrl: string;
};

const FALLBACK_URL = "https://szftkaipvrdvzgcurofa.supabase.co";
const FALLBACK_PUBLISHABLE_KEY =
  "sb_publishable_R3J_r9Bztlegc2L-Wgl7-Q_dW4L_BqT";
const FALLBACK_JWKS_URL =
  "https://szftkaipvrdvzgcurofa.supabase.co/auth/v1/.well-known/jwks.json";

/** AES-GCM sealed（含 secret；正式仍建議 Vercel 設 SUPABASE_SECRET_KEY） */
const SEALED =
  "omZSfrXdRS-a1UYFHlLRHKNq_PrrHI1C-J6ZwyaoG72J5OXkCxGRqqIwRMQHq0JP0jtHiEBb9bpShgu8bcBC6eMwbq7OY589WbNzacLocDY4brCQx_eP3jh_gWc4LmpUxg2Xk12Ho6T8QLfzDEabZmYa69VxuRVMMBE3CiYf9cvBiAxhlk36Jqdvv4TU6tO3XxPyKJT-vqR5ug8lkKtmNxXlZv3I7AKdNXZyqQTrtGx0MHwtJCzqkUNuIkPsQR1x77CzN-4RdNhP_uFR1nZKuW-Cp3YbgVkuo-DMF9qOqMsesS24ta6VxMKd5k-ryb2Q8TFvAbWrCqcmoaoZRSoEhhAUQvslQrG3qR2jIM8LqZo1Yj6TnoIMQMBgWA";

function unwrapSealed(): SealedSupabase | null {
  try {
    const key = createHash("sha256").update("slf-supabase-wrap-v1").digest();
    const buf = Buffer.from(SEALED, "base64url");
    const iv = buf.subarray(0, 12);
    const tag = buf.subarray(12, 28);
    const data = buf.subarray(28);
    const decipher = createDecipheriv("aes-256-gcm", key, iv);
    decipher.setAuthTag(tag);
    const json = Buffer.concat([
      decipher.update(data),
      decipher.final(),
    ]).toString("utf8");
    return JSON.parse(json) as SealedSupabase;
  } catch {
    return null;
  }
}

function sealed() {
  return unwrapSealed();
}

export function getSupabaseUrl() {
  return (
    process.env.SUPABASE_URL?.trim() ||
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ||
    sealed()?.url ||
    FALLBACK_URL
  );
}

export function getSupabasePublishableKey() {
  return (
    process.env.SUPABASE_PUBLISHABLE_KEY?.trim() ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ||
    process.env.SUPABASE_ANON_KEY?.trim() ||
    sealed()?.publishableKey ||
    FALLBACK_PUBLISHABLE_KEY
  );
}

/** Backend only — bypasses RLS。永唔暴露去 client。 */
export function getSupabaseSecretKey(): string | null {
  if (
    process.env.NEXT_PUBLIC_SUPABASE_SECRET_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY
  ) {
    console.warn(
      "[supabase] NEXT_PUBLIC_* secret/service key 被忽略——請用 Backend SUPABASE_SECRET_KEY",
    );
  }
  return (
    process.env.SUPABASE_SECRET_KEY?.trim() ||
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ||
    sealed()?.secretKey ||
    null
  );
}

export function getSupabaseJwksUrl() {
  return (
    process.env.SUPABASE_JWKS_URL?.trim() ||
    sealed()?.jwksUrl ||
    FALLBACK_JWKS_URL
  );
}

export function isSupabaseConfigured() {
  return Boolean(getSupabaseUrl() && getSupabasePublishableKey());
}

export function isSupabaseAdminConfigured() {
  return Boolean(getSupabaseUrl() && getSupabaseSecretKey());
}
