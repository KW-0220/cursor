/**
 * Server-side document text extraction.
 * pdf-parse@2 + pdfjs 在 Node/Vercel 需要 worker + DOM polyfill。
 */

function ensurePdfDomPolyfills() {
  // pdfjs 期望瀏覽器 DOM API；Node/Vercel 用最小 stub 即可抽文字
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

  if (!g.Path2D) {
    g.Path2D = class Path2D {
      addPath() {}
      arc() {}
      arcTo() {}
      bezierCurveTo() {}
      closePath() {}
      ellipse() {}
      lineTo() {}
      moveTo() {}
      quadraticCurveTo() {}
      rect() {}
      roundRect() {}
    };
  }

  if (!g.ImageData) {
    g.ImageData = class ImageData {
      width: number;
      height: number;
      data: Uint8ClampedArray;
      colorSpace = "srgb";
      constructor(w: number, h: number) {
        this.width = w;
        this.height = h;
        this.data = new Uint8ClampedArray(w * h * 4);
      }
    };
  }
}

async function extractPdfText(buffer: Buffer): Promise<string> {
  ensurePdfDomPolyfills();

  // 必須先載入 worker（設定 workerSrc + CanvasFactory），再載入 pdf-parse
  // 否則 Vercel 會找 pdfjs-dist/legacy/build/pdf.worker.mjs 失敗
  const worker = await import("pdf-parse/worker");
  const { PDFParse } = await import("pdf-parse");

  type PdfParser = {
    getText: () => Promise<{ text?: string; total?: number; pages?: unknown[] }>;
    destroy?: () => Promise<void>;
  };

  type PdfParseCtor = {
    new (opts: {
      data: Uint8Array;
      CanvasFactory?: unknown;
    }): PdfParser;
    setWorker?: (src?: string) => string;
  };

  const Ctor = PDFParse as unknown as PdfParseCtor;
  if (typeof Ctor !== "function") {
    throw new Error("PDF_PARSER_UNAVAILABLE");
  }

  try {
    Ctor.setWorker?.(worker.getPath());
  } catch {
    // serverless 路徑解析失敗時改用 inline worker data
    Ctor.setWorker?.(worker.getData());
  }

  const parser = new Ctor({
    data: new Uint8Array(buffer),
    CanvasFactory: worker.CanvasFactory,
  });

  try {
    const parsed = await parser.getText();
    const text = (parsed.text || "").trim();
    if (!text) {
      throw new Error("PDF_EMPTY_TEXT");
    }
    return `（PDF 共 ${parsed.total ?? parsed.pages?.length ?? "?"} 頁）\n\n${text}`;
  } finally {
    await parser.destroy?.().catch(() => undefined);
  }
}

export async function extractDocumentText(params: {
  buffer: Buffer;
  fileName: string;
  mimeType: string;
}): Promise<{ text: string; method: "pdf" | "text" | "image_placeholder" }> {
  const { buffer, fileName, mimeType } = params;
  const lower = fileName.toLowerCase();

  if (mimeType === "application/pdf" || lower.endsWith(".pdf")) {
    const text = await extractPdfText(buffer);
    return { text, method: "pdf" };
  }

  if (
    mimeType.startsWith("text/") ||
    lower.endsWith(".txt") ||
    lower.endsWith(".md") ||
    lower.endsWith(".csv") ||
    lower.endsWith(".json")
  ) {
    return { text: buffer.toString("utf8"), method: "text" };
  }

  if (mimeType.startsWith("image/")) {
    return {
      text: "",
      method: "image_placeholder",
    };
  }

  const asText = buffer.toString("utf8");
  if (asText.replace(/\u0000/g, "").trim().length > 40) {
    return { text: asText, method: "text" };
  }

  throw new Error("UNSUPPORTED_FILE_TYPE");
}
