import { NextRequest, NextResponse } from "next/server";
import type OpenAI from "openai";
import { extractDocumentText } from "@/lib/document-extract";
import {
  FINANCIAL_EXTRACT_SYSTEM_PROMPT,
  FinancialExtractSchema,
  buildFinancialExtractUserText,
  financialExtractJsonSchema,
  toStructuredExtractJson,
} from "@/lib/financial-extract";
import { getOpenAI, hasOpenAIKey } from "@/lib/openai";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_BYTES = 12 * 1024 * 1024;

/** 本 route 預設 gpt-5；可用 OPENAI_MODEL / OPENAI_ANALYZE_MODEL 覆寫 */
function analyzeModel() {
  return (
    process.env.OPENAI_ANALYZE_MODEL?.trim() ||
    process.env.OPENAI_MODEL?.trim() ||
    "gpt-5"
  );
}

/**
 * POST /api/analyze-document
 * Backend-only OpenAI（禁止 Frontend 直連）
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
            "OPENAI_API_KEY 必須放 Backend（.env.local），不可用 NEXT_PUBLIC_",
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

    const client = getOpenAI();
    const model = analyzeModel();

    const userText = buildFinancialExtractUserText({
      fileName,
      pastedText: extractedText,
      companyNameHint,
    });

    const userContent: Array<OpenAI.Chat.ChatCompletionContentPart> = [
      {
        type: "text",
        text: userText || "請分析這份財務報表，並以指定 JSON 格式輸出。",
      },
    ];

    if (imageUrl) {
      userContent.push({
        type: "image_url",
        image_url: { url: imageUrl },
      });
    }

    const response = await client.chat.completions.create({
      model,
      messages: [
        {
          role: "system",
          content: FINANCIAL_EXTRACT_SYSTEM_PROMPT,
        },
        {
          role: "user",
          content: userContent,
        },
      ],
      response_format: {
        type: "json_schema",
        json_schema: financialExtractJsonSchema,
      },
    });

    const raw = response.choices[0]?.message?.content;
    if (!raw) {
      return NextResponse.json(
        { error: "EMPTY_MODEL_RESPONSE", message: "模型沒有回傳內容" },
        { status: 502 },
      );
    }

    const parsed = FinancialExtractSchema.safeParse(JSON.parse(raw));
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

    // ?raw=1 → 只回指定 JSON
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
      model,
      fileName,
      mimeType,
      extractMethod,
      extract,
      // 扁平欄位 = 指定 JSON
      company_name: extract.company_name,
      financial_year: extract.financial_year,
      revenue: extract.revenue,
      EBITDA: extract.EBITDA,
      net_profit: extract.net_profit,
      existing_debt: extract.existing_debt,
      analysis,
      usage: response.usage ?? null,
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
            "未能從 PDF 抽出文字（可能是掃描影像）。請改上清晰照片，或貼上文字內容。",
        },
        { status: 422 },
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
    console.error("[analyze-document]", err);
    return NextResponse.json(
      {
        error: "ANALYZE_FAILED",
        message: "分析失敗，請稍後重試或聯絡顧問。",
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
