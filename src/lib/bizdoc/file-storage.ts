import "server-only";
import { promises as fs } from "fs";
import path from "path";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  getSupabaseSecretKey,
  getSupabaseUrl,
} from "@/lib/supabase/env";

/** 與 SME 共用 private bucket；路徑前綴 biz/ 區隔 */
export const BIZ_DOC_BUCKET = "customer-documents";
const LOCAL_DIR = path.join(process.cwd(), "data", "biz-documents");

function supabaseReady() {
  return Boolean(getSupabaseUrl() && getSupabaseSecretKey());
}

export function safeFileName(name: string) {
  return name.replace(/[^\w.\-()\u4e00-\u9fff]+/g, "_") || "file.bin";
}

export function buildBizStoragePath(
  applicationId: string,
  fileId: string,
  fileName: string,
) {
  return `biz/${applicationId}/${fileId}/${safeFileName(fileName)}`;
}

export async function uploadBizFileBytes(params: {
  storagePath: string;
  bytes: Buffer;
  mimeType: string;
}): Promise<"supabase" | "local"> {
  if (supabaseReady()) {
    try {
      const db = createAdminClient();
      const { error } = await db.storage
        .from(BIZ_DOC_BUCKET)
        .upload(params.storagePath, params.bytes, {
          contentType: params.mimeType || "application/octet-stream",
          upsert: true,
        });
      if (!error) return "supabase";
      console.error("[bizdoc] storage upload failed", error.message);
    } catch (err) {
      console.error("[bizdoc] storage upload error", err);
    }
  }
  await fs.mkdir(LOCAL_DIR, { recursive: true });
  const localPath = path.join(
    LOCAL_DIR,
    params.storagePath.replace(/\//g, "__"),
  );
  await fs.writeFile(localPath, params.bytes);
  return "local";
}

export async function prepareBizSignedUpload(params: {
  applicationId: string;
  fileId: string;
  fileName: string;
}): Promise<{ storagePath: string; signedUrl: string; token: string }> {
  if (!supabaseReady()) {
    throw new Error("SUPABASE_STORAGE_UNAVAILABLE");
  }
  const storagePath = buildBizStoragePath(
    params.applicationId,
    params.fileId,
    params.fileName,
  );
  const db = createAdminClient();
  const { data, error } = await db.storage
    .from(BIZ_DOC_BUCKET)
    .createSignedUploadUrl(storagePath, { upsert: true });
  if (error || !data) {
    throw new Error(error?.message || "SIGNED_UPLOAD_FAILED");
  }
  return {
    storagePath: data.path || storagePath,
    signedUrl: data.signedUrl,
    token: data.token,
  };
}

export async function readBizFileBytes(params: {
  storagePath: string;
  storage?: "supabase" | "local";
}): Promise<Buffer | null> {
  const preferLocal = params.storage === "local";
  if (!preferLocal && supabaseReady()) {
    try {
      const db = createAdminClient();
      const { data, error } = await db.storage
        .from(BIZ_DOC_BUCKET)
        .download(params.storagePath);
      if (!error && data) {
        const ab = await data.arrayBuffer();
        return Buffer.from(ab);
      }
      if (error) {
        console.error("[bizdoc] storage download failed", error.message);
      }
    } catch (err) {
      console.error("[bizdoc] storage download error", err);
    }
  }

  try {
    const localPath = path.join(
      LOCAL_DIR,
      params.storagePath.replace(/\//g, "__"),
    );
    return await fs.readFile(localPath);
  } catch {
    return null;
  }
}

export async function removeBizFileBytes(storagePath: string): Promise<void> {
  if (supabaseReady()) {
    try {
      const db = createAdminClient();
      await db.storage.from(BIZ_DOC_BUCKET).remove([storagePath]);
    } catch {
      /* ignore */
    }
  }
  try {
    await fs.unlink(
      path.join(LOCAL_DIR, storagePath.replace(/\//g, "__")),
    );
  } catch {
    /* ignore */
  }
}
