import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  attachDocumentsToApplication,
  ensureApplicationForDocuments,
  getApplication,
} from "@/lib/applications-registry";
import {
  findUserByEmail,
  getSessionFromCookieHeader,
} from "@/lib/auth";
import { getCustomerByEmail } from "@/lib/customer-registry";
import {
  documentKindLabel,
  linkDocumentsCustomer,
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

type OwnerLink = {
  customerId: string | null;
  email: string | null;
  applicantNameZh: string | null;
  phone: string | null;
};

/** 由 cookie 登入＋客戶登記，解析文件應掛去邊個客戶 */
async function resolveOwnerLink(
  req: NextRequest,
  explicitCustomerId?: string | null,
): Promise<OwnerLink> {
  let customerId = explicitCustomerId?.trim() || null;
  let email: string | null = null;
  let applicantNameZh: string | null = null;
  let phone: string | null = null;

  try {
    const session = await getSessionFromCookieHeader(
      req.headers.get("cookie"),
    );
    if (session?.email) {
      email = session.email.trim().toLowerCase();
      const user = await findUserByEmail(email);
      applicantNameZh = user?.nameZh ?? null;
      phone = user?.phone ?? null;
      if (!customerId) {
        const customer = await getCustomerByEmail(email);
        if (customer) customerId = customer.id;
      }
    }
  } catch {
    /* anon ok */
  }

  return { customerId, email, applicantNameZh, phone };
}

async function bindApplicationOwner(id: string, link: OwnerLink) {
  const app = await ensureApplicationForDocuments(id, link);
  if (app.customerId) {
    await linkDocumentsCustomer(id, app.customerId);
  }
  return app;
}

/**
 * GET /api/applications/:id/documents
 * — 申請不存在時回空列表；若已登入會嘗試歸戶
 */
export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  const link = await resolveOwnerLink(req);
  if (link.customerId || link.email) {
    await bindApplicationOwner(id, link);
  }
  const app = await getApplication(id);
  const documents = await listDocuments({ applicationId: id });
  return NextResponse.json({
    ok: true,
    applicationId: id,
    count: documents.length,
    missingApplication: !app,
    customerId: app?.customerId ?? null,
    documents: documents.map((d) => ({
      ...d,
      kindLabel: documentKindLabel(d.kind),
    })),
  });
}

/**
 * POST
 * - multipart: files + kinds[] + slots[]
 * - JSON action=prepare|complete（大檔直傳）
 * 一律嘗試用登入帳戶綁定客戶，令後台客戶庫可見。
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
        const link = await resolveOwnerLink(req, parsed.data.customerId);
        await bindApplicationOwner(id, link);
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
        return NextResponse.json({
          ok: true,
          uploads,
          customerId: link.customerId,
        });
      }

      if (body?.action === "complete") {
        const parsed = completeSchema.safeParse(body);
        if (!parsed.success) {
          return NextResponse.json(
            { error: "INVALID_BODY", details: parsed.error.flatten() },
            { status: 400 },
          );
        }
        const link = await resolveOwnerLink(req, parsed.data.customerId);
        const app = await bindApplicationOwner(id, link);
        const resolvedCustomerId = app.customerId || link.customerId || null;
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
        if (resolvedCustomerId) {
          await linkDocumentsCustomer(id, resolvedCustomerId);
        }
        return NextResponse.json({
          ok: true,
          count: saved.length,
          customerId: resolvedCustomerId,
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
    const link = await resolveOwnerLink(
      req,
      String(form.get("customerId") ?? "").trim() || null,
    );
    const app = await bindApplicationOwner(id, link);
    const customerId = app.customerId || link.customerId || null;
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
    if (customerId) {
      await linkDocumentsCustomer(id, customerId);
    }

    return NextResponse.json({
      ok: true,
      count: saved.length,
      customerId,
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
