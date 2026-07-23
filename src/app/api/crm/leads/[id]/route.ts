import { NextResponse } from "next/server";
import { getCrmClient } from "@/lib/integrations/crm";

export const runtime = "nodejs";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await ctx.params;
    const lead = await getCrmClient().getLead(id);
    if (!lead) {
      return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
    }
    return NextResponse.json({ ok: true, lead });
  } catch (err) {
    return NextResponse.json(
      {
        error: "CRM_LEAD_GET_FAILED",
        message: err instanceof Error ? err.message : "UNKNOWN",
      },
      { status: 500 },
    );
  }
}
