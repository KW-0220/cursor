/**
 * 開戶文件通：客戶端上載單一文件至 Storage
 * - 細檔 multipart
 * - 大檔／413 → signed URL 直傳
 */

import { MAX_FILE_SIZE_BYTES } from "@/lib/bizdoc/documents";
import type { BizDocSlotId, BizUploadedFile } from "@/lib/bizdoc/types";

const MULTIPART_SAFE = 3.5 * 1024 * 1024;

async function readError(res: Response): Promise<string> {
  const raw = await res.text();
  if (!raw) {
    if (res.status === 413) return "檔案太大，請壓縮後再試";
    return `上載失敗（HTTP ${res.status}）`;
  }
  try {
    const data = JSON.parse(raw) as { message?: string; error?: string };
    return data.message || data.error || raw.slice(0, 200);
  } catch {
    return raw.slice(0, 200);
  }
}

async function multipartUpload(params: {
  applicationId: string;
  slotId: BizDocSlotId;
  file: File;
  uploadedBy: string;
}): Promise<BizUploadedFile> {
  const form = new FormData();
  form.append("file", params.file, params.file.name);
  form.append("slotId", params.slotId);
  form.append("uploadedBy", params.uploadedBy);
  const res = await fetch(
    `/api/biz/applications/${encodeURIComponent(params.applicationId)}/files`,
    { method: "POST", body: form },
  );
  if (!res.ok) {
    const err = new Error(await readError(res)) as Error & { status?: number };
    err.status = res.status;
    throw err;
  }
  const data = (await res.json()) as { file?: BizUploadedFile };
  if (!data.file) throw new Error("上載回應缺少檔案資料");
  return data.file;
}

async function signedUpload(params: {
  applicationId: string;
  slotId: BizDocSlotId;
  file: File;
  uploadedBy: string;
}): Promise<BizUploadedFile> {
  const prepareRes = await fetch(
    `/api/biz/applications/${encodeURIComponent(params.applicationId)}/files`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "prepare",
        slotId: params.slotId,
        fileName: params.file.name || `${params.slotId}.bin`,
        mimeType: params.file.type || "application/octet-stream",
        size: params.file.size,
        uploadedBy: params.uploadedBy,
      }),
    },
  );
  if (!prepareRes.ok) throw new Error(await readError(prepareRes));
  const prepared = (await prepareRes.json()) as {
    fileId: string;
    storagePath: string;
    signedUrl: string;
  };

  const put = await fetch(prepared.signedUrl, {
    method: "PUT",
    headers: {
      "Content-Type":
        params.file.type || "application/octet-stream",
    },
    body: params.file,
  });
  if (!put.ok) {
    throw new Error(`直傳失敗：HTTP ${put.status}`);
  }

  const completeRes = await fetch(
    `/api/biz/applications/${encodeURIComponent(params.applicationId)}/files`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "complete",
        fileId: prepared.fileId,
        slotId: params.slotId,
        fileName: params.file.name || `${params.slotId}.bin`,
        mimeType: params.file.type || "application/octet-stream",
        size: params.file.size,
        storagePath: prepared.storagePath,
        uploadedBy: params.uploadedBy,
      }),
    },
  );
  if (!completeRes.ok) throw new Error(await readError(completeRes));
  const data = (await completeRes.json()) as { file?: BizUploadedFile };
  if (!data.file) throw new Error("上載回應缺少檔案資料");
  return data.file;
}

export async function uploadBizdocFile(params: {
  applicationId: string;
  slotId: BizDocSlotId;
  file: File;
  uploadedBy?: string;
}): Promise<BizUploadedFile> {
  if (!params.applicationId) throw new Error("缺少申請編號");
  if (params.file.size <= 0) throw new Error("空檔無法上載");
  if (params.file.size > MAX_FILE_SIZE_BYTES) {
    throw new Error("檔案超過 20MB 上限");
  }
  const uploadedBy = params.uploadedBy || "客戶";
  const preferDirect = params.file.size > MULTIPART_SAFE;

  if (!preferDirect) {
    try {
      return await multipartUpload({ ...params, uploadedBy });
    } catch (err) {
      const status = (err as { status?: number })?.status;
      const msg = err instanceof Error ? err.message : "";
      if (status === 413 || /太大|Too Large|payload|4\.5MB/i.test(msg)) {
        return signedUpload({ ...params, uploadedBy });
      }
      throw err;
    }
  }
  return signedUpload({ ...params, uploadedBy });
}
