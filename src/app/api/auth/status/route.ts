import { NextResponse } from "next/server";
import { getAuthStorageMode } from "@/lib/auth";

export const runtime = "nodejs";

/** 前端用來顯示持久化警告 */
export async function GET() {
  const storage = getAuthStorageMode();
  const onVercel = Boolean(process.env.VERCEL);
  return NextResponse.json({
    ok: true,
    storage,
    durable: storage === "redis",
    onVercel,
    warning:
      storage !== "redis" && onVercel
        ? "尚未接 Redis／KV：同瀏覽器可註冊／登入（加密備援 cookie）；跨裝置或清 cookie 後建議設定 UPSTASH_REDIS_REST_* 與 AUTH_SECRET。"
        : null,
  });
}
