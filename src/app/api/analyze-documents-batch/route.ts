import { NextRequest, NextResponse } from "next/server";
import { extractDocumentText } from "@/lib/document-extract";
import {
  BANK_BATCH_SYSTEM_PROMPT,
  bankExtractToFinancial,
  buildBankBatchUserText,
  mergeBankStatementExtracts,
  parseBankStatementBatch,
} from "@/lib/bank-statement-extract";
import {
  AUDITED_EXTRACT_SYSTEM_PROMPT,
  auditedExtractHint,
  auditedExtractToFinancial,
  auditedFinancialsIncomplete,
  buildAuditedBatchUserText,
  buildAuditedComparisonRows,
  parseAuditedExtract,
} from "@/lib/audited-report-extract";
import {
  hasOpenAIKey,
  manusRespond,
  parseModelJsonObject,
} from "@/lib/openai";

export const runtime = "nodejs";
/** batch 多檔 OCR + 1 個 Manus task */
export const maxDuration = 120;
export const preferredRegion = ["sin1", "iad1"];

const MAX_BYTES = 12 * 1024 * 1024;
const MAX_BANK_FILES = 6;
const MAX_AUDITED_FILES = 3;

function analyzeModel() {
  return (
    process.env.OPENAI_ANALYZE_MODEL?.trim() ||
    process.env.OPENAI_MODEL?.trim() ||
    "manus-1.6"
  );
}

/**
 * POST /api/analyze-documents-batch
 * batchKind=bank → 最多 6 份月結 → 1 個 Manus task
 * batchKind=audited → 最多 3 份 Audited → 1 個 Manus task
 *
 * formData:
 *   batchKind, companyName
 *   file0..fileN（或 files）
 *   month0..monthN（bank 必填，對應各 file）
 */
export async function POST(req: NextRequest) {
  try {
    if (!hasOpenAIKey()) {
      return NextResponse.json(
        {
          error: "MISSING_OPENAI_API_KEY",
          message: "MANUS_API_KEY / OPENAI_API_KEY 必須放 Backend",
        },
        { status: 503 },
      );
    }

    const form = await req.formData();
    const batchKind = String(form.get("batchKind") ?? "")
      .trim()
      .toLowerCase();
    const companyNameHint =
      String(form.get("companyName") ?? "").trim() || undefined;
    const model = analyzeModel();

    const files: { file: File; month?: string; index: number }[] = [];
    for (let i = 0; i < 8; i++) {
      const f = form.get(`file${i}`) ?? (i === 0 ? form.get("file") : null);
      if (!(f instanceof File) || f.size <= 0) continue;
      if (f.size > MAX_BYTES) {
        return NextResponse.json(
          { error: "FILE_TOO_LARGE", message: `${f.name} 超過 12MB` },
          { status: 400 },
        );
      }
      const month = String(form.get(`month${i}`) ?? "").trim() || undefined;
      files.push({ file: f, month, index: i });
    }
    // also accept repeated "files"
    for (const [key, val] of form.entries()) {
      if (key !== "files" || !(val instanceof File) || val.size <= 0) continue;
      if (files.some((x) => x.file === val)) continue;
      files.push({ file: val, index: files.length });
    }

    if (!files.length) {
      return NextResponse.json({ error: "NO_FILES" }, { status: 400 });
    }

    if (batchKind === "bank") {
      if (files.length > MAX_BANK_FILES) {
        return NextResponse.json(
          { error: "TOO_MANY_FILES", message: "銀行月結最多 6 份" },
          { status: 400 },
        );
      }
      const months = files.map(
        (f, i) => f.month || `unknown-${i + 1}`,
      );

      const parts: Array<{ month: string; fileName: string; text: string }> =
        [];
      let imageUrls: string[] = [];
      let weakTextCount = 0;
      for (let i = 0; i < files.length; i++) {
        const item = files[i]!;
        const buffer = Buffer.from(await item.file.arrayBuffer());
        const extracted = await extractDocumentText({
          buffer,
          fileName: item.file.name || `bank-${i}.pdf`,
          mimeType: item.file.type || "application/pdf",
          docKind: "bank",
          // batch：略過全檔 Vision render，避免掃描 PDF 整批炸掉／逾時
          skipVision: true,
          softFail: true,
        });
        const body = extracted.text.replace(/（PDF.*?）/g, "").trim();
        if (body.length < 40) weakTextCount += 1;
        parts.push({
          month: months[i]!,
          fileName: item.file.name || `bank-${i}.pdf`,
          text: extracted.text,
        });
        if (imageUrls.length < 2 && extracted.imageUrls.length) {
          imageUrls = [...imageUrls, ...extracted.imageUrls].slice(0, 2);
        }
      }

      // 多數月結無文字層 → 告訴前端改逐檔（單檔會做 Vision）
      if (weakTextCount >= Math.ceil(files.length / 2)) {
        return NextResponse.json(
          {
            error: "BATCH_NEEDS_VISION",
            message:
              "銀行月結多數為掃描 PDF（無文字層）。請改用逐檔分析（系統會自動 fallback）。",
            detail: `weakTextCount=${weakTextCount}/${files.length}`,
            retrySequential: true,
          },
          { status: 422 },
        );
      }

      const manus = await manusRespond({
        system: BANK_BATCH_SYSTEM_PROMPT,
        userText: buildBankBatchUserText({
          companyNameHint,
          months,
          parts,
        }),
        imageUrls,
        maxWaitMs: 100_000,
        pollMs: 2000,
      });

      let parsedJson: unknown;
      try {
        parsedJson = parseModelJsonObject(manus.text);
      } catch {
        return NextResponse.json(
          {
            error: "INVALID_MODEL_JSON",
            message: "銀行月結 batch 回傳格式不符",
            detail: manus.text.slice(0, 500),
          },
          { status: 502 },
        );
      }

      const parsed = parseBankStatementBatch(parsedJson, months);
      if (!parsed.ok) {
        return NextResponse.json(
          {
            error: "INVALID_MODEL_JSON",
            message: "銀行月結 batch 解析失敗",
            detail: parsed.error,
            rawPreview: manus.text.slice(0, 500),
          },
          { status: 502 },
        );
      }

      const bankExtracts = parsed.data;
      const brief = mergeBankStatementExtracts(bankExtracts);
      const items = bankExtracts.map((bankExtract, i) => {
        const extract = bankExtractToFinancial(bankExtract);
        const fileName = parts[i]?.fileName || `bank-${i}.pdf`;
        const month = months[i]!;
        const ok =
          bankExtract.total_credits != null ||
          bankExtract.opening_balance != null ||
          bankExtract.closing_balance != null;
        return {
          ok,
          label: `銀行月結單 ${month}`,
          fileName,
          slotKey: `bank:${month}`,
          docKind: "bank" as const,
          statementMonth: month,
          bankExtract,
          extract,
          message: ok
            ? undefined
            : "此月份未能定位結餘／進帳，可重新上載該月後再分析",
        };
      });

      return NextResponse.json({
        ok: true,
        batchKind: "bank",
        model: manus.model || model,
        provider: "manus",
        taskId: manus.id,
        itemCount: items.length,
        items,
        bankExtracts,
        brief,
        extractHint:
          "六個月銀行月結已於同一個 Manus task 抽取；衍生淨現金流／ADB 由系統公式重算。",
        disclaimer:
          "此建議只供初步參考，實際貸款條件及批核結果由相關貸款機構決定。",
      });
    }

    if (batchKind === "audited") {
      if (files.length > MAX_AUDITED_FILES) {
        return NextResponse.json(
          { error: "TOO_MANY_FILES", message: "Audited Report 最多 3 份" },
          { status: 400 },
        );
      }

      const parts: Array<{ fileName: string; text: string }> = [];
      let imageUrls: string[] = [];
      for (let i = 0; i < files.length; i++) {
        const item = files[i]!;
        const buffer = Buffer.from(await item.file.arrayBuffer());
        const extracted = await extractDocumentText({
          buffer,
          fileName: item.file.name || `audited-${i}.pdf`,
          mimeType: item.file.type || "application/pdf",
          docKind: "audited",
          softFail: true,
          // Audited 仍可試 Vision，但 render 失敗唔殺成批
        });
        parts.push({
          fileName: item.file.name || `audited-${i}.pdf`,
          text: extracted.text,
        });
        if (imageUrls.length < 3 && extracted.imageUrls.length) {
          imageUrls = [...imageUrls, ...extracted.imageUrls].slice(0, 3);
        }
      }

      const manus = await manusRespond({
        system: AUDITED_EXTRACT_SYSTEM_PROMPT,
        userText: buildAuditedBatchUserText({ companyNameHint, parts }),
        imageUrls,
        maxWaitMs: 100_000,
        pollMs: 2000,
      });

      let parsedJson: unknown;
      try {
        parsedJson = parseModelJsonObject(manus.text);
      } catch {
        return NextResponse.json(
          {
            error: "INVALID_MODEL_JSON",
            message: "Audited Report batch 回傳格式不符",
            detail: manus.text.slice(0, 500),
          },
          { status: 502 },
        );
      }

      const parsed = parseAuditedExtract(parsedJson);
      if (!parsed.ok) {
        return NextResponse.json(
          {
            error: "INVALID_MODEL_JSON",
            message: "Audited Report batch 解析失敗",
            detail: parsed.error,
            rawPreview: manus.text.slice(0, 500),
          },
          { status: 502 },
        );
      }

      const auditedExtract = parsed.data;
      const extract = auditedExtractToFinancial(auditedExtract);
      const comparisonTable = buildAuditedComparisonRows(auditedExtract);
      const incomplete = auditedFinancialsIncomplete(auditedExtract);

      // 每份上載檔對應一張結果卡（內容共用合併抽取）
      const items = parts.map((p, i) => ({
        ok: !incomplete,
        label: `Audited Report ${i + 1}`,
        fileName: p.fileName,
        slotKey: `audited:${i}`,
        docKind: "audited" as const,
        auditedIndex: i,
        auditedExtract,
        extract,
        extractHint: auditedExtractHint(auditedExtract),
        message: incomplete
          ? "未能抽出損益表數字（營業額／除稅前溢利／淨利潤），請重新上載含損益表的頁面"
          : undefined,
      }));

      return NextResponse.json({
        ok: true,
        batchKind: "audited",
        model: manus.model || model,
        provider: "manus",
        taskId: manus.id,
        itemCount: items.length,
        items,
        auditedExtract,
        comparisonTable,
        extract,
        financialsIncomplete: incomplete,
        extractHint: auditedExtractHint(auditedExtract),
        disclaimer:
          "此建議只供初步參考，實際貸款條件及批核結果由相關貸款機構決定。",
      });
    }

    return NextResponse.json(
      {
        error: "UNKNOWN_BATCH_KIND",
        message: "batchKind 只支援 bank 或 audited（BR 請用 /api/analyze-document）",
      },
      { status: 400 },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "UNKNOWN_ERROR";
    if (message === "MANUS_TIMEOUT") {
      return NextResponse.json(
        {
          error: "MANUS_TIMEOUT",
          message: "Manus batch 分析逾時，請稍後再試或改逐檔分析",
          retrySequential: true,
        },
        { status: 504 },
      );
    }
    console.error("[analyze-documents-batch]", err);
    const pdfFail =
      message.startsWith("PDF_") ||
      /DOMMatrix|pdf\.worker|pdfjs|Invalid PDF/i.test(message);
    return NextResponse.json(
      {
        error: pdfFail ? "PDF_RENDER_FAILED" : "BATCH_ANALYZE_FAILED",
        message: pdfFail
          ? "部份 PDF 無法解析。系統會改逐檔分析（掃描件會轉圖）。"
          : message,
        detail: message,
        retrySequential: true,
      },
      { status: pdfFail ? 422 : 500 },
    );
  }
}
