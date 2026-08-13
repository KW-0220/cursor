import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  buildBizStoragePath,
  prepareBizSignedUpload,
  uploadBizFileBytes,
} from "@/lib/bizdoc/file-storage";
import {
  getBizApplicationFromDb,
  upsertBizApplicationToDb,
} from "@/lib/bizdoc/supabase";
import type { BizDocSlotId, BizUploadedFile } from "@/lib/bizdoc/types";
import { MAX_FILE_SIZE_BYTES } from "@/lib/bizdoc/documents";
import { normalizeApplication } from "@/lib/bizdoc/normalize";

export const runtime = "nodejs";
export const maxDuration = 120;

const prepareSchema = z.object({
  action: z.literal("prepare"),
  slotId: z.string().min(1),
  fileName: z.string().min(1),
  mimeType: z.string().optional(),
  size: z.number().positive().max(MAX_FILE_SIZE_BYTES),
  uploadedBy: z.string().optional(),
});

const completeSchema = z.object({
  action: z.literal("complete"),
  fileId: z.string().min(1),
  slotId: z.string().min(1),
  fileName: z.string().min(1),
  mimeType: z.string().optional(),
  size: z.number().nonnegative(),
  storagePath: z.string().min(1),
  uploadedBy: z.string().optional(),
});

function makeFileMeta(input: {
  id: string;
  slotId: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  uploadedBy: string;
  storagePath: string;
  storage: "supabase" | "local";
  existing?: BizUploadedFile[];
}): BizUploadedFile {
  const version =
    Math.max(
      0,
      ...(input.existing || [])
        .filter((f) => f.slotId === input.slotId)
        .map((f) => f.version),
    ) + 1;
  return {
    id: input.id,
    slotId: input.slotId as BizDocSlotId,
    originalName: input.fileName,
    storedName: input.fileName,
    sizeBytes: input.sizeBytes,
    mimeType: input.mimeType || "application/octet-stream",
    uploadedAt: new Date().toISOString(),
    uploadedBy: input.uploadedBy || "客戶",
    status: "uploaded",
    version,
    storagePath: input.storagePath,
    storage: input.storage,
  };
}

async function attachFileToApplication(
  applicationId: string,
  uploaded: BizUploadedFile,
) {
  const existing = await getBizApplicationFromDb(applicationId);
  if (!existing) {
    // 申請尚未寫入 DB：回傳 meta，由 client saveNow 一併 upsert
    return { application: null as null, file: uploaded };
  }
  const next = normalizeApplication({
    ...existing,
    files: [
      ...existing.files.filter(
        (f) => f.slotId !== uploaded.slotId || f.status === "approved",
      ),
      uploaded,
    ],
  });
  const saved = await upsertBizApplicationToDb(next);
  return { application: saved, file: uploaded };
}

type RouteCtx = { params: Promise<{ id: string }> };

/** POST /api/biz/applications/[id]/files
 *  - multipart：file + slotId
 *  - JSON prepare / complete：大檔直傳
 */
export async function POST(req: NextRequest, ctx: RouteCtx) {
  const { id: applicationId } = await ctx.params;
  if (!applicationId) {
    return NextResponse.json({ error: "MISSING_ID" }, { status: 400 });
  }

  const contentType = req.headers.get("content-type") || "";

  try {
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
        const fileId = `f-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
        const signed = await prepareBizSignedUpload({
          applicationId,
          fileId,
          fileName: parsed.data.fileName,
        });
        return NextResponse.json({
          ok: true,
          fileId,
          slotId: parsed.data.slotId,
          ...signed,
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
        if (!parsed.data.storagePath.startsWith(`biz/${applicationId}/`)) {
          return NextResponse.json(
            { error: "INVALID_STORAGE_PATH" },
            { status: 400 },
          );
        }
        const existing = await getBizApplicationFromDb(applicationId);
        const uploaded = makeFileMeta({
          id: parsed.data.fileId,
          slotId: parsed.data.slotId,
          fileName: parsed.data.fileName,
          mimeType: parsed.data.mimeType || "application/octet-stream",
          sizeBytes: parsed.data.size,
          uploadedBy: parsed.data.uploadedBy || "客戶",
          storagePath: parsed.data.storagePath,
          storage: "supabase",
          existing: existing?.files,
        });
        const result = await attachFileToApplication(applicationId, uploaded);
        return NextResponse.json({ ok: true, ...result });
      }

      return NextResponse.json({ error: "UNKNOWN_ACTION" }, { status: 400 });
    }

    const form = await req.formData();
    const file = form.get("file");
    const slotId = String(form.get("slotId") || "");
    const uploadedBy = String(form.get("uploadedBy") || "客戶");
    if (!(file instanceof File) || !slotId) {
      return NextResponse.json(
        { error: "INVALID_FORM", message: "需要 file 與 slotId" },
        { status: 400 },
      );
    }
    if (file.size <= 0) {
      return NextResponse.json(
        { error: "EMPTY_FILE" },
        { status: 400 },
      );
    }
    if (file.size > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json(
        { error: "FILE_TOO_LARGE", message: "檔案超過 20MB 上限" },
        { status: 413 },
      );
    }

    const fileId = `f-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const fileName = file.name || `${slotId}.bin`;
    const mimeType = file.type || "application/octet-stream";
    const storagePath = buildBizStoragePath(applicationId, fileId, fileName);
    const bytes = Buffer.from(await file.arrayBuffer());
    const storage = await uploadBizFileBytes({
      storagePath,
      bytes,
      mimeType,
    });

    const existing = await getBizApplicationFromDb(applicationId);
    const uploaded = makeFileMeta({
      id: fileId,
      slotId,
      fileName,
      mimeType,
      sizeBytes: file.size,
      uploadedBy,
      storagePath,
      storage,
      existing: existing?.files,
    });
    const result = await attachFileToApplication(applicationId, uploaded);
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    return NextResponse.json(
      {
        error: "BIZ_FILE_UPLOAD_FAILED",
        message: err instanceof Error ? err.message : String(err),
      },
      { status: 500 },
    );
  }
}
