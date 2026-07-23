import { NextRequest, NextResponse } from "next/server";
import { getCrmClient, type CrmLead } from "@/lib/integrations/crm";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as CrmLead;
    if (!body.companyName?.trim()) {
      return NextResponse.json(
        { error: "companyName required" },
        { status: 400 },
      );
    }
    const lead = await getCrmClient().upsertLead(body);
    return NextResponse.json({ ok: true, lead });
  } catch (err) {
    return NextResponse.json(
      {
        error: "CRM_LEAD_UPSERT_FAILED",
        message: err instanceof Error ? err.message : "UNKNOWN",
      },
      { status: 500 },
    );
  }
}
