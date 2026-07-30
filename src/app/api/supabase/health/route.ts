import { NextResponse } from "next/server";
import {
  getSupabasePublishableKey,
  getSupabaseUrl,
  isSupabaseConfigured,
} from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

/** 確認 env + 可建立 client（唔暴露完整 key） */
export async function GET() {
  const url = getSupabaseUrl();
  const key = getSupabasePublishableKey();
  const configured = isSupabaseConfigured();

  let authOk = false;
  let detail: string | null = null;
  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.getSession();
    authOk = !error;
    if (error) detail = error.message;
  } catch (err) {
    detail = err instanceof Error ? err.message : "UNKNOWN";
  }

  return NextResponse.json({
    ok: configured && authOk,
    configured,
    url,
    publishableKeyPrefix: key.slice(0, 18) + "…",
    authOk,
    detail,
  });
}
