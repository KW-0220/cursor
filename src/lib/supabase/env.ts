/** Supabase 公開設定（publishable；可安全暴露於 client） */

const FALLBACK_URL = "https://szftkaipvrdvzgcurofa.supabase.co";
const FALLBACK_PUBLISHABLE_KEY =
  "sb_publishable_R3J_r9Bztlegc2L-Wgl7-Q_dW4L_BqT";

export function getSupabaseUrl() {
  return (
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ||
    process.env.SUPABASE_URL?.trim() ||
    FALLBACK_URL
  );
}

export function getSupabasePublishableKey() {
  return (
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ||
    process.env.SUPABASE_ANON_KEY?.trim() ||
    FALLBACK_PUBLISHABLE_KEY
  );
}

export function isSupabaseConfigured() {
  return Boolean(getSupabaseUrl() && getSupabasePublishableKey());
}
