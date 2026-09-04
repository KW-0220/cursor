import { NextRequest, NextResponse } from "next/server";
import { requireAgentApiKey } from "@/lib/agent-api-auth";
import { listApplicantUsers } from "@/lib/auth";

export const runtime = "nodejs";

/** GET /api/agent/users — 申請人帳戶（只讀；無 passwordHash） */
export async function GET(req: NextRequest) {
  const gate = requireAgentApiKey(req);
  if (!gate.ok) return gate.response;

  try {
    const users = await listApplicantUsers();
    const email = req.nextUrl.searchParams.get("email")?.trim().toLowerCase();
    const filtered = email
      ? users.filter((u) => u.email.toLowerCase() === email)
      : users;
    const limit = Math.min(
      Number(req.nextUrl.searchParams.get("limit") || "200") || 200,
      1000,
    );
    return NextResponse.json({
      ok: true,
      count: filtered.length,
      users: filtered.slice(0, limit),
    });
  } catch (err) {
    return NextResponse.json(
      {
        error: "USERS_FAILED",
        message: err instanceof Error ? err.message : "UNKNOWN",
      },
      { status: 500 },
    );
  }
}
