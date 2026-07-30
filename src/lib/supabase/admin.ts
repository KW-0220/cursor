import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import {
  getSupabaseSecretKey,
  getSupabaseUrl,
} from "@/lib/supabase/env";

/**
 * Service / secret client（bypass RLS）。
 * 只喺 Route Handler／Server Action／後台用；永唔 import 入 client component。
 */
export function createAdminClient() {
  const url = getSupabaseUrl();
  const secret = getSupabaseSecretKey();
  if (!secret) {
    throw new Error("MISSING_SUPABASE_SECRET_KEY");
  }
  return createSupabaseClient(url, secret, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
