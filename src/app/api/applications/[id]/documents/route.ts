import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  attachDocumentsToApplication,
  getApplication,
  upsertApplication,
} from "@/lib/applications-registry";
import {
  documentKindLabel,
  listDocuments,
  prepareSignedDocumentUploads,
  registerDocument,
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

const prepareSchema = z.object({
  action: z.literal("prepare"),
  customerId: z.string().nullable().optional(),
  files: z
    .array(
      z.object({
        fileName: z.string().min(1),
        mimeType: z.string().optional(),
        size: z.number().positive().max(15 * 1024 * 1024),
        kind: z.string(),
        slot: z.string().min(1),
      }),
    )
    .min(1)
    .max(30),
});

const completeSchema = z.object({
  action: z.literal("complete"),
  customerId: z.string().nullable().optional(),
  documents: z
    .array(
      z.object({
        fileName: z.string().min(1),
        mimeType: z.string().optional(),
        size: z.number().nonnegative(),
        kind: z.string(),
        slot: z.string().min(1),
        storagePath: z.string().min(1),
      }),
    )
    .min(1)
    .max(30),
});

async function ensureApp(
  id: string,
  customerId: string | null,
) {
  let app = await getApplication(id);
  if (!app) {
    app = await upsertApplication({
      id,
      loanType: null,
      amount: 0,
      purpose: "（文件上載時補建）",
      status: "under_review",
      customerId,
    });
  }
  return app;
}

/**
 * GET /api/applications/:id/documents
 * — 申請不存在時回空列表（方便補件頁，唔甩 404）
 */
export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  const app = await getApplication(id);
  const documents = app
    ? await listDocuments({ applicationId: id })
    : [];
  return NextResponse.json({
    ok: true,
    applicationId: id,
    count: documents.length,
    missingApplication: !app,
    documents: documents.map((d) => ({
      ...d,
      kindLabel: documentKindLabel(d.kind),
    })),
  });
}

/**
 * POST
 * - multipart: files + kinds[] + slots[]（細檔，≤ ~4MB 合計）
 * - JSON action=prepare → signed upload URLs（大檔直傳 Storage）
 * - JSON action=complete → 登記已直傳檔案 metadata
 */
export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;

  try {
    const contentType = req.headers.get("content-type") || "";

    if (contentType.includes("application/json")) {
      const body = await req.json();
      if (body?.action === "prepare") {
        const parsed = prepareSchema.safeParse(body);
        if (!parsed.success) {
          return NextResponse.json(
            { error: "INVALID_BODY", details: parsed.error.flatten() },
            { status: 400 },
          );
        }
        const customerId = parsed.data.customerId?.trim() || null;
        await ensureApp(id, customerId);
        const uploads = await prepareSignedDocumentUploads(
          id,
          parsed.data.files.map((f) => ({
            kind: parseKind(f.kind),
            slot: f.slot,
            fileName: f.fileName,
            mimeType: f.mimeType || "application/octet-stream",
            size: f.size,
          })),
        );
        return NextResponse.json({ ok: true, uploads });
      }

      if (body?.action === "complete") {
        const parsed = completeSchema.safeParse(body);
        if (!parsed.success) {
          return NextResponse.json(
            { error: "INVALID_BODY", details: parsed.error.flatten() },
            { status: 400 },
          );
        }
        const customerId = parsed.data.customerId?.trim() || null;
        const app = await ensureApp(id, customerId);
        const resolvedCustomerId = customerId || app.customerId || null;
        const saved = [];
        for (const item of parsed.data.documents) {
          if (!item.storagePath.startsWith(`${id}/`)) {
            return NextResponse.json(
              {
                error: "INVALID_PATH",
                message: `storagePath 必須屬於申請 ${id}`,
              },
              { status: 400 },
            );
          }
          const doc = await registerDocument({
            customerId: resolvedCustomerId,
            applicationId: id,
            kind: parseKind(item.kind),
            slot: item.slot,
            fileName: item.fileName,
            mimeType: item.mimeType || "application/octet-stream",
            size: item.size,
            storagePath: item.storagePath,
            storage: "supabase",
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
      }

      return NextResponse.json(
        { error: "UNKNOWN_ACTION", message: "需要 action=prepare|complete" },
        { status: 400 },
      );
    }

    const form = await req.formData();
    let app = await getApplication(id);
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

    if (!saved.length) {
      return NextResponse.json(
        { error: "NO_FILES", message: "未有有效檔案（可能全部為空檔）" },
        { status: 400 },
      );
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
