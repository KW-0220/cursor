import { NextRequest, NextResponse } from "next/server";
import { extractDocumentText } from "@/lib/document-extract";
import {
  FINANCIAL_EXTRACT_SYSTEM_PROMPT,
  FinancialExtractSchema,
  buildFinancialExtractUserText,
  toStructuredExtractJson,
} from "@/lib/financial-extract";
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
 * 成功時 extract（及頂層欄位）固定為：
 * {
 *   company_name, financial_year, revenue, EBITDA, net_profit, existing_debt
 * }
 *
 * formData: file / text / companyName
 * Query: ?raw=1 → 只回上述 JSON（無 wrapper）
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

    let fileName = "pasted-text.txt";
    let mimeType = "text/plain";
    let extractedText = pastedText;
    let extractMethod: "pdf" | "text" | "image" | "paste" = "paste";
    let imageUrl: string | undefined;

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
        });
        extractMethod =
          extracted.method === "image_placeholder" ? "image" : extracted.method;
        extractedText = [extracted.text, pastedText]
          .filter(Boolean)
          .join("\n\n");
      }
    }

    if (!extractedText && !imageUrl) {
      return NextResponse.json(
        {
          error: "NO_CONTENT",
          message: "請上載 PDF／文字檔／圖片，或貼上文件文字內容。",
        },
        { status: 400 },
      );
    }

    const url = new URL(req.url);
    const extractOnly = url.searchParams.get("extractOnly") === "1";
    if (extractOnly) {
      return NextResponse.json({
        ok: true,
        extractOnly: true,
        fileName,
        mimeType,
        extractMethod,
        textLength: extractedText.length,
        textPreview: extractedText.slice(0, 2000),
        hasImage: Boolean(imageUrl),
      });
    }

    // 除錯：PDF 抽字後立即用固定短 prompt 打 Manus，確認 unpdf 有冇污染 fetch
    if (url.searchParams.get("traceManus") === "1") {
      const t0 = Date.now();
      try {
        const ping = await manusRespond({
          system: '只回 JSON：{"company_name":"X","financial_year":null,"revenue":null,"EBITDA":null,"net_profit":null,"existing_debt":null}',
          userText: `ping after ${extractMethod}; textLen=${extractedText.length}`,
          maxWaitMs: 45_000,
          pollMs: 1500,
        });
        return NextResponse.json({
          ok: true,
          traceManus: true,
          extractMethod,
          ms: Date.now() - t0,
          taskId: ping.id,
          status: ping.status,
          text: ping.text.slice(0, 300),
        });
      } catch (e) {
        return NextResponse.json({
          ok: false,
          traceManus: true,
          extractMethod,
          ms: Date.now() - t0,
          error: e instanceof Error ? e.message : "UNKNOWN",
        });
      }
    }

    const model = analyzeModel();
    // 切斷與 PDF parser 的引用，避免異常物件進入 prompt
    const plainText = extractedText ? String(extractedText) : "";
    const userText =
      buildFinancialExtractUserText({
        fileName,
        pastedText: plainText,
        companyNameHint,
      }) || "請分析這份財務報表";

    /**
     * Manus Responses API（OpenAI SDK compatible）
     * baseURL: https://api.manus.im/v1
     * header: API_KEY
     */
    const manus = await manusRespond({
      system: FINANCIAL_EXTRACT_SYSTEM_PROMPT,
      userText,
      imageUrl,
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
      extractMethod,
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
    if (message === "PDF_EMPTY_TEXT") {
      return NextResponse.json(
        {
          error: "PDF_EMPTY_TEXT",
          message:
            "未能從 PDF 抽出文字（可能是掃描影像）。請改上清晰照片／JPG，或貼上文字內容。",
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
