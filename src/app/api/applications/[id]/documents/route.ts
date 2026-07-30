import { NextRequest, NextResponse } from "next/server";
import {
  attachDocumentsToApplication,
  getApplication,
  upsertApplication,
} from "@/lib/applications-registry";
import {
  documentKindLabel,
  listDocuments,
  saveDocument,
  type DocumentKind,
} from "@/lib/documents-registry";

export const runtime = "nodejs";
export const maxDuration = 120;

const KIND_SET = new Set<DocumentKind>([
  "br",
  "audited",
  "identity",
  "company_other",
  "bank",
  "other",
]);

function parseKind(raw: string): DocumentKind {
  return KIND_SET.has(raw as DocumentKind) ? (raw as DocumentKind) : "other";
}

/**
 * GET /api/applications/:id/documents
 * POST multipart: files + kinds[] + slots[] (+ optional customerId)
 */
export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  const app = await getApplication(id);
  if (!app) {
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  }
  const documents = await listDocuments({ applicationId: id });
  return NextResponse.json({
    ok: true,
    applicationId: id,
    count: documents.length,
    documents: documents.map((d) => ({
      ...d,
      kindLabel: documentKindLabel(d.kind),
    })),
  });
}

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;

  try {
    const form = await req.formData();
    let app = await getApplication(id);
    // 多 instance 競態：若申請尚未讀到，補建 stub 再上載
    if (!app) {
      app = await upsertApplication({
        id,
        loanType: null,
        amount: 0,
        purpose: "（文件上載時補建）",
        status: "under_review",
        customerId: String(form.get("customerId") ?? "").trim() || null,
      });
    }
    const customerId =
      String(form.get("customerId") ?? "").trim() || app.customerId || null;
    const files = form.getAll("files").filter((f): f is File => f instanceof File);
    const kinds = form.getAll("kinds").map((k) => String(k));
    const slots = form.getAll("slots").map((s) => String(s));

    if (!files.length) {
      return NextResponse.json(
        { error: "NO_FILES", message: "未有上載檔案" },
        { status: 400 },
      );
    }

    const saved = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i]!;
      if (file.size <= 0) continue;
      if (file.size > 15 * 1024 * 1024) {
        return NextResponse.json(
          { error: "FILE_TOO_LARGE", message: `${file.name} 超過 15MB` },
          { status: 400 },
        );
      }
      const bytes = Buffer.from(await file.arrayBuffer());
      const kind = parseKind(kinds[i] || "other");
      const slot = slots[i] || `${kind}-${i + 1}`;
      const doc = await saveDocument({
        customerId,
        applicationId: id,
        kind,
        slot,
        fileName: file.name || `${slot}.bin`,
        mimeType: file.type || "application/octet-stream",
        bytes,
      });
      saved.push(doc);
    }

    await attachDocumentsToApplication(
      id,
      saved.map((d) => ({
        id: d.id,
        kind: d.kind,
        slot: d.slot,
        fileName: d.fileName,
        size: d.size,
        mimeType: d.mimeType,
      })),
    );

    return NextResponse.json({
      ok: true,
      count: saved.length,
      documents: saved.map((d) => ({
        ...d,
        kindLabel: documentKindLabel(d.kind),
      })),
    });
  } catch (err) {
    return NextResponse.json(
      {
        error: "UPLOAD_FAILED",
        message: err instanceof Error ? err.message : "UNKNOWN",
      },
      { status: 500 },
    );
  }
}
