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
        ? "正式環境尚未接 Redis／KV：帳戶可能在重啟後遺失。請在 Vercel 設定 UPSTASH_REDIS_REST_* 或 KV_REST_API_* 與 AUTH_SECRET。"
        : null,
  });
}
