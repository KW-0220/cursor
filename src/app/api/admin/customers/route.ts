import { NextRequest, NextResponse } from "next/server";
import {
  CustomerRegistrationSchema,
  getCustomerStorageMode,
  listCustomers,
  upsertCustomer,
} from "@/lib/customer-registry";
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
