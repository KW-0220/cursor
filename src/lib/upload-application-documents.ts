/**
 * 申請文件上載（client）
 * - 細檔走 multipart（經 Vercel）
 * - 大檔／合計過大 → signed URL 直傳 Supabase（繞過 ~4.5MB 限制）
 */

export type UploadDocItem = {
  file: File;
  kind: string;
  slot: string;
};

export type UploadedDocMeta = {
  id: string;
  kind: string;
  kindLabel?: string;
  slot: string;
  fileName: string;
  size: number;
  mimeType: string;
};

/** Vercel Serverless body 實務上限約 4.5MB；預留餘量 */
const MULTIPART_SAFE_TOTAL = 3.5 * 1024 * 1024;
const MAX_FILE_BYTES = 15 * 1024 * 1024;

async function readErrorMessage(res: Response): Promise<string> {
  const raw = await res.text();
  if (!raw) {
    if (res.status === 413) {
      return "檔案太大（伺服器限制約 4.5MB）。請壓縮 PDF／改用較小圖檔，或稍後重試直傳。";
    }
    return `上載失敗（HTTP ${res.status}）`;
  }
  try {
    const data = JSON.parse(raw) as {
      message?: string;
      error?: string;
    };
    return data.message || data.error || raw.slice(0, 200);
  } catch {
    if (
      res.status === 413 ||
      /too large|payload/i.test(raw) ||
      /Request Entity Too Large/i.test(raw)
    ) {
      return "檔案太大（超過 Vercel 約 4.5MB 限制）。系統會改試直傳；若仍失敗請壓縮後再上載。";
    }
    return raw.slice(0, 200);
  }
}

async function multipartUpload(
  applicationId: string,
  items: UploadDocItem[],
  customerId?: string | null,
): Promise<UploadedDocMeta[]> {
  const form = new FormData();
  if (customerId) form.append("customerId", customerId);
  for (const item of items) {
    form.append("files", item.file, item.file.name);
    form.append("kinds", item.kind);
    form.append("slots", item.slot);
  }
  const res = await fetch(
    `/api/applications/${encodeURIComponent(applicationId)}/documents`,
    { method: "POST", body: form },
  );
  if (!res.ok) {
    const err = new Error(await readErrorMessage(res)) as Error & {
      status?: number;
    };
    err.status = res.status;
    throw err;
  }
  const data = (await res.json()) as {
    documents?: UploadedDocMeta[];
  };
  return data.documents ?? [];
}

async function signedDirectUpload(
  applicationId: string,
  items: UploadDocItem[],
  customerId?: string | null,
): Promise<UploadedDocMeta[]> {
  const prepareRes = await fetch(
    `/api/applications/${encodeURIComponent(applicationId)}/documents`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "prepare",
        customerId: customerId ?? null,
        files: items.map((i) => ({
          fileName: i.file.name || `${i.slot}.bin`,
          mimeType: i.file.type || "application/octet-stream",
          size: i.file.size,
          kind: i.kind,
          slot: i.slot,
        })),
      }),
    },
  );
  if (!prepareRes.ok) {
    throw new Error(await readErrorMessage(prepareRes));
  }
  const prepared = (await prepareRes.json()) as {
    uploads: Array<{
      kind: string;
      slot: string;
      fileName: string;
      mimeType: string;
      size: number;
      storagePath: string;
      signedUrl: string;
      token: string;
    }>;
  };

  if (!prepared.uploads?.length) {
    throw new Error("未能建立直傳連結");
  }

  for (let i = 0; i < prepared.uploads.length; i++) {
    const slot = prepared.uploads[i]!;
    const file = items[i]?.file;
    if (!file) throw new Error("上載檔案與連結數量不符");

    const put = await fetch(slot.signedUrl, {
      method: "PUT",
      headers: {
        "Content-Type": slot.mimeType || file.type || "application/octet-stream",
      },
      body: file,
    });
    if (!put.ok) {
      const detail = await put.text().catch(() => "");
      throw new Error(
        `直傳失敗（${file.name}）：HTTP ${put.status}${
          detail ? ` ${detail.slice(0, 120)}` : ""
        }`,
      );
    }
  }

  const completeRes = await fetch(
    `/api/applications/${encodeURIComponent(applicationId)}/documents`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "complete",
        customerId: customerId ?? null,
        documents: prepared.uploads.map((u) => ({
          fileName: u.fileName,
          mimeType: u.mimeType,
          size: u.size,
          kind: u.kind,
          slot: u.slot,
          storagePath: u.storagePath,
        })),
      }),
    },
  );
  if (!completeRes.ok) {
    throw new Error(await readErrorMessage(completeRes));
  }
  const data = (await completeRes.json()) as {
    documents?: UploadedDocMeta[];
  };
  return data.documents ?? [];
}

export async function uploadApplicationDocuments(
  applicationId: string,
  items: UploadDocItem[],
  opts?: { customerId?: string | null },
): Promise<UploadedDocMeta[]> {
  if (!items.length) return [];

  for (const item of items) {
    if (item.file.size <= 0) {
      throw new Error(`${item.file.name || "檔案"} 是空檔`);
    }
    if (item.file.size > MAX_FILE_BYTES) {
      throw new Error(
        `${item.file.name} 超過 15MB，請壓縮後再上載`,
      );
    }
  }

  const total = items.reduce((sum, i) => sum + i.file.size, 0);
  const preferDirect = total > MULTIPART_SAFE_TOTAL;

  if (!preferDirect) {
    try {
      return await multipartUpload(
        applicationId,
        items,
        opts?.customerId,
      );
    } catch (err) {
      const status = (err as { status?: number })?.status;
      const msg = err instanceof Error ? err.message : "";
      if (status === 413 || /4\.5MB|太大|Too Large|payload/i.test(msg)) {
        return signedDirectUpload(
          applicationId,
          items,
          opts?.customerId,
        );
      }
      throw err;
    }
  }

  return signedDirectUpload(applicationId, items, opts?.customerId);
}
