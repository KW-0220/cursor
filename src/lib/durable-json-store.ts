import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSupabaseSecretKey, getSupabaseUrl } from "@/lib/supabase/env";

const BUCKET = "app-data";

export function durableJsonStoreReady() {
  return Boolean(getSupabaseUrl() && getSupabaseSecretKey());
}

/** 讀取 Supabase Storage JSON（跨 Vercel instance 共享） */
export async function durableJsonGet<T>(path: string): Promise<T | null> {
  if (!durableJsonStoreReady()) return null;
  try {
    const db = createAdminClient();
    const { data, error } = await db.storage.from(BUCKET).download(path);
    if (error || !data) return null;
    const text = await data.text();
    if (!text.trim()) return null;
    return JSON.parse(text) as T;
  } catch (err) {
    console.error("[durable-json] get failed", path, err);
    return null;
  }
}

/** 寫入／覆蓋 Supabase Storage JSON */
export async function durableJsonSet(path: string, value: unknown) {
  if (!durableJsonStoreReady()) return false;
  try {
    const db = createAdminClient();
    const body = Buffer.from(JSON.stringify(value), "utf8");
    const { error } = await db.storage.from(BUCKET).upload(path, body, {
      contentType: "application/json",
      upsert: true,
    });
    if (error) {
      console.error("[durable-json] set failed", path, error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.error("[durable-json] set error", path, err);
    return false;
  }
}
