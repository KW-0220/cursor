import { NextResponse } from "next/server";
import { agentApiConfigured } from "@/lib/agent-api-auth";

export const runtime = "nodejs";

/**
 * GET /api/agent — Agent 只讀 API 說明（唔需要 key）
 */
export async function GET() {
  return NextResponse.json({
    ok: true,
    name: "SME LoanFlow Agent Read API",
    mode: "read_only",
    configured: agentApiConfigured(),
    auth: {
      headers: [
        "Authorization: Bearer <AGENT_API_KEY>",
        "X-Agent-Api-Key: <AGENT_API_KEY>",
      ],
      env: ["AGENT_API_KEY", "ADMIN_AGENT_API_KEY"],
    },
    endpoints: {
      overview: "GET /api/agent/overview",
      customers: "GET /api/agent/customers",
      applications: "GET /api/agent/applications?id=optional",
      documents: "GET /api/agent/documents?applicationId=&customerId=",
      supplements: "GET /api/agent/supplements?status=",
      analysisArchive: "GET /api/agent/analysis-archive?id=",
      users: "GET /api/agent/users",
    },
  });
}
