import { NextRequest, NextResponse } from "next/server";
import {
  CustomerRegistrationSchema,
  getCustomerStorageMode,
  listCustomers,
  upsertCustomer,
} from "@/lib/customer-registry";

export const runtime = "nodejs";

/** GET /api/admin/customers — 客戶登記列表 */
export async function GET() {
  const customers = await listCustomers();
  const storage = getCustomerStorageMode();
  return NextResponse.json({
    ok: true,
    count: customers.length,
    customers,
    storage,
    storageNote:
      storage === "mysql"
        ? "MySQL（users／customers 表）"
        : "JSON file data/customers.json（本機持久）；Vercel 實例可能為記憶體，正式環境請設定 MYSQL_* 或 DATABASE_URL",
  });
}

/** POST /api/admin/customers — 新增／更新客戶登記 */
export async function POST(req: NextRequest) {
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
    const customer = await upsertCustomer(parsed.data);
    return NextResponse.json({ ok: true, customer });
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
