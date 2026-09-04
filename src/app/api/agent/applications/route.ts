import { NextRequest, NextResponse } from "next/server";
import { requireAgentApiKey } from "@/lib/agent-api-auth";
import {
  getApplication,
  listApplications,
} from "@/lib/applications-registry";

export const runtime = "nodejs";

/** GET /api/agent/applications — 申請列表／單筆（只讀） */
export async function GET(req: NextRequest) {
  const gate = requireAgentApiKey(req);
  if (!gate.ok) return gate.response;

  try {
    const id = req.nextUrl.searchParams.get("id")?.trim();
    if (id) {
      const application = await getApplication(id);
      if (!application) {
        return NextResponse.json(
          { error: "NOT_FOUND", message: "找不到申請" },
          { status: 404 },
        );
      }
      return NextResponse.json({ ok: true, application });
    }

    let applications = await listApplications();
    const email = req.nextUrl.searchParams.get("email")?.trim().toLowerCase();
    const status = req.nextUrl.searchParams.get("status")?.trim();
    if (email) {
      applications = applications.filter(
        (a) => a.email?.trim().toLowerCase() === email,
      );
    }
    if (status) {
      applications = applications.filter((a) => a.status === status);
    }

    const limit = Math.min(
      Number(req.nextUrl.searchParams.get("limit") || "100") || 100,
      500,
    );
    return NextResponse.json({
      ok: true,
      count: applications.length,
      applications: applications.slice(0, limit),
    });
  } catch (err) {
    return NextResponse.json(
      {
        error: "APPLICATIONS_FAILED",
        message: err instanceof Error ? err.message : "UNKNOWN",
      },
      { status: 500 },
    );
  }
}
