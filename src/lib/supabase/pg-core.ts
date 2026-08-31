import "server-only";
import { getSupabaseSecretKey, getSupabaseUrl } from "@/lib/supabase/env";

/** Server 端可用 secret client 寫 Postgres 核心表 */
export function supabasePgCoreReady() {
  return Boolean(getSupabaseUrl() && getSupabaseSecretKey());
}
