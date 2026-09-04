import { NextRequest, NextResponse } from "next/server";
import { requireAgentApiKey } from "@/lib/agent-api-auth";
import { listArchivedAnalyses } from "@/lib/analysis-archive-registry";
import { listApplications } from "@/lib/applications-registry";
import { listApplicantUsers } from "@/lib/auth";
import { listCustomers } from "@/lib/customer-registry";
import { listDocuments } from "@/lib/documents-registry";
import { listSupplements } from "@/lib/supplements-registry";

export const runtime = "nodejs";

/** GET /api/agent/overview — 後台數據摘要（只讀） */
export async function GET(req: NextRequest) {
  const gate = requireAgentApiKey(req);
  if (!gate.ok) return gate.response;

  try {
    const [customers, applications, documents, supplements, archive, users] =
      await Promise.all([
        listCustomers(),
        listApplications(),
        listDocuments(),
        listSupplements(),
        listArchivedAnalyses(),
        listApplicantUsers(),
      ]);

    const recentApps = [...applications]
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
      .slice(0, 10)
      .map((a) => ({
        id: a.id,
        email: a.email,
        companyNameZh: a.companyNameZh,
        applicantNameZh: a.applicantNameZh,
        status: a.status,
        amount: a.amount,
        purpose: a.purpose,
        loanType: a.loanType,
        updatedAt: a.updatedAt,
        createdAt: a.createdAt,
      }));

    const recentCustomers = [...customers]
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
      .slice(0, 10)
      .map((c) => ({
        id: c.id,
        email: c.email,
        applicantNameZh: c.applicantNameZh,
        companyNameZh: c.companyNameZh,
        source: c.source,
        updatedAt: c.updatedAt,
        createdAt: c.createdAt,
      }));

    return NextResponse.json({
      ok: true,
      generatedAt: new Date().toISOString(),
      counts: {
        customers: customers.length,
        applications: applications.length,
        documents: documents.length,
        supplements: supplements.length,
        analysisArchive: archive.length,
        applicantUsers: users.length,
      },
      recentApplications: recentApps,
      recentCustomers,
    });
  } catch (err) {
    return NextResponse.json(
      {
        error: "OVERVIEW_FAILED",
        message: err instanceof Error ? err.message : "UNKNOWN",
      },
      { status: 500 },
    );
  }
}
