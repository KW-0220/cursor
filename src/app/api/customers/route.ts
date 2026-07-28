import { NextRequest, NextResponse } from "next/server";
import {
  CustomerRegistrationSchema,
  getCustomerStorageMode,
  upsertCustomer,
} from "@/lib/customer-registry";

export const runtime = "nodejs";

/**
 * POST /api/customers
 * 前端註冊／申請收集入口（寫入客戶登記資料庫）
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = CustomerRegistrationSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "INVALID_BODY",
          message: "客戶資料欄位不完整或格式不符",
          details: parsed.error.flatten(),
        },
        { status: 400 },
      );
    }
    const customer = await upsertCustomer({
      ...parsed.data,
      source: parsed.data.source || "register",
    });
    return NextResponse.json({
      ok: true,
      customer,
      storage: getCustomerStorageMode(),
    });
  } catch (err) {
    console.error("[customers POST]", err);
    return NextResponse.json(
      {
        error: "UPSERT_FAILED",
        message: err instanceof Error ? err.message : "UNKNOWN",
      },
      { status: 500 },
    );
  }
}

/** GET：健康／儲存模式（唔回敏感列表；列表走 /api/admin/customers） */
export async function GET() {
  return NextResponse.json({
    ok: true,
    storage: getCustomerStorageMode(),
    collect: "POST /api/customers",
    adminList: "GET /api/admin/customers",
  });
}
