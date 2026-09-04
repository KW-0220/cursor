import { NextRequest, NextResponse } from "next/server";
import { requireAgentApiKey } from "@/lib/agent-api-auth";
import { listCustomers, getCustomer } from "@/lib/customer-registry";

export const runtime = "nodejs";

/** GET /api/agent/customers — 客戶登記列表／單筆（只讀） */
export async function GET(req: NextRequest) {
  const gate = requireAgentApiKey(req);
  if (!gate.ok) return gate.response;

  try {
    const id = req.nextUrl.searchParams.get("id")?.trim();
    const email = req.nextUrl.searchParams.get("email")?.trim().toLowerCase();

    if (id) {
      const customer = await getCustomer(id);
      if (!customer) {
        return NextResponse.json(
          { error: "NOT_FOUND", message: "找不到客戶" },
          { status: 404 },
        );
      }
      return NextResponse.json({ ok: true, customer });
    }

    let customers = await listCustomers();
    if (email) {
      customers = customers.filter(
        (c) => c.email.trim().toLowerCase() === email,
      );
    }

    const limit = Math.min(
      Number(req.nextUrl.searchParams.get("limit") || "100") || 100,
      500,
    );
    return NextResponse.json({
      ok: true,
      count: customers.length,
      customers: customers.slice(0, limit),
    });
  } catch (err) {
    return NextResponse.json(
      {
        error: "CUSTOMERS_FAILED",
        message: err instanceof Error ? err.message : "UNKNOWN",
      },
      { status: 500 },
    );
  }
}
