import { NextRequest, NextResponse } from "next/server";
import { listArchivedAnalyses } from "@/lib/analysis-archive-registry";
import { buildApplicationAiReportHtml } from "@/lib/application-ai-report-html";
import { getApplication } from "@/lib/applications-registry";
import { archiveMatchesCustomer } from "@/lib/customer-match";
import {
  documentKindLabel,
  listDocuments,
} from "@/lib/documents-registry";
import { requireAdminContext } from "@/lib/supabase/context";

export const runtime = "nodejs";

/** GET /api/admin/applications/[id]/report?print=1 — 案件 AI 分析報告 */
export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const gate = await requireAdminContext(req);
  if (gate.error || !gate.data) {
    return NextResponse.json(
      { error: gate.error?.message || "UNAUTHORIZED" },
      { status: "status" in gate ? gate.status : 401 },
    );
  }

  const { id } = await ctx.params;
  const appId = id.trim();
  if (!appId) {
    return NextResponse.json({ error: "MISSING_ID" }, { status: 400 });
  }

  const app = await getApplication(appId);
  if (!app) {
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  }

  const [docs, archives] = await Promise.all([
    listDocuments({ applicationId: appId }),
    listArchivedAnalyses().catch(() => []),
  ]);

  const matchCustomer = {
    id: app.customerId || "",
    email: app.email,
    companyNameZh: app.companyNameZh,
    applicantNameZh: app.applicantNameZh,
  };
  const linkedArchives = archives.filter((a) => {
    if (app.customerId && a.customerId === app.customerId) return true;
    if (!matchCustomer.id && !matchCustomer.companyNameZh && !matchCustomer.email)
      return false;
    return archiveMatchesCustomer(a, {
      id: app.customerId || `tmp-${app.id}`,
      email: app.email,
      companyNameZh: app.companyNameZh,
      applicantNameZh: app.applicantNameZh,
    });
  });

  // 合併申請內嵌文件
  const seen = new Set(docs.map((d) => d.id));
  const embedded = (app.documents ?? []).filter((d) => !seen.has(d.id));

  const autoPrint = req.nextUrl.searchParams.get("print") === "1";
  const html = buildApplicationAiReportHtml(
    {
      application: {
        id: app.id,
        status: app.status,
        failureReason: app.failureReason,
        amount: app.amount,
        purpose: app.purpose,
        loanType: app.loanType,
        companyNameZh: app.companyNameZh,
        applicantNameZh: app.applicantNameZh,
        email: app.email,
        phone: app.phone,
        customerId: app.customerId,
        aiAnalysis: app.aiAnalysis ?? null,
        createdAt: app.createdAt,
        updatedAt: app.updatedAt,
      },
      documents: [
        ...docs.map((d) => ({
          id: d.id,
          kindLabel: documentKindLabel(d.kind),
          fileName: d.fileName,
          slot: d.slot,
          createdAt: d.createdAt,
        })),
        ...embedded.map((d) => ({
          id: d.id,
          kindLabel: documentKindLabel(d.kind),
          fileName: d.fileName,
          slot: d.slot,
          createdAt: app.createdAt,
        })),
      ],
      archives: linkedArchives.map((a) => ({
        id: a.id,
        title: a.title,
        fileName: a.fileName,
        docKind: a.docKind,
        summary: a.summary,
        overall: a.overall,
        archivedAt: a.archivedAt,
      })),
    },
    { autoPrint },
  );

  const safeName = appId.replace(/[^\w.\-]+/g, "_");
  return new NextResponse(html, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "private, no-store",
      "Content-Disposition": autoPrint
        ? `inline; filename*=UTF-8''${encodeURIComponent(`${safeName}-AI分析報告.html`)}`
        : `attachment; filename*=UTF-8''${encodeURIComponent(`${safeName}-AI分析報告.html`)}`,
    },
  });
}
