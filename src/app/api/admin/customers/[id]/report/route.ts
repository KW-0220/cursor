import { NextRequest, NextResponse } from "next/server";
import { listArchivedAnalyses } from "@/lib/analysis-archive-registry";
import { listApplications } from "@/lib/applications-registry";
import { buildCustomerReportHtml } from "@/lib/customer-report-html";
import {
  applicationMatchesCustomer,
  archiveMatchesCustomer,
} from "@/lib/customer-match";
import { getCustomer, listCustomers } from "@/lib/customer-registry";
import {
  documentKindLabel,
  listDocuments,
} from "@/lib/documents-registry";
import { requireAdminContext } from "@/lib/supabase/context";
import { supabaseListCustomers } from "@/lib/supabase/customers";

export const runtime = "nodejs";

/** GET /api/admin/customers/[id]/report?print=1 — 分析報告（瀏覽器另存 PDF） */
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
  const cid = id.trim();
  if (!cid) {
    return NextResponse.json({ error: "MISSING_ID" }, { status: 400 });
  }

  let customer = await getCustomer(cid);
  if (!customer) {
    try {
      const all = await supabaseListCustomers(gate.data.supabaseAdmin);
      customer = all.find((c) => c.id === cid) ?? null;
    } catch {
      const all = await listCustomers();
      customer = all.find((c) => c.id === cid) ?? null;
    }
  }
  if (!customer) {
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  }

  const [apps, docs, archives] = await Promise.all([
    listApplications(),
    listDocuments(),
    listArchivedAnalyses().catch(() => []),
  ]);

  const linkedApps = apps.filter((a) =>
    applicationMatchesCustomer(a, customer!),
  );
  const appIds = new Set(linkedApps.map((a) => a.id));
  const linkedArchives = archives.filter((a) =>
    archiveMatchesCustomer(a, customer!),
  );
  const linkedDocs = docs.filter(
    (d) => d.customerId === customer!.id || appIds.has(d.applicationId),
  );

  const autoPrint = req.nextUrl.searchParams.get("print") === "1";
  const html = buildCustomerReportHtml(
    {
      customer,
      applications: linkedApps.map((a) => ({
        id: a.id,
        status: a.status,
        failureReason: a.failureReason,
        amount: a.amount,
        purpose: a.purpose,
        loanType: a.loanType,
        aiAnalysis: a.aiAnalysis ?? null,
        updatedAt: a.updatedAt,
        createdAt: a.createdAt,
      })),
      analyses: linkedArchives.map((a) => ({
        id: a.id,
        title: a.title,
        fileName: a.fileName,
        docKind: a.docKind,
        companyName: a.companyName,
        summary: a.summary,
        overall: a.overall,
        archivedAt: a.archivedAt,
        payload: a.payload,
      })),
      documents: [
        ...linkedDocs.map((d) => ({
          id: d.id,
          kindLabel: documentKindLabel(d.kind),
          fileName: d.fileName,
          slot: d.slot,
          applicationId: d.applicationId,
          createdAt: d.createdAt,
          source: "registry",
        })),
        ...linkedArchives.map((a) => ({
          id: a.id,
          kindLabel: `AI 分析 · ${a.docKind}`,
          fileName: a.fileName || a.title,
          slot: a.docKind,
          applicationId: a.customerId || "",
          createdAt: a.archivedAt,
          source: "archive",
        })),
      ],
    },
    { autoPrint },
  );

  const safeName = (customer.companyNameZh || customer.id)
    .replace(/[^\w.\-()\u4e00-\u9fff]+/g, "_")
    .slice(0, 60);

  return new NextResponse(html, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "private, no-store",
      "Content-Disposition": autoPrint
        ? `inline; filename*=UTF-8''${encodeURIComponent(`${safeName}-分析報告.html`)}`
        : `attachment; filename*=UTF-8''${encodeURIComponent(`${safeName}-分析報告.html`)}`,
    },
  });
}
