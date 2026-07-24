import { NextResponse } from "next/server";
import { getAuthStorageMode } from "@/lib/auth";
import { twilioConfigured } from "@/lib/twilio";

export const runtime = "nodejs";

/** 前端用來顯示持久化／OTP 狀態 */
export async function GET() {
  const storage = getAuthStorageMode();
  const onVercel = Boolean(process.env.VERCEL);
  const sms = twilioConfigured();
  return NextResponse.json({
    ok: true,
    storage,
    durable: storage === "redis",
    onVercel,
    twilio: sms,
    warning:
      storage !== "redis" && onVercel
        ? "尚未接 Redis／KV：同瀏覽器可註冊／登入（加密備援 cookie）；跨裝置或清 cookie 後建議設定 UPSTASH_REDIS_REST_* 與 AUTH_SECRET。"
        : null,
  });
}
