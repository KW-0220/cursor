import { NextResponse } from "next/server";
import { getAuthStorageMode } from "@/lib/auth";
import { twilioConfigured } from "@/lib/twilio";

export const runtime = "nodejs";

/** 前端用來顯示持久化／OTP 狀態 */
export async function GET() {
  const storage = getAuthStorageMode();
  const onVercel = Boolean(process.env.VERCEL);
  const sms = twilioConfigured();
  const durable = storage === "supabase" || storage === "redis";
  return NextResponse.json({
    ok: true,
    storage,
    durable,
    onVercel,
    twilio: sms,
    warning:
      !durable && onVercel
        ? "尚未接 Supabase／Redis：同瀏覽器可註冊／登入（加密備援 cookie）；建議設定 SUPABASE_SECRET_KEY 或 UPSTASH_REDIS_REST_*。"
        : null,
  });
}
