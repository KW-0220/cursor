import { NextRequest, NextResponse } from "next/server";
import {
  getCrmClient,
  type CrmApplicationSyncInput,
} from "@/lib/integrations/crm";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as CrmApplicationSyncInput;
    if (!body.applicationId?.trim() || !body.companyName?.trim()) {
      return NextResponse.json(
        { error: "applicationId and companyName required" },
        { status: 400 },
      );
    }
    const result = await getCrmClient().syncApplication(body);
    return NextResponse.json({ ok: true, sync: result });
  } catch (err) {
    return NextResponse.json(
      {
        error: "CRM_SYNC_FAILED",
        message: err instanceof Error ? err.message : "UNKNOWN",
      },
      { status: 500 },
    );
  }
}
