export async function extractDocumentText(params: {
  buffer: Buffer;
  fileName: string;
  mimeType: string;
}): Promise<{ text: string; method: "pdf" | "text" | "image_placeholder" }> {
  const { buffer, fileName, mimeType } = params;
  const lower = fileName.toLowerCase();

  if (mimeType === "application/pdf" || lower.endsWith(".pdf")) {
    const mod = await import("pdf-parse");
    const pdfParse =
      (mod as { default?: (data: Buffer) => Promise<{ text: string; numpages?: number }> })
        .default ??
      (mod as unknown as (data: Buffer) => Promise<{ text: string; numpages?: number }>);
    const parsed = await pdfParse(buffer);
    const text = (parsed.text || "").trim();
    if (!text) {
      throw new Error("PDF_EMPTY_TEXT");
    }
    return {
      text: `（PDF 共 ${parsed.numpages ?? "?"} 頁）\n\n${text}`,
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
