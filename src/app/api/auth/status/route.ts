import { NextResponse } from "next/server";
import { getAuthStorageMode } from "@/lib/auth";
import { getCustomerStorageMode } from "@/lib/customer-registry";
import { isMysqlConfigured, pingMysql } from "@/lib/db/mysql";
import { twilioConfigured } from "@/lib/twilio";

export const runtime = "nodejs";

/** 前端用來顯示持久化／OTP 狀態 */
export async function GET() {
  const storage = getAuthStorageMode();
  const customerStorage = getCustomerStorageMode();
  const onVercel = Boolean(process.env.VERCEL);
  const sms = twilioConfigured();
  const mysqlConfigured = isMysqlConfigured();
  const mysql = mysqlConfigured ? await pingMysql() : null;

  return NextResponse.json({
    ok: true,
    storage,
    customerStorage,
    durable: storage === "mysql" || storage === "redis",
    mysql: mysqlConfigured
      ? { configured: true, ...mysql }
      : { configured: false },
    onVercel,
    twilio: sms,
    warning:
      !mysqlConfigured && storage !== "redis" && onVercel
        ? "尚未接 MySQL／Redis：同瀏覽器可註冊／登入（加密備援 cookie）；正式環境請設定 MYSQL_*（或 DATABASE_URL）與 AUTH_SECRET。"
        : mysqlConfigured && mysql && !mysql.ok
          ? `MySQL 已設定但連線失敗：${mysql.error}`
          : null,
  });
}
