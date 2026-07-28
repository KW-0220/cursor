/**
 * Document OCR：Google Cloud Vision（首選）或 tesseract.js（本地 fallback）
 * 有足夠 OCR 文字就唔使次次叫 Manus vision 讀圖。
 */

export type OcrProviderUsed = "google" | "tesseract" | "none";

export type OcrResult = {
  text: string;
  provider: OcrProviderUsed;
  /** 0–1；tesseract 有 mean confidence；google 無就略 */
  confidence?: number;
};

function ocrProviderPref(): "auto" | "google" | "tesseract" | "off" {
  const raw = (process.env.OCR_PROVIDER || "auto").trim().toLowerCase();
  if (raw === "google" || raw === "tesseract" || raw === "off") return raw;
  return "auto";
}

function googleVisionApiKey(): string | undefined {
  return (
    process.env.GOOGLE_CLOUD_VISION_API_KEY?.trim() ||
    process.env.GOOGLE_VISION_API_KEY?.trim() ||
    undefined
  );
}

function stripDataUrl(dataUrlOrB64: string): {
  base64: string;
  mime: string;
} {
  const m = /^data:([^;]+);base64,([\s\S]+)$/.exec(dataUrlOrB64);
  if (m) return { mime: m[1], base64: m[2] };
  return { mime: "image/jpeg", base64: dataUrlOrB64 };
}

/** OCR 結果夠唔夠當「可讀文件文字」用（唔再送 vision） */
export function ocrTextLooksStrong(text: string, kind?: string): boolean {
  const body = text.replace(/\s+/g, " ").trim();
  if (!body) return false;

  const letters = (body.match(/[A-Za-z\u4e00-\u9fff]/g) || []).length;
  const digits = (body.match(/\d/g) || []).length;

  if (kind === "br" || kind === "nar1") {
    return letters >= 20;
  }
  if (kind === "bank") {
    return digits >= 20 || (digits >= 12 && letters >= 30);
  }
  return letters >= 40 || (letters >= 16 && digits >= 8);
}

async function ocrWithGoogleVision(
  imageDataUrls: string[],
): Promise<OcrResult | null> {
  const key = googleVisionApiKey();
  if (!key) return null;

  const requests = imageDataUrls.slice(0, 5).map((url) => {
    const { base64 } = stripDataUrl(url);
    return {
      image: { content: base64 },
      features: [{ type: "DOCUMENT_TEXT_DETECTION" }],
    };
  });

  const res = await fetch(
    `https://vision.googleapis.com/v1/images:annotate?key=${encodeURIComponent(key)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ requests }),
    },
  );

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(
      `GOOGLE_VISION_HTTP_${res.status}: ${detail.slice(0, 240)}`,
    );
  }

  const json = (await res.json()) as {
    responses?: Array<{
      fullTextAnnotation?: { text?: string };
      textAnnotations?: Array<{ description?: string }>;
      error?: { message?: string };
    }>;
  };

  const parts: string[] = [];
  for (const r of json.responses ?? []) {
    if (r.error?.message) {
      throw new Error(`GOOGLE_VISION: ${r.error.message.slice(0, 200)}`);
    }
    const t =
      r.fullTextAnnotation?.text ||
      r.textAnnotations?.[0]?.description ||
      "";
    if (t.trim()) parts.push(t.trim());
  }

  const text = parts.join("\n\n").replace(/\0/g, "").trim();
  if (!text) return { text: "", provider: "google" };

  const clipped =
    text.length > 80_000 ? `${text.slice(0, 80_000)}\n…(截斷)` : text;
  return { text: clipped, provider: "google" };
}

async function ocrWithTesseract(
  imageDataUrls: string[],
): Promise<OcrResult | null> {
  const { createWorker } = await import("tesseract.js");
  // 港文件：繁中 + 英文
  const langs =
    process.env.OCR_TESSERACT_LANGS?.trim() || "chi_tra+eng";

  const worker = await createWorker(langs, 1, {
    // serverless：唔要亂打 log
    logger: () => undefined,
  });

  try {
    const parts: string[] = [];
    let confSum = 0;
    let confN = 0;

    for (const url of imageDataUrls.slice(0, 4)) {
      const { data } = await worker.recognize(url);
      const t = String(data.text || "")
        .replace(/\0/g, "")
        .trim();
      if (t) parts.push(t);
      if (typeof data.confidence === "number" && data.confidence > 0) {
        confSum += data.confidence;
        confN += 1;
      }
    }

    const text = parts.join("\n\n").trim();
    const clipped =
      text.length > 80_000 ? `${text.slice(0, 80_000)}\n…(截斷)` : text;
    return {
      text: clipped,
      provider: "tesseract",
      confidence: confN ? confSum / confN / 100 : undefined,
    };
  } finally {
    await worker.terminate().catch(() => undefined);
  }
}

/**
 * 對一至多張 JPEG／PNG data URL 做 OCR。
 * auto：有 Google key 先用 Vision，失敗／無 key 再用 tesseract。
 */
export async function ocrImageDataUrls(
  imageUrls: string[],
  opts?: { prefer?: "auto" | "google" | "tesseract" | "off" },
): Promise<OcrResult> {
  if (!imageUrls.length) {
    return { text: "", provider: "none" };
  }

  const prefer = opts?.prefer ?? ocrProviderPref();
  if (prefer === "off") {
    return { text: "", provider: "none" };
  }

  const tryGoogle = prefer === "google" || prefer === "auto";
  const tryTess = prefer === "tesseract" || prefer === "auto";

  if (tryGoogle && googleVisionApiKey()) {
    try {
      const g = await ocrWithGoogleVision(imageUrls);
      if (g && g.text.trim()) return g;
      if (prefer === "google") {
        return g ?? { text: "", provider: "google" };
      }
    } catch (err) {
      if (prefer === "google") throw err;
      // auto：跌落 tesseract
      console.warn(
        "[ocr] Google Vision failed, fallback tesseract:",
        err instanceof Error ? err.message : err,
      );
    }
  }

  if (tryTess) {
    try {
      const t = await ocrWithTesseract(imageUrls);
      return t ?? { text: "", provider: "tesseract" };
    } catch (err) {
      console.warn(
        "[ocr] tesseract failed:",
        err instanceof Error ? err.message : err,
      );
      if (prefer === "tesseract") throw err;
    }
  }

  return { text: "", provider: "none" };
}

export async function ocrImageBuffer(
  buffer: Buffer,
  mimeType: string,
): Promise<OcrResult> {
  const mime = mimeType.startsWith("image/") ? mimeType : "image/jpeg";
  const dataUrl = `data:${mime};base64,${buffer.toString("base64")}`;
  return ocrImageDataUrls([dataUrl]);
}
