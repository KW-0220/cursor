"use client";

import { createBrowserClient } from "@supabase/ssr";

/** Browser 只用 NEXT_PUBLIC_*（publishable） */
export function createClient() {
  const url =
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ||
    "https://szftkaipvrdvzgcurofa.supabase.co";
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() ||
    "sb_publishable_R3J_r9Bztlegc2L-Wgl7-Q_dW4L_BqT";
  return createBrowserClient(url, key);
}
