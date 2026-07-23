import { NextRequest, NextResponse } from "next/server";
import type OpenAI from "openai";
import { extractDocumentText } from "@/lib/document-extract";
import {
  FINANCIAL_EXTRACT_SYSTEM_PROMPT,
  FinancialExtractSchema,
  buildFinancialExtractUserText,
  financialExtractJsonSchema,
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
 * formData:
 * - file：財務報表（圖／PDF／文字）
 * - text / companyName（可選）
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
        text: userText || "請分析這份財務報表",
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

    const extract = parsed.data;

    // 兼容舊 UI：塞進 analysis 形狀（中性、不表示批核）
    const analysis = {
      documentType: "audit_report" as const,
      overall: "amber" as const,
      summary: [
        extract.companyName ?? "未能抽出公司名稱",
        extract.fiscalYear ? `FY ${extract.fiscalYear}` : null,
        extract.revenue != null ? `Revenue ${extract.revenue}` : null,
      ]
        .filter(Boolean)
        .join(" · "),
      companyNameGuess: extract.companyName,
      extracted: {
        revenueByYear: extract.fiscalYear
          ? [
              {
                year: extract.fiscalYear,
                amountHkd: extract.revenue,
              },
            ]
          : [],
        monthlyInflows: [],
        existingDebts:
          extract.existingDebt != null
            ? [
                {
                  lender: "（文件合計／未分項）",
                  outstandingHkd: extract.existingDebt,
                  monthlyPaymentHkd: null,
                },
              ]
            : [],
        bouncedCheques: null,
        notes: [
          ...extract.notes,
          extract.ebitda != null ? `EBITDA: ${extract.ebitda}` : null,
          extract.netProfit != null ? `Net Profit: ${extract.netProfit}` : null,
        ].filter((n): n is string => Boolean(n)),
      },
      completeness: {
        ok: (
          [
            extract.companyName && "公司名稱",
            extract.fiscalYear && "財政年度",
            extract.revenue != null && "Revenue",
            extract.ebitda != null && "EBITDA",
            extract.netProfit != null && "Net Profit",
            extract.existingDebt != null && "Existing Debt",
          ] as Array<string | false | null>
        ).filter((x): x is string => Boolean(x)),
        issues: (
          [
            !extract.companyName && "缺少公司名稱",
            !extract.fiscalYear && "缺少財政年度",
            extract.revenue == null && "缺少 Revenue",
            extract.ebitda == null && "缺少 EBITDA",
            extract.netProfit == null && "缺少 Net Profit",
            extract.existingDebt == null && "缺少 Existing Debt",
          ] as Array<string | false>
        ).filter((x): x is string => Boolean(x)),
      },
      ruleHits: [],
      confidence: extract.confidence,
      needsHumanReview: extract.confidence < 0.7 || extract.revenue == null,
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
