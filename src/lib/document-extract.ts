/**
 * Server-side document text extraction.
 * 用 unpdf（serverless 友善），避免 pdf-parse/pdfjs worker 在 Vercel 炸掉。
 */

async function extractPdfText(buffer: Buffer): Promise<string> {
  const { extractText, getDocumentProxy } = await import("unpdf");
  const pdf = await getDocumentProxy(new Uint8Array(buffer));
  const parsed = await extractText(pdf, { mergePages: true });
  const raw = Array.isArray(parsed.text) ? parsed.text.join("\n") : parsed.text;
  const text = String(raw || "")
    .replace(/\0/g, "")
    .replace(/[ \t]+\n/g, "\n")
    .trim();

  if (!text) {
    throw new Error("PDF_EMPTY_TEXT");
  }

  const clipped =
    text.length > 80_000 ? `${text.slice(0, 80_000)}\n…(截斷)` : text;
  return `（PDF 共 ${parsed.totalPages ?? "?"} 頁）\n\n${clipped}`;
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
