import { NextRequest, NextResponse } from "next/server";
import {
  documentKindLabel,
  getDocument,
  listDocuments,
  readDocumentBytes,
} from "@/lib/documents-registry";
import { requireAdminContext } from "@/lib/supabase/context";

export const runtime = "nodejs";

/** GET /api/admin/documents?customerId=&applicationId=&id=（下載） */
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
    return new NextResponse(new Uint8Array(bytes), {
      status: 200,
      headers: {
        "Content-Type": doc.mimeType || "application/octet-stream",
        "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(doc.fileName)}`,
        "Content-Length": String(bytes.length),
        "Cache-Control": "private, no-store",
      },
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
    })),
  });
}
