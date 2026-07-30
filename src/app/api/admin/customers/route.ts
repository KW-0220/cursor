import { NextRequest, NextResponse } from "next/server";
import { clearApplicantUsers } from "@/lib/auth";
import {
  CustomerRegistrationSchema,
  clearAllCustomers,
  getCustomerStorageMode,
  listCustomers,
  upsertCustomer,
} from "@/lib/customer-registry";
import { mysqlClearApplicantUsers } from "@/lib/db/auth-mysql";
import { isMysqlConfigured } from "@/lib/db/mysql";
import { clearSupabaseApplicantUsers } from "@/lib/supabase/admin";
import { requireAdminContext } from "@/lib/supabase/context";
import {
  supabaseListCustomers,
  supabaseUpsertCustomer,
} from "@/lib/supabase/customers";

export const runtime = "nodejs";

/** GET /api/admin/customers — 需 Supabase admin session（@supabase/server） */
export async function GET(req: NextRequest) {
  const gate = await requireAdminContext(req);
  if (gate.error || !gate.data) {
    return NextResponse.json(
      { error: gate.error?.message || "UNAUTHORIZED" },
      { status: "status" in gate ? gate.status : 401 },
    );
  }

  const storage = getCustomerStorageMode();
  try {
    const customers = await supabaseListCustomers(gate.data.supabaseAdmin);
    return NextResponse.json({
      ok: true,
      count: customers.length,
      customers,
      storage,
      durable: true,
      authMode: gate.data.authMode,
      backend: "supabase",
      collectFrom: "POST /api/customers",
      storageNote: "Supabase Postgres（@supabase/server + RLS／secret）",
    });
  } catch (err) {
    // table / network 問題時回退舊 registry（仍要已通過 admin gate）
    const customers = await listCustomers();
    return NextResponse.json({
      ok: true,
      count: customers.length,
      customers,
      storage,
      durable: storage === "supabase" || storage === "mysql" || storage === "redis",
      authMode: gate.data.authMode,
      backend: "fallback",
      warning: err instanceof Error ? err.message : "SUPABASE_LIST_FAILED",
    });
  }
}

/**
 * DELETE /api/admin/customers
 * 清空客戶登記資料庫；預設同時清空申請人帳戶（逼重新註冊）。
 * Query: ?users=0 只清客戶、保留登入帳戶
 */
export async function DELETE(req: NextRequest) {
  const gate = await requireAdminContext(req);
  if (gate.error || !gate.data) {
    return NextResponse.json(
      { error: gate.error?.message || "UNAUTHORIZED" },
      { status: "status" in gate ? gate.status : 401 },
    );
  }

  const wipeUsers =
    req.nextUrl.searchParams.get("users") !== "0" &&
    req.nextUrl.searchParams.get("users") !== "false";

  try {
    const customers = await clearAllCustomers();

    let users: {
      legacyRemoved: number;
      mysqlRemoved: number;
      supabaseRemoved: number;
      keptAdmin: boolean;
    } | null = null;

    if (wipeUsers) {
      const legacy = await clearApplicantUsers();
      let mysqlRemoved = 0;
      if (isMysqlConfigured()) {
        try {
          mysqlRemoved = await mysqlClearApplicantUsers();
        } catch (err) {
          console.error("[customers DELETE] mysql users clear", err);
        }
      }
      const supabase = await clearSupabaseApplicantUsers();
      users = {
        legacyRemoved: legacy.removed,
        mysqlRemoved,
        supabaseRemoved: supabase.removed,
        keptAdmin: true,
      };
    }

    return NextResponse.json({
      ok: true,
      wiped: true,
      customers,
      users,
      message: wipeUsers
        ? "已清空客戶登記；申請人須重新註冊（管理員保留）"
        : "已清空客戶登記（登入帳戶未動）",
    });
  } catch (err) {
    return NextResponse.json(
      {
        error: "CLEAR_FAILED",
        message: err instanceof Error ? err.message : "UNKNOWN",
      },
      { status: 500 },
    );
  }
}

/** POST /api/admin/customers — 需 Supabase admin session */
export async function POST(req: NextRequest) {
  const gate = await requireAdminContext(req);
  if (gate.error || !gate.data) {
    return NextResponse.json(
      { error: gate.error?.message || "UNAUTHORIZED" },
      { status: "status" in gate ? gate.status : 401 },
    );
  }

  try {
    const body = await req.json();
    const parsed = CustomerRegistrationSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "INVALID_BODY",
          details: parsed.error.flatten(),
        },
        { status: 400 },
      );
    }
    const customer = await supabaseUpsertCustomer(
      parsed.data,
      gate.data.supabaseAdmin,
    ).catch(() => upsertCustomer(parsed.data));
    return NextResponse.json({
      ok: true,
      customer,
      storage: getCustomerStorageMode(),
      authMode: gate.data.authMode,
      backend: "supabase",
    });
  } catch (err) {
    return NextResponse.json(
      {
        error: "UPSERT_FAILED",
        message: err instanceof Error ? err.message : "UNKNOWN",
      },
      { status: 500 },
    );
  }
}
