/**
 * Server-side document text extraction.
 * pdf-parse@2 + pdfjs 在 Node 需要 DOMMatrix 等 polyfill。
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

export async function extractDocumentText(params: {
  buffer: Buffer;
  fileName: string;
  mimeType: string;
}): Promise<{ text: string; method: "pdf" | "text" | "image_placeholder" }> {
  const { buffer, fileName, mimeType } = params;
  const lower = fileName.toLowerCase();

  if (mimeType === "application/pdf" || lower.endsWith(".pdf")) {
    ensurePdfDomPolyfills();
    const mod = await import("pdf-parse");
    const PDFParse = (
      mod as unknown as {
        PDFParse: new (opts: { data: Buffer | Uint8Array }) => {
          getText: () => Promise<{ text?: string; total?: number; pages?: unknown[] }>;
        };
      }
    ).PDFParse;

    if (typeof PDFParse !== "function") {
      throw new Error("PDF_PARSER_UNAVAILABLE");
    }

    const parser = new PDFParse({ data: buffer });
    const parsed = await parser.getText();
    const text = (parsed.text || "").trim();
    if (!text) {
      throw new Error("PDF_EMPTY_TEXT");
    }
    return {
      text: `（PDF 共 ${parsed.total ?? parsed.pages?.length ?? "?"} 頁）\n\n${text}`,
      method: "pdf",
    };
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
