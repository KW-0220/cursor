import "server-only";

import { createHash, randomUUID } from "crypto";
import { promises as fs } from "fs";
import path from "path";

/**
 * Object Storage 抽象（規格 §一.2）
 * local：寫入 data/uploads（示範／無雲端）
 * s3：預留 AWS S3／兼容 API（需設 env）
 *
 * 文件本體唔入 SQL；只回 storagePath／metadata。
 */

export type StoredObject = {
  storagePath: string;
  size: number;
  mimeType: string;
  fileHash: string;
  provider: string;
};

export interface ObjectStorage {
  readonly provider: string;
  putObject(params: {
    key: string;
    buffer: Buffer;
    mimeType: string;
  }): Promise<StoredObject>;
  getObjectBuffer(storagePath: string): Promise<Buffer | null>;
  deleteObject(storagePath: string): Promise<void>;
}

function sha256(buf: Buffer) {
  return createHash("sha256").update(buf).digest("hex");
}

class LocalObjectStorage implements ObjectStorage {
  readonly provider = "local-fs";
  private root = path.join(process.cwd(), "data", "uploads");

  private async ensureDir(dir: string) {
    await fs.mkdir(dir, { recursive: true });
  }

  async putObject(params: {
    key: string;
    buffer: Buffer;
    mimeType: string;
  }): Promise<StoredObject> {
    const safeKey = params.key.replace(/\.\./g, "_").replace(/^\/+/, "");
    const full = path.join(this.root, safeKey);
    await this.ensureDir(path.dirname(full));
    await fs.writeFile(full, params.buffer);
    return {
      storagePath: `local://${safeKey}`,
      size: params.buffer.length,
      mimeType: params.mimeType,
      fileHash: sha256(params.buffer),
      provider: this.provider,
    };
  }

  async getObjectBuffer(storagePath: string): Promise<Buffer | null> {
    const key = storagePath.replace(/^local:\/\//, "");
    const full = path.join(this.root, key);
    try {
      return await fs.readFile(full);
    } catch {
      return null;
    }
  }

  async deleteObject(storagePath: string): Promise<void> {
    const key = storagePath.replace(/^local:\/\//, "");
    const full = path.join(this.root, key);
    await fs.unlink(full).catch(() => undefined);
  }
}

/** S3 預留：設 STORAGE_PROVIDER=s3 + AWS_* 後實作 */
class S3ObjectStorageStub implements ObjectStorage {
  readonly provider = "s3-stub";

  async putObject(): Promise<StoredObject> {
    throw new Error(
      "S3 storage 尚未接線。請設 STORAGE_PROVIDER=local，或實作 S3ObjectStorage。",
    );
  }
  async getObjectBuffer(): Promise<Buffer | null> {
    return null;
  }
  async deleteObject(): Promise<void> {}
}

let cached: ObjectStorage | null = null;

export function getObjectStorage(): ObjectStorage {
  if (cached) return cached;
  const mode = (process.env.STORAGE_PROVIDER || "local").trim().toLowerCase();
  cached = mode === "s3" ? new S3ObjectStorageStub() : new LocalObjectStorage();
  return cached;
}

export function buildDocumentStorageKey(params: {
  userId: string;
  applicationId: string;
  docKind?: string;
  fileName: string;
}) {
  const ext = path.extname(params.fileName) || "";
  const kind = (params.docKind || "misc").replace(/[^a-z0-9_-]/gi, "");
  return `${params.userId}/${params.applicationId}/${kind}/${randomUUID()}${ext}`;
}
