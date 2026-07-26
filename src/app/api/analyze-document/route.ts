import { NextRequest, NextResponse } from "next/server";
import { extractDocumentText } from "@/lib/document-extract";
import {
  FinancialExtractSchema,
  buildExtractHint,
  buildExtractSystemPrompt,
  buildFinancialExtractUserText,
  normalizeDocKind,
  toStructuredExtractJson,
} from "@/lib/financial-extract";
import {
  BANK_STATEMENT_SYSTEM_PROMPT,
  bankExtractToFinancial,
  buildBankStatementUserText,
  parseBankStatementExtract,
} from "@/lib/bank-statement-extract";
import {
  BR_EXTRACT_SYSTEM_PROMPT,
  brExtractHint,
  brExtractToFinancial,
  buildBrExtractUserText,
  parseBrExtract,
} from "@/lib/br-extract";
import {
  hasOpenAIKey,
  manusRespond,
  parseModelJsonObject,
} from "@/lib/openai";

export const runtime = "nodejs";
export const maxDuration = 60;
/** OpenAI/Manus 不支援 hkg1；強制在新加坡執行 */
export const preferredRegion = ["sin1", "iad1"];

const MAX_BYTES = 12 * 1024 * 1024;

/** 文件分析模型（Manus agent profile） */
function analyzeModel() {
  return (
    process.env.OPENAI_ANALYZE_MODEL?.trim() ||
    process.env.OPENAI_MODEL?.trim() ||
    "manus-1.6"
  );
}

/**
 * POST /api/analyze-document
 * Backend-only Manus Responses API（禁止 Frontend 直連）
 *
 * docKind=bank → bankExtract（現金流 6 大項）+ 兼容 extract
 * docKind=br → brExtract（中／英文名、登記號碼、地址、性質、生效／屆滿）
 * 其他 → extract：company_name / financial_year / revenue / EBITDA / net_profit / existing_debt
 *
 * formData: file / text / companyName / docKind / statementMonth
 * Query: ?raw=1 → 只回主 JSON（無 wrapper）
 */
export async function POST(req: NextRequest) {
  try {
    if (!hasOpenAIKey()) {
      return NextResponse.json(
        {
          error: "MISSING_OPENAI_API_KEY",
          message:
            "MANUS_API_KEY / OPENAI_API_KEY 必須放 Backend（.env.local 或 Vercel Environment Variables），不可用 NEXT_PUBLIC_",
        },
        { status: 503 },
      );
    }

    const formData = await req.formData();
    const file = formData.get("file");
    const rawOnly = new URL(req.url).searchParams.get("raw") === "1";

    const pastedText = String(formData.get("text") ?? "").trim();
    const companyNameHint =
      String(formData.get("companyName") ?? "").trim() || undefined;
    const docKind = normalizeDocKind(
      formData.get("docKind") ?? formData.get("kind"),
    );
    const statementMonth =
      String(formData.get("statementMonth") ?? "").trim() || undefined;

    let fileName = "pasted-text.txt";
    let mimeType = "text/plain";
    let extractedText = pastedText;
    let extractMethod:
      | "pdf"
      | "text"
      | "image"
      | "paste"
      | "pdf_vision" = "paste";
    let imageUrl: string | undefined;
    let imageUrls: string[] = [];

    if (file instanceof File && file.size > 0) {
      if (file.size > MAX_BYTES) {
        return NextResponse.json(
          { error: "FILE_TOO_LARGE", message: "檔案請小於 12MB" },
          { status: 400 },
        );
      }

      fileName = file.name || "upload.bin";
      mimeType = file.type || "application/octet-stream";
      const buffer = Buffer.from(await file.arrayBuffer());

      if (mimeType.startsWith("image/")) {
        extractMethod = "image";
        imageUrl = `data:${mimeType};base64,${buffer.toString("base64")}`;
        extractedText = pastedText;
      } else {
        const extracted = await extractDocumentText({
          buffer,
          fileName,
          mimeType,
          docKind,
        });
        extractMethod =
          extracted.method === "image_placeholder"
            ? "image"
            : extracted.method;
        extractedText = [extracted.text, pastedText]
          .filter(Boolean)
          .join("\n\n");
        imageUrls = extracted.imageUrls;
      }
    }

    if (!extractedText && !imageUrl && imageUrls.length === 0) {
      return NextResponse.json(
        {
          error: "NO_CONTENT",
          message: "請上載 PDF／文字檔／圖片，或貼上文件文字內容。",
        },
        { status: 400 },
      );
    }

    const model = analyzeModel();
    // 切斷與 PDF parser 的引用，避免異常物件進入 prompt
    const plainText = extractedText ? String(extractedText) : "";
    // 對 Manus 隱藏 .pdf 副檔名，避免 agent 試圖「下載／開啟檔案」而拖死
    const manusFileName = fileName.replace(/\.pdf$/i, ".txt");
    const textPreview = plainText.slice(0, 1200);
    const hasVision = Boolean(imageUrls.length || imageUrl);

    /** —— 銀行月結：現金流 6 大項 —— */
    if (docKind === "bank") {
      const bankUser = buildBankStatementUserText({
        fileName: manusFileName,
        statementMonth,
        companyNameHint,
        pastedText: plainText,
      });
      const manus = await manusRespond({
        system: BANK_STATEMENT_SYSTEM_PROMPT,
        userText: hasVision
          ? `${bankUser}\n\n（已附月結頁面影像，請一併辨識結餘／進帳／異常。）`
          : bankUser,
        imageUrl,
        imageUrls,
        maxWaitMs: 50_000,
        pollMs: 1500,
      });

      let parsedJson: unknown;
      try {
        parsedJson = parseModelJsonObject(manus.text);
      } catch {
        return NextResponse.json(
          {
            error: "INVALID_MODEL_JSON",
            message: "銀行月結模型回傳格式不符，請重試",
            detail: manus.text.slice(0, 500),
          },
          { status: 502 },
        );
      }

      const parsed = parseBankStatementExtract(parsedJson, statementMonth);
      if (!parsed.ok) {
        return NextResponse.json(
          {
            error: "INVALID_MODEL_JSON",
            message: "銀行月結模型回傳格式不符，請重試",
            detail: parsed.error,
            rawPreview: manus.text.slice(0, 500),
          },
          { status: 502 },
        );
      }

      const bankExtract = parsed.data;
      const extract = bankExtractToFinancial(bankExtract);

      if (rawOnly) {
        return NextResponse.json(bankExtract);
      }

      return NextResponse.json({
        ok: true,
        model: manus.model || model,
        provider: "manus",
        taskId: manus.id,
        fileName,
        mimeType,
        docKind,
        statementMonth: bankExtract.month ?? statementMonth ?? null,
        extractMethod,
        textLength: plainText.length,
        textPreview,
        extractHint:
          bankExtract.total_credits == null &&
          bankExtract.opening_balance == null
            ? "已讀月結，但未能定位結餘／進帳。請確認係完整交易月結（非只封面）。"
            : "已抽取本月現金流／結餘／進帳／異常／還款能力（供六個月合併）。",
        bankExtract,
        extract,
        company_name: extract.company_name,
        financial_year: extract.financial_year,
        revenue: extract.revenue,
        EBITDA: extract.EBITDA,
        net_profit: extract.net_profit,
        existing_debt: extract.existing_debt,
        analysis: {
          documentType: "bank_statement" as const,
          overall: "amber" as const,
          summary: [
            bankExtract.month,
            bankExtract.bank_name,
            bankExtract.total_credits != null
              ? `存入 ${bankExtract.total_credits}`
              : null,
          ]
            .filter(Boolean)
            .join(" · "),
          applicantFacingMessage:
            "已完成銀行月結初步現金流抽取，供顧問覆核。AI 不直接決定批出貸款。",
        },
        disclaimer:
          "此建議只供初步參考，實際貸款條件及批核結果由相關貸款機構決定。",
      });
    }

    /** —— 商業登記證 BR —— */
    if (docKind === "br") {
      const brUser = buildBrExtractUserText({
        fileName: manusFileName,
        companyNameHint,
        pastedText: plainText,
      });
      const manus = await manusRespond({
        system: BR_EXTRACT_SYSTEM_PROMPT,
        userText: hasVision
          ? `${brUser}\n\n（已附 BR 頁面影像，請一併辨識中英文名稱、登記號碼、地址、日期。）`
          : brUser,
        imageUrl,
        imageUrls,
        maxWaitMs: 50_000,
        pollMs: 1500,
      });

      let parsedJson: unknown;
      try {
        parsedJson = parseModelJsonObject(manus.text);
      } catch {
        return NextResponse.json(
          {
            error: "INVALID_MODEL_JSON",
            message: "BR 模型回傳格式不符，請重試",
            detail: manus.text.slice(0, 500),
          },
          { status: 502 },
        );
      }

      const parsed = parseBrExtract(parsedJson);
      if (!parsed.ok) {
        return NextResponse.json(
          {
            error: "INVALID_MODEL_JSON",
            message: "BR 模型回傳格式不符，請重試",
            detail: parsed.error,
            rawPreview: manus.text.slice(0, 500),
          },
          { status: 502 },
        );
      }

      const brExtract = parsed.data;
      const extract = brExtractToFinancial(brExtract);

      if (rawOnly) {
        return NextResponse.json(brExtract);
      }

      return NextResponse.json({
        ok: true,
        model: manus.model || model,
        provider: "manus",
        taskId: manus.id,
        fileName,
        mimeType,
        docKind,
        extractMethod,
        textLength: plainText.length,
        textPreview,
        extractHint: brExtractHint(brExtract),
        brExtract,
        extract,
        company_name: extract.company_name,
        financial_year: extract.financial_year,
        revenue: extract.revenue,
        EBITDA: extract.EBITDA,
        net_profit: extract.net_profit,
        existing_debt: extract.existing_debt,
        // 頂層亦放 BR 欄位，方便前端直接讀
        company_name_zh: brExtract.company_name_zh,
        company_name_en: brExtract.company_name_en,
        br_number: brExtract.br_number,
        business_address: brExtract.business_address,
        business_nature: brExtract.business_nature,
        effective_date: brExtract.effective_date,
        expiry_date: brExtract.expiry_date,
        analysis: {
          documentType: "br" as const,
          overall: "amber" as const,
          summary: [
            brExtract.company_name_en || brExtract.company_name_zh,
            brExtract.br_number,
            brExtract.expiry_date ? `屆滿 ${brExtract.expiry_date}` : null,
          ]
            .filter(Boolean)
            .join(" · "),
          applicantFacingMessage:
            "已完成商業登記證初步抽取，供顧問覆核。AI 不直接決定批出貸款。",
        },
        disclaimer:
          "此建議只供初步參考，實際貸款條件及批核結果由相關貸款機構決定。",
      });
    }

    const userText =
      buildFinancialExtractUserText({
        fileName: manusFileName,
        pastedText: plainText,
        companyNameHint,
        docKind,
      }) || "請分析這份財務文件";

    /**
     * Manus Responses API（OpenAI SDK compatible）
     * baseURL: https://api.manus.im/v1
     * header: API_KEY
     */
    const manus = await manusRespond({
      system: buildExtractSystemPrompt(docKind),
      userText: hasVision
        ? `${userText}\n\n（已附文件頁面影像，請一併辨識公司名稱等欄位。）`
        : userText,
      imageUrl,
      imageUrls,
      maxWaitMs: 50_000,
      pollMs: 1500,
    });

    let parsedJson: unknown;
    try {
      parsedJson = parseModelJsonObject(manus.text);
    } catch {
      return NextResponse.json(
        {
          error: "INVALID_MODEL_JSON",
          message: "模型回傳格式不符，請重試",
          detail: manus.text.slice(0, 500),
        },
        { status: 502 },
      );
    }

    const parsed = FinancialExtractSchema.safeParse(parsedJson);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "INVALID_MODEL_JSON",
          message: "模型回傳格式不符，請重試",
          details: parsed.error.flatten(),
        },
        { status: 502 },
      );
    }

    const extract = toStructuredExtractJson(parsed.data);
    const extractHint = buildExtractHint({
      docKind,
      extract,
      textLength: plainText.length,
      textPreview,
      extractMethod,
    });

    if (rawOnly) {
      return NextResponse.json(extract);
    }

    const filled = [
      extract.company_name && "company_name",
      extract.financial_year && "financial_year",
      extract.revenue != null && "revenue",
      extract.EBITDA != null && "EBITDA",
      extract.net_profit != null && "net_profit",
      extract.existing_debt != null && "existing_debt",
    ].filter((x): x is string => Boolean(x));

    const missing = [
      !extract.company_name && "company_name",
      !extract.financial_year && "financial_year",
      extract.revenue == null && "revenue",
      extract.EBITDA == null && "EBITDA",
      extract.net_profit == null && "net_profit",
      extract.existing_debt == null && "existing_debt",
    ].filter((x): x is string => Boolean(x));

    const analysis = {
      documentType: "audit_report" as const,
      overall: "amber" as const,
      summary: [
        extract.company_name ?? "未能抽出公司名稱",
        extract.financial_year ? `FY ${extract.financial_year}` : null,
        extract.revenue != null ? `Revenue ${extract.revenue}` : null,
      ]
        .filter(Boolean)
        .join(" · "),
      companyNameGuess: extract.company_name,
      extracted: {
        revenueByYear: extract.financial_year
          ? [
              {
                year: extract.financial_year,
                amountHkd: extract.revenue,
              },
            ]
          : [],
        monthlyInflows: [],
        existingDebts:
          extract.existing_debt != null
            ? [
                {
                  lender: "（文件合計／未分項）",
                  outstandingHkd: extract.existing_debt,
                  monthlyPaymentHkd: null,
                },
              ]
            : [],
        bouncedCheques: null,
        notes: [
          extract.EBITDA != null ? `EBITDA: ${extract.EBITDA}` : null,
          extract.net_profit != null
            ? `Net Profit: ${extract.net_profit}`
            : null,
        ].filter((n): n is string => Boolean(n)),
      },
      completeness: {
        ok: filled,
        issues: missing.map((k) => `缺少 ${k}`),
      },
      ruleHits: [],
      confidence: missing.length === 0 ? 0.85 : 0.55,
      needsHumanReview: missing.length > 0,
      applicantFacingMessage:
        "已完成財務文件初步抽取，供顧問覆核。AI 不直接決定批出貸款。",
    };

    return NextResponse.json({
      ok: true,
      model: manus.model || model,
      provider: "manus",
      taskId: manus.id,
      fileName,
      mimeType,
      docKind,
      extractMethod,
      textLength: plainText.length,
      textPreview,
      extractHint,
      extract,
      company_name: extract.company_name,
      financial_year: extract.financial_year,
      revenue: extract.revenue,
      EBITDA: extract.EBITDA,
      net_profit: extract.net_profit,
      existing_debt: extract.existing_debt,
      analysis,
      disclaimer:
        "此建議只供初步參考，實際貸款條件及批核結果由相關貸款機構決定。",
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "UNKNOWN_ERROR";
    if (message === "PDF_EMPTY_TEXT" || message.startsWith("PDF_RENDER_FAILED")) {
      return NextResponse.json(
        {
          error: "PDF_EMPTY_TEXT",
          message:
            "此 PDF 似係掃描影像且轉圖失敗。請改上清晰 JPG／PNG 照片（BR／NAR1 建議影晒成張證），或貼上可見文字。",
          detail: message,
        },
        { status: 422 },
      );
    }
    if (message === "PDF_PARSER_UNAVAILABLE") {
      return NextResponse.json(
        {
          error: "PDF_PARSER_UNAVAILABLE",
          message: "PDF 解析模組未能載入，請稍後再試或改上 JPG／PNG。",
        },
        { status: 500 },
      );
    }
    if (message === "UNSUPPORTED_FILE_TYPE") {
      return NextResponse.json(
        {
          error: "UNSUPPORTED_FILE_TYPE",
          message: "暫支援 PDF、文字檔、圖片（JPG/PNG/WEBP）。",
        },
        { status: 415 },
      );
    }
    if (message === "MANUS_TIMEOUT") {
      return NextResponse.json(
        {
          error: "MANUS_TIMEOUT",
          message: "Manus 分析逾時，請稍後再試。",
        },
        { status: 504 },
      );
    }
    console.error("[analyze-document]", err);
    const looksLikePdfRuntime =
      /DOMMatrix|pdf\.worker|fake worker|pdfjs|pdf-parse/i.test(message);
    return NextResponse.json(
      {
        error: "ANALYZE_FAILED",
        message: looksLikePdfRuntime
          ? "無法讀取此 PDF（伺服器解析失敗）。請改上清晰 JPG／PNG，或貼上文字內容後再分析。"
          : "分析失敗，請稍後重試或聯絡顧問。",
        detail: message,
      },
      { status: 500 },
    );
  }
}

/** GET：回傳 JSON schema 範例 */
export async function GET() {
  return NextResponse.json({
    company_name: "ABC Limited",
    financial_year: "2025",
    revenue: 6200000,
    EBITDA: 850000,
    net_profit: 420000,
    existing_debt: 500000,
  });
}
