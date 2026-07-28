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
 * opts.pageNumbers：1-based 頁碼；未提供則渲 1..maxPages
 */
export async function renderPdfPagesAsJpegDataUrls(
  buffer: Buffer,
  opts?: {
    maxPages?: number;
    scale?: number;
    quality?: number;
    pageNumbers?: number[];
  },
): Promise<{ imageUrls: string[]; pageCount: number; renderedPages: number[] }> {
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
  const pages =
    opts?.pageNumbers && opts.pageNumbers.length
      ? [...new Set(opts.pageNumbers)]
          .filter((n) => n >= 1 && n <= pageCount)
          .slice(0, maxPages)
      : Array.from({ length: Math.min(pageCount, maxPages) }, (_, i) => i + 1);
  const imageUrls: string[] = [];

  try {
    for (const pageNum of pages) {
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

  return { imageUrls, pageCount, renderedPages: pages };
}

/** Audited：損益表／收益表頁評分（越高越優先渲給 Vision） */
export function scoreAuditedFinancialPage(text: string): number {
  const t = text.toLowerCase();
  let score = 0;
  const hits: Array<[RegExp, number]> = [
    [/statement of profit|statement of comprehensive income|income statement|損益表|全面收益表|綜合收益/, 8],
    [/turnover|revenue|營業額|收益(?!表)/, 5],
    [/profit before tax|除稅前|除稅前溢利|pbt/, 5],
    [/net profit|profit for the year|年度溢利|純利|淨利潤|淨溢利/, 5],
    [/finance costs?|利息支出|財務費用|interest expense/, 3],
    [/depreciation|amortisation|amortization|折舊|攤銷/, 3],
    [/taxation|income tax|利得稅|所得稅/, 2],
    [/cost of sales|毛利|gross profit/, 2],
  ];
  for (const [re, w] of hits) {
    if (re.test(t)) score += w;
  }
  const digits = (text.match(/\d/g) || []).length;
  if (digits >= 40) score += 3;
  else if (digits >= 20) score += 1;
  // 封面／目錄降權
  if (/table of contents|目錄|corporate information|公司資料/.test(t) && score < 8) {
    score -= 4;
  }
  if (/independent auditor|核數師報告|directors.? report|董事會報告/.test(t) && score < 10) {
    score -= 2;
  }
  return score;
}

export function auditedTextHasFinancialFigures(text: string): boolean {
  const body = text.replace(/（PDF 共.*?頁）/g, "").trim();
  if (!body) return false;
  const score = scoreAuditedFinancialPage(body);
  const digits = (body.match(/\d/g) || []).length;
  // 真實報表通常有多組金額；分數夠高 + 一定數量字即可當「有損益內容」
  return score >= 12 && digits >= 12;
}

/** 逐頁抽文字，揀最高分嘅損益相關頁（最多 maxPages） */
export async function selectAuditedVisionPageNumbers(
  buffer: Buffer,
  maxPages = 3,
): Promise<{ pageNumbers: number[]; pageCount: number; scores: number[] }> {
  ensurePdfDomPolyfills();
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const data = new Uint8Array(buffer);
  const loadingTask = pdfjs.getDocument({
    data,
    useSystemFonts: true,
    disableFontFace: true,
  } as Parameters<typeof pdfjs.getDocument>[0]);
  const doc = await loadingTask.promise;
  const pageCount = doc.numPages || 1;
  const scored: { page: number; score: number }[] = [];

  try {
    const scanLimit = Math.min(pageCount, 40);
    for (let pageNum = 1; pageNum <= scanLimit; pageNum++) {
      const page = await doc.getPage(pageNum);
      const tc = await page.getTextContent();
      const text = (tc.items as Array<{ str?: string }>)
        .map((it) => it.str || "")
        .join(" ");
      scored.push({ page: pageNum, score: scoreAuditedFinancialPage(text) });
    }
  } finally {
    const anyDoc = doc as unknown as { cleanup?: () => void };
    try {
      anyDoc.cleanup?.();
    } catch {
      /* ignore */
    }
  }

  scored.sort((a, b) => b.score - a.score || a.page - b.page);
  const top = scored.filter((s) => s.score >= 5).slice(0, maxPages);
  let pageNumbers = top.map((s) => s.page);

  // 找不到損益頁：跳過封面，取中段（常見報表位置）
  if (!pageNumbers.length) {
    if (pageCount <= maxPages) {
      pageNumbers = Array.from({ length: pageCount }, (_, i) => i + 1);
    } else {
      const start = Math.min(Math.max(2, Math.floor(pageCount * 0.25)), pageCount - maxPages + 1);
      pageNumbers = Array.from({ length: maxPages }, (_, i) => start + i);
    }
  }

  // 若揀中嘅頁唔連續，補相鄰頁（損益表常跨兩頁）
  if (pageNumbers.length && pageNumbers.length < maxPages) {
    const base = pageNumbers[0]!;
    for (const n of [base + 1, base + 2, base - 1]) {
      if (pageNumbers.length >= maxPages) break;
      if (n >= 1 && n <= pageCount && !pageNumbers.includes(n)) {
        pageNumbers.push(n);
      }
    }
    pageNumbers.sort((a, b) => a - b);
  }

  return {
    pageNumbers: pageNumbers.slice(0, maxPages),
    pageCount,
    scores: scored.map((s) => s.score),
  };
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

  if (kind === "audited") {
    // 有封面文字但冇損益數字 → 仍視為弱，需要搵損益頁 Vision
    return !auditedTextHasFinancialFigures(body);
  }

  return letters < 8 && digits < 4;
}

export async function extractDocumentText(params: {
  buffer: Buffer;
  fileName: string;
  mimeType: string;
  /** br / nar1 會在文字弱時自動渲頁 Vision */
  docKind?: string;
  /**
   * batch 模式：唔為弱文字強行 render（6 份掃描 PDF 容易 timeout／OOM）
   * 有文字就用文字；無文字回空字串，由上層決定 fallback 單檔分析
   */
  skipVision?: boolean;
  /** 任何解析失敗都回空結果，唔拋錯（batch 用） */
  softFail?: boolean;
}): Promise<ExtractedDocument> {
  const { buffer, fileName, mimeType, docKind, skipVision, softFail } = params;
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

    // BR／NAR1：文字弱時轉頁面圖
    // Audited：文字缺損益數字時，智能揀損益表頁轉圖（唔再死渲頭 4 頁封面）
    const needsVision =
      !skipVision &&
      (docKind === "br" ||
        docKind === "nar1" ||
        (docKind === "audited" && !auditedTextHasFinancialFigures(text)) ||
        (docKind !== "audited" && pdfTextLooksWeak(text, docKind)));
    if (!needsVision) {
      return {
        text:
          text ||
          (skipVision
            ? `（PDF「${fileName}」文字層不足；batch 已略過轉圖）`
            : ""),
        method: "pdf",
        imageUrls: [],
        pageCount,
      };
    }

    const maxPages =
      docKind === "audited"
        ? 3
        : docKind === "nar1"
          ? 3
          : docKind === "bank"
            ? 3
            : 1;
    try {
      let pageNumbers: number[] | undefined;
      if (docKind === "audited") {
        const selected = await selectAuditedVisionPageNumbers(buffer, maxPages);
        pageNumbers = selected.pageNumbers;
        pageCount = selected.pageCount;
      }
      const rendered = await renderPdfPagesAsJpegDataUrls(buffer, {
        maxPages,
        scale: docKind === "bank" ? 1.15 : 1.45,
        pageNumbers,
      });
      const pageNote = pageNumbers?.length
        ? `已轉第 ${pageNumbers.join("、")} 頁影像供 AI 辨識損益表`
        : `文字層空白／過少，已轉頁面影像供 AI 辨識`;
      return {
        text:
          text ||
          `（PDF 共 ${rendered.pageCount} 頁；${pageNote}）`,
        method: "pdf_vision",
        imageUrls: rendered.imageUrls,
        pageCount: rendered.pageCount,
      };
    } catch (err) {
      if (text) {
        // 有少量文字就繼續；無文字則拋出
        return { text, method: "pdf", imageUrls: [], pageCount };
      }
      if (softFail) {
        return {
          text: `（PDF「${fileName}」無法解析文字亦無法轉圖）`,
          method: "pdf",
          imageUrls: [],
          pageCount,
        };
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

  if (softFail) {
    return {
      text: `（無法解析檔案「${fileName}」）`,
      method: "text",
      imageUrls: [],
    };
  }

  throw new Error("UNSUPPORTED_FILE_TYPE");
}
