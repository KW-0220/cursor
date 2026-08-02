import { NextRequest, NextResponse } from "next/server";
import { listApplications } from "@/lib/applications-registry";
import {
  documentKindLabel,
  getDocument,
  listDocuments,
  readDocumentBytes,
} from "@/lib/documents-registry";
import { requireAdminContext } from "@/lib/supabase/context";

export const runtime = "nodejs";

function isPreviewable(mimeType: string, fileName: string) {
  const mime = (mimeType || "").toLowerCase();
  const name = (fileName || "").toLowerCase();
  if (mime.startsWith("image/")) return true;
  if (mime === "application/pdf" || name.endsWith(".pdf")) return true;
  if (mime.startsWith("text/")) return true;
  return false;
}

/** GET /api/admin/documents
 *  - ?id=DOC… [&inline=1]：下載／預覽單一檔
 *  - ?grouped=1：按申請編號分組（含申請 metadata）
 *  - ?customerId=&applicationId=：列表
 */
export async function GET(req: NextRequest) {
  const gate = await requireAdminContext(req);
  if (gate.error || !gate.data) {
    return NextResponse.json(
      { error: gate.error?.message || "UNAUTHORIZED" },
      { status: "status" in gate ? gate.status : 401 },
    );
  }

  const id = req.nextUrl.searchParams.get("id");
  if (id) {
    const doc = await getDocument(id);
    if (!doc) {
      return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
    }
    const bytes = await readDocumentBytes(doc);
    if (!bytes) {
      return NextResponse.json(
        { error: "FILE_MISSING", message: "檔案內容找不到" },
        { status: 404 },
      );
    }
    const inline =
      req.nextUrl.searchParams.get("inline") === "1" ||
      req.nextUrl.searchParams.get("disposition") === "inline";
    const disposition = inline ? "inline" : "attachment";
    return new NextResponse(new Uint8Array(bytes), {
      status: 200,
      headers: {
        "Content-Type": doc.mimeType || "application/octet-stream",
        "Content-Disposition": `${disposition}; filename*=UTF-8''${encodeURIComponent(doc.fileName)}`,
        "Content-Length": String(bytes.length),
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  }

  if (req.nextUrl.searchParams.get("grouped") === "1") {
    const [docs, apps] = await Promise.all([
      listDocuments(),
      listApplications(),
    ]);
    const appById = new Map(apps.map((a) => [a.id, a]));

    type DocRow = {
      id: string;
      kind: string;
      kindLabel: string;
      slot: string;
      fileName: string;
      mimeType: string;
      size: number;
      customerId: string | null;
      applicationId: string;
      createdAt: string;
      storage: string;
      downloadUrl: string;
      previewUrl: string;
      canPreview: boolean;
      source: "registry" | "application";
    };

    const byApp = new Map<string, DocRow[]>();

    for (const d of docs) {
      const appId = d.applicationId || "UNASSIGNED";
      const list = byApp.get(appId) ?? [];
      const canPreview = isPreviewable(d.mimeType, d.fileName);
      list.push({
        id: d.id,
        kind: d.kind,
        kindLabel: documentKindLabel(d.kind),
        slot: d.slot,
        fileName: d.fileName,
        mimeType: d.mimeType,
        size: d.size,
        customerId: d.customerId,
        applicationId: d.applicationId,
        createdAt: d.createdAt,
        storage: d.storage,
        downloadUrl: `/api/admin/documents?id=${encodeURIComponent(d.id)}`,
        previewUrl: `/api/admin/documents?id=${encodeURIComponent(d.id)}&inline=1`,
        canPreview,
        source: "registry",
      });
      byApp.set(appId, list);
    }

    // 申請內嵌 documents（registry 可能未同步）
    for (const app of apps) {
      const embedded = app.documents ?? [];
      if (!embedded.length) continue;
      const list = byApp.get(app.id) ?? [];
      const seen = new Set(list.map((d) => d.id));
      for (const d of embedded) {
        if (seen.has(d.id)) continue;
        const mime = d.mimeType || "application/octet-stream";
        const canPreview = isPreviewable(mime, d.fileName);
        list.push({
          id: d.id,
          kind: d.kind,
          kindLabel: documentKindLabel(d.kind),
          slot: d.slot,
          fileName: d.fileName,
          mimeType: mime,
          size: d.size,
          customerId: app.customerId ?? null,
          applicationId: app.id,
          createdAt: app.createdAt,
          storage: "unknown",
          downloadUrl: `/api/admin/documents?id=${encodeURIComponent(d.id)}`,
          previewUrl: `/api/admin/documents?id=${encodeURIComponent(d.id)}&inline=1`,
          canPreview,
          source: "application",
        });
        seen.add(d.id);
      }
      byApp.set(app.id, list);
    }

    const groups = [...byApp.entries()]
      .map(([applicationId, documents]) => {
        const app = appById.get(applicationId);
        documents.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
        return {
          applicationId,
          companyNameZh: app?.companyNameZh ?? null,
          applicantNameZh: app?.applicantNameZh ?? null,
          email: app?.email ?? null,
          customerId: app?.customerId ?? null,
          status: app?.status ?? null,
          amount: app?.amount ?? null,
          purpose: app?.purpose ?? null,
          updatedAt: app?.updatedAt ?? documents[0]?.createdAt ?? null,
          documentCount: documents.length,
          documents,
        };
      })
      .sort((a, b) =>
        String(b.updatedAt || "").localeCompare(String(a.updatedAt || "")),
      );

    return NextResponse.json({
      ok: true,
      count: groups.reduce((n, g) => n + g.documentCount, 0),
      groupCount: groups.length,
      groups,
    });
  }

  const customerId = req.nextUrl.searchParams.get("customerId") || undefined;
  const applicationId =
    req.nextUrl.searchParams.get("applicationId") || undefined;
  const documents = await listDocuments({ customerId, applicationId });
  return NextResponse.json({
    ok: true,
    count: documents.length,
    documents: documents.map((d) => ({
      ...d,
      kindLabel: documentKindLabel(d.kind),
      downloadUrl: `/api/admin/documents?id=${encodeURIComponent(d.id)}`,
      previewUrl: `/api/admin/documents?id=${encodeURIComponent(d.id)}&inline=1`,
      canPreview: isPreviewable(d.mimeType, d.fileName),
    })),
  });
}
