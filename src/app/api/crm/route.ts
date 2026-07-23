import { NextRequest, NextResponse } from "next/server";
import { getCrmClient, type CrmLead } from "@/lib/integrations/crm";

export const runtime = "nodejs";

/**
 * CRM API — Backend only.
 * Frontend: /api/crm/*
 * Env 預留：CRM_PROVIDER / CRM_API_URL / CRM_API_KEY / CRM_PIPELINE_ID
 */

export async function GET() {
  return NextResponse.json({
    ok: true,
    interface: "CrmClient",
    endpoints: {
      upsertLead: "POST /api/crm/leads",
      getLead: "GET /api/crm/leads/:id",
      syncApplication: "POST /api/crm/applications/sync",
    },
    env: ["CRM_PROVIDER", "CRM_API_URL", "CRM_API_KEY", "CRM_PIPELINE_ID"],
    provider: process.env.CRM_PROVIDER || "stub",
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as CrmLead;
    if (!body.companyName?.trim()) {
      return NextResponse.json(
        { error: "companyName required" },
        { status: 400 },
      );
    }
    const record = await getCrmClient().upsertLead(body);
    return NextResponse.json({ ok: true, lead: record });
  } catch (err) {
    return NextResponse.json(
      {
        error: "CRM_UPSERT_FAILED",
        message: err instanceof Error ? err.message : "UNKNOWN",
      },
      { status: 500 },
    );
  }
}
