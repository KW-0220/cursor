import { NextRequest, NextResponse } from "next/server";
import type OpenAI from "openai";
import {
  EligibilityAnalysisSchema,
  buildEligibilitySystemPrompt,
  buildEligibilityUserPrompt,
  eligibilityJsonSchema,
} from "@/lib/eligibility";
import { extractDocumentText } from "@/lib/document-extract";
import { getOpenAI, OPENAI_MODEL } from "@/lib/openai";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_BYTES = 12 * 1024 * 1024;

export async function POST(req: NextRequest) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        {
          error: "MISSING_OPENAI_API_KEY",
          message:
            "請在專案根目錄建立 .env.local，設定 OPENAI_API_KEY=sk-...",
        },
        { status: 503 },
      );
    }

    const form = await req.formData();
    const file = form.get("file");
    const pastedText = String(form.get("text") ?? "").trim();
    const loanType = String(form.get("loanType") ?? "") || undefined;
    const purpose = String(form.get("purpose") ?? "") || undefined;
    const companyName = String(form.get("companyName") ?? "") || undefined;
    const amountRaw = String(form.get("amountHkd") ?? "");
    const amountHkd = amountRaw ? Number(amountRaw) : undefined;

    let fileName = "pasted-text.txt";
    let mimeType = "text/plain";
    let extractedText = pastedText;
    let extractMethod: "pdf" | "text" | "image" | "paste" = "paste";
    let imageBase64: string | undefined;
    let imageMediaType: string | undefined;

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
        imageBase64 = buffer.toString("base64");
        imageMediaType = mimeType;
        extractMethod = "image";
        extractedText =
          pastedText ||
          "（已上載影像文件，請直接從圖像辨識財務數字與完整性。）";
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

    if (!extractedText && !imageBase64) {
      return NextResponse.json(
        {
          error: "NO_CONTENT",
          message: "請上載 PDF／文字檔／圖片，或貼上文件文字內容。",
        },
        { status: 400 },
      );
    }

    const openai = getOpenAI();
    const userText = buildEligibilityUserPrompt({
      fileName,
      loanType,
      amountHkd: Number.isFinite(amountHkd) ? amountHkd : undefined,
      purpose,
      companyName,
      extractedText: extractedText || "（無文字，僅圖像）",
    });

    const userContent: Array<OpenAI.Chat.ChatCompletionContentPart> = [
      { type: "text", text: userText },
    ];

    if (imageBase64 && imageMediaType) {
      userContent.push({
        type: "image_url",
        image_url: {
          url: `data:${imageMediaType};base64,${imageBase64}`,
        },
      });
    }

    const completion = await openai.chat.completions.create({
      model: OPENAI_MODEL,
      temperature: 0.2,
      response_format: {
        type: "json_schema",
        json_schema: eligibilityJsonSchema,
      },
      messages: [
        { role: "system", content: buildEligibilitySystemPrompt() },
        { role: "user", content: userContent },
      ],
    });

    const raw = completion.choices[0]?.message?.content;
    if (!raw) {
      return NextResponse.json(
        { error: "EMPTY_MODEL_RESPONSE", message: "模型沒有回傳內容" },
        { status: 502 },
      );
    }

    const parsed = EligibilityAnalysisSchema.safeParse(JSON.parse(raw));
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

    return NextResponse.json({
      ok: true,
      model: OPENAI_MODEL,
      fileName,
      mimeType,
      extractMethod,
      analysis: parsed.data,
      usage: completion.usage ?? null,
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
    console.error("[analyze]", err);
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
