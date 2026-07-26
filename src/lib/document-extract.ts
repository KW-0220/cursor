/**
 * Server-side document text + PDF page render（掃描件 Vision）
 */

export type ExtractedDocument = {
  text: string;
  method: "pdf" | "text" | "image_placeholder" | "pdf_vision";
  /** data:image/jpeg;base64,... 供 Manus vision */
  imageUrls: string[];
  pageCount?: number;
};

function ensurePdfDomPolyfills() {
  const g = globalThis as Record<string, unknown>;
  if (!g.DOMMatrix) {
    g.DOMMatrix = class DOMMatrix {
      constructor(_init?: unknown) {}
      multiplySelf() {
        return this;
      }
      translateSelf() {
        return this;
      }
      scaleSelf() {
        return this;
      }
      inverse() {
        return this;
      }
      transformPoint(p?: { x?: number; y?: number }) {
        return p ?? { x: 0, y: 0 };
      }
      static fromMatrix() {
        return new DOMMatrix();
      }
      static fromFloat32Array() {
        return new DOMMatrix();
      }
      static fromFloat64Array() {
        return new DOMMatrix();
      }
    };
  }
}

async function extractPdfText(
  buffer: Buffer,
): Promise<{ text: string; pageCount: number }> {
  const { extractText, getDocumentProxy } = await import("unpdf");
  const bytes = new Uint8Array(buffer);
  const pdf = await getDocumentProxy(bytes);
  try {
    const parsed = await extractText(pdf, { mergePages: true });
    const raw = Array.isArray(parsed.text)
      ? parsed.text.join("\n")
      : parsed.text;
    const text = String(raw || "")
      .replace(/\0/g, "")
      .replace(/[ \t]+\n/g, "\n")
      .trim();
    const pageCount = Number(parsed.totalPages ?? pdf.numPages ?? 1) || 1;
    const clipped =
      text.length > 80_000 ? `${text.slice(0, 80_000)}\n…(截斷)` : text;
    return {
      text: clipped
        ? `（PDF 共 ${pageCount} 頁）\n\n${clipped}`.slice(0)
        : "",
      pageCount,
    };
  } finally {
    const anyPdf = pdf as { cleanup?: () => Promise<void> | void };
    await Promise.resolve(anyPdf.cleanup?.()).catch(() => undefined);
  }
}

/**
 * 用 pdfjs + @napi-rs/canvas 渲頁成 JPEG（避開 unpdf renderPageAsImage 的 worker clone 問題）
 */
export async function renderPdfPagesAsJpegDataUrls(
  buffer: Buffer,
  opts?: { maxPages?: number; scale?: number; quality?: number },
): Promise<{ imageUrls: string[]; pageCount: number }> {
  ensurePdfDomPolyfills();
  const maxPages = opts?.maxPages ?? 2;
  const scale = opts?.scale ?? 1.4;
  const quality = opts?.quality ?? 0.82;

  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const { createCanvas } = await import("@napi-rs/canvas");

  const data = new Uint8Array(buffer);
  const loadingTask = pdfjs.getDocument({
    data,
    useSystemFonts: true,
    disableFontFace: true,
  } as Parameters<typeof pdfjs.getDocument>[0]);
  const doc = await loadingTask.promise;
  const pageCount = doc.numPages || 1;
  const limit = Math.min(pageCount, maxPages);
  const imageUrls: string[] = [];

  try {
    for (let pageNum = 1; pageNum <= limit; pageNum++) {
      const page = await doc.getPage(pageNum);
      const viewport = page.getViewport({ scale });
      const canvas = createCanvas(
        Math.ceil(viewport.width),
        Math.ceil(viewport.height),
      );
      const ctx = canvas.getContext("2d");
      // pdfjs 版本間 RenderParameters 不一致；runtime 用 canvasContext
      await (
        page.render as unknown as (params: {
          canvasContext: unknown;
          viewport: unknown;
        }) => { promise: Promise<void> }
      )({
        canvasContext: ctx,
        viewport,
      }).promise;
      const jpeg = canvas.toBuffer("image/jpeg", quality);
      // 單張太大會拖垮 Manus；超過 ~3.5MB 再降 quality
      let out = jpeg;
      if (out.length > 3.5 * 1024 * 1024) {
        out = canvas.toBuffer("image/jpeg", 0.55);
      }
      imageUrls.push(`data:image/jpeg;base64,${out.toString("base64")}`);
    }
  } finally {
    const anyDoc = doc as unknown as { cleanup?: () => void };
    try {
      anyDoc.cleanup?.();
    } catch {
      /* ignore */
    }
  }

  return { imageUrls, pageCount };
}

/** 文字層空白／幾乎無可讀字 → 需要 Vision（掃描 PDF） */
export function pdfTextLooksWeak(text: string, kind?: string): boolean {
  const body = text.replace(/（PDF 共.*?頁）/g, "").trim();
  if (!body) return true;

  const letters = (body.match(/[A-Za-z\u4e00-\u9fff]/g) || []).length;
  const digits = (body.match(/\d/g) || []).length;

  // BR／NAR1：有清晰公司名就用文字；掃描空白／亂碼先轉頁面圖
  if (kind === "br" || kind === "nar1") {
    return letters < 10;
  }

  if (kind === "bank") {
    // 月結要有足夠數字；否則當掃描件
    return digits < 12 && letters < 40;
  }

  return letters < 8 && digits < 4;
}

export async function extractDocumentText(params: {
  buffer: Buffer;
  fileName: string;
  mimeType: string;
  /** br / nar1 會在文字弱時自動渲頁 Vision */
  docKind?: string;
}): Promise<ExtractedDocument> {
  const { buffer, fileName, mimeType, docKind } = params;
  const lower = fileName.toLowerCase();

  if (mimeType === "application/pdf" || lower.endsWith(".pdf")) {
    let text = "";
    let pageCount = 1;
    try {
      const extracted = await extractPdfText(buffer);
      text = extracted.text;
      pageCount = extracted.pageCount;
    } catch {
      text = "";
    }

    const needsVision = pdfTextLooksWeak(text, docKind);
    if (!needsVision) {
      return { text, method: "pdf", imageUrls: [], pageCount };
    }

    const maxPages = docKind === "nar1" ? 2 : docKind === "bank" ? 3 : 1;
    try {
      const rendered = await renderPdfPagesAsJpegDataUrls(buffer, {
        maxPages,
        scale: docKind === "bank" ? 1.15 : 1.5,
      });
      return {
        text:
          text ||
          `（PDF 共 ${rendered.pageCount} 頁；文字層空白／過少，已轉頁面影像供 AI 辨識）`,
        method: "pdf_vision",
        imageUrls: rendered.imageUrls,
        pageCount: rendered.pageCount,
      };
    } catch (err) {
      if (text) {
        // 有少量文字就繼續；無文字則拋出
        return { text, method: "pdf", imageUrls: [], pageCount };
      }
      const msg = err instanceof Error ? err.message : "PDF_RENDER_FAILED";
      throw new Error(
        msg.includes("PDF_") ? msg : `PDF_RENDER_FAILED: ${msg.slice(0, 160)}`,
      );
    }
  }

  if (
    mimeType.startsWith("text/") ||
    lower.endsWith(".txt") ||
    lower.endsWith(".md") ||
    lower.endsWith(".csv") ||
    lower.endsWith(".json")
  ) {
    return {
      text: buffer.toString("utf8"),
      method: "text",
      imageUrls: [],
    };
  }

  if (mimeType.startsWith("image/")) {
    return {
      text: "",
      method: "image_placeholder",
      imageUrls: [],
    };
  }

  const asText = buffer.toString("utf8");
  if (asText.replace(/\u0000/g, "").trim().length > 40) {
    return { text: asText, method: "text", imageUrls: [] };
  }

  throw new Error("UNSUPPORTED_FILE_TYPE");
}
