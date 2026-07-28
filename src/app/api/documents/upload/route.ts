import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { requireUserSession } from "@/lib/api-session";
import {
  addDocumentRecord,
  getApplication,
} from "@/lib/applications-store";
import {
  buildDocumentStorageKey,
  getObjectStorage,
} from "@/lib/integrations/object-storage";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_BYTES = 20 * 1024 * 1024;

/**
 * POST /api/documents/upload
 * formData: file, applicationId, docKind?
 *
 * 流程：Object Storage → SQL metadata（本 repo 用 file/redis store）
 * 唔把 Base64 塞入 DB。
 */
export async function POST(req: NextRequest) {
  const session = await requireUserSession();
  if (!session) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const form = await req.formData();
  const file = form.get("file");
  const applicationId = String(form.get("applicationId") ?? "").trim();
  const docKind = String(form.get("docKind") ?? "").trim() || null;

  if (!applicationId) {
    return NextResponse.json(
      { error: "MISSING_APPLICATION_ID" },
      { status: 400 },
    );
  }
  if (!(file instanceof File) || file.size <= 0) {
    return NextResponse.json({ error: "NO_FILE" }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: "FILE_TOO_LARGE", message: "檔案請小於 20MB" },
      { status: 400 },
    );
  }

  const app = await getApplication(applicationId, session.id);
  if (!app) {
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const mimeType = file.type || "application/octet-stream";
  const storage = getObjectStorage();
  const key = buildDocumentStorageKey({
    userId: session.id,
    applicationId,
    docKind: docKind ?? undefined,
    fileName: file.name || "upload.bin",
  });

  const stored = await storage.putObject({
    key,
    buffer,
    mimeType,
  });

  const record = await addDocumentRecord({
    id: `DOC-${randomUUID().slice(0, 10)}`,
    applicationId,
    storagePath: stored.storagePath,
    originalFilename: file.name || "upload.bin",
    docKind,
    fileSize: stored.size,
    mimeType: stored.mimeType,
    fileHash: stored.fileHash,
    uploadedBy: session.id,
    uploadStatus: "UPLOADED",
    analysisStatus: "AWAITING_ANALYSIS",
    analysisResult: null,
    accessPolicy: "owner_only",
    retainUntil: null,
  });

  return NextResponse.json({
    ok: true,
    document: {
      id: record.id,
      storagePath: record.storagePath,
      originalFilename: record.originalFilename,
      docKind: record.docKind,
      fileSize: record.fileSize,
      mimeType: record.mimeType,
      fileHash: record.fileHash,
      uploadStatus: record.uploadStatus,
      analysisStatus: record.analysisStatus,
      createdAt: record.createdAt,
    },
    note: "文件已存 Object Storage；AI 分析請另行呼叫 /api/analyze-document（文件齊全後建議申請級分析）。",
  });
}
