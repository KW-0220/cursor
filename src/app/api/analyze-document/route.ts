import { NextRequest, NextResponse } from "next/server";
import { extractDocumentText } from "@/lib/document-extract";
import {
  FinancialExtractSchema,
  buildExtractHint,
  buildExtractSystemPrompt,
  buildFinancialExtractUserText,
  normalizeDocKind,
  toStructuredExtractJson,
  applyHardcodedEbitdaFormulas,
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
  AUDITED_EXTRACT_SYSTEM_PROMPT,
  auditedExtractHint,
  auditedExtractToFinancial,
  auditedFinancialsIncomplete,
  buildAuditedComparisonRows,
  buildAuditedCreditMetrics,
  buildAuditedExtractUserText,
  enrichAuditedWithTextHeuristics,
  parseAuditedExtract,
} from "@/lib/audited-report-extract";
import {
  NAR1_EXTRACT_SYSTEM_PROMPT,
  buildNar1ExtractUserText,
  nar1ExtractHint,
  nar1ExtractToFinancial,
  parseNar1Extract,
} from "@/lib/nar1-extract";
import {
  IDENTITY_EXTRACT_SYSTEM_PROMPT,
  buildIdentityExtractUserText,
  identityExtractHint,
  identityExtractToFinancial,
  parseIdentityExtract,
} from "@/lib/identity-extract";
import {
  getLlmProvider,
  getLlmKeySource,
  getGeminiModel,
  hasOpenAIKey,
  manusRespond,
  parseModelJsonObject,
} from "@/lib/openai";

export const runtime = "nodejs";
export const maxDuration = 120;
/** OpenAI/Manus 不支援 hkg1；強制在新加坡執行 */
export const preferredRegion = ["sin1", "iad1"];

const MAX_BYTES = 12 * 1024 * 1024;

/** 文件分析模型（與 openai.ts 正規化一致：flash → flash-lite） */
function analyzeModel() {
  return getGeminiModel();
}

/**
 * POST /api/analyze-document
 * Backend-only Manus Responses API（禁止 Frontend 直連）
 *
 * docKind=bank → bankExtract（現金流 6 大項）+ 兼容 extract
 * docKind=br → brExtract（中／英文名、登記號碼、地址、性質、生效／屆滿）
 * docKind=nar1 → nar1Extract（公司名／CR No.／地址／董事／秘書／股東／股本）
 * docKind=audited → auditedExtract（4.1 報告基本資料 + 4.2 三年盈利比較）
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
          error: "MISSING_GEMINI_API_KEY",
          message:
            "GEMINI_API_KEY 必須放 Backend（.env.local 或 Vercel Environment Variables），不可用 NEXT_PUBLIC_",
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
    const personRole =
      String(formData.get("personRole") ?? "").trim() || undefined;
    const monthlyDebtPaymentsRaw = String(
      formData.get("monthlyDebtPayments") ?? "",
    ).trim();
    const monthlyDebtPayments = monthlyDebtPaymentsRaw
      ? Number(monthlyDebtPaymentsRaw.replace(/,/g, ""))
      : null;

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

    /** —— 銀行月結：現金流 6 大項（Gemini API） —— */
    if (docKind === "bank") {
      const bankUser = buildBankStatementUserText({
        fileName: manusFileName,
        statementMonth,
        companyNameHint,
        pastedText: plainText,
      });
      const bankPrompt = hasVision
        ? `${bankUser}\n\n（已附月結頁面影像，請一併辨識結餘／進帳／異常。）`
        : bankUser;

      async function runBankExtract(userText: string) {
        const manus = await manusRespond({
          system: BANK_STATEMENT_SYSTEM_PROMPT,
          userText,
          imageUrl,
          imageUrls,
          maxWaitMs: 50_000,
          pollMs: 1500,
          jsonMode: true,
          temperature: 0.1,
          maxOutputTokens: 4096,
        });
        let parsedJson: unknown;
        try {
          parsedJson = parseModelJsonObject(manus.text);
        } catch {
          return {
            ok: false as const,
            manus,
            error: "JSON_PARSE",
            detail: manus.text.slice(0, 500),
          };
        }
        const parsed = parseBankStatementExtract(parsedJson, statementMonth);
        if (!parsed.ok) {
          return {
            ok: false as const,
            manus,
            error: parsed.error,
            detail: manus.text.slice(0, 500),
          };
        }
        return { ok: true as const, manus, data: parsed.data };
      }

      let bankResult = await runBankExtract(bankPrompt);
      // 格式不符自動再試一次：要求簡化 daily_balances
      if (!bankResult.ok) {
        bankResult = await runBankExtract(
          `${bankPrompt}\n\n【重試】上一次 JSON 未能通過驗證（${bankResult.error}）。請重新輸出完整銀行月結 JSON；daily_balances 若唔肯定請填 []，金額用純數字。`,
        );
      }

      if (!bankResult.ok) {
        return NextResponse.json(
          {
            error: "INVALID_MODEL_JSON",
            message: "銀行月結模型回傳格式不符，請重試",
            detail: bankResult.error,
            rawPreview: bankResult.detail,
            provider: getLlmProvider(),
            model: bankResult.manus.model || model,
          },
          { status: 502 },
        );
      }

      const manus = bankResult.manus;
      const bankExtract = bankResult.data;
      const extract = bankExtractToFinancial(bankExtract);

      if (rawOnly) {
        return NextResponse.json(bankExtract);
      }

      return NextResponse.json({
        ok: true,
        model: manus.model || model,
        provider: getLlmProvider(),
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
        jsonMode: true,
        temperature: 0.1,
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
        provider: getLlmProvider(),
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

    /** —— Audited Report（最近三年） —— */
    if (docKind === "audited") {
      const auditedUser = buildAuditedExtractUserText({
        fileName: manusFileName,
        companyNameHint,
        pastedText: plainText,
      });
      const manus = await manusRespond({
        system: AUDITED_EXTRACT_SYSTEM_PROMPT,
        userText: hasVision
          ? `${auditedUser}\n\n（已附損益表相關頁面影像，請優先從影像讀取 Turnover／營業額、除稅前溢利、淨利潤；並對照文字層。封面唔夠。）`
          : auditedUser,
        imageUrl,
        imageUrls,
        jsonMode: true,
        temperature: 0.1,
        maxWaitMs: 90_000,
        pollMs: 2000,
      });

      let parsedJson: unknown;
      try {
        parsedJson = parseModelJsonObject(manus.text);
      } catch {
        return NextResponse.json(
          {
            error: "INVALID_MODEL_JSON",
            message: "Audited Report 模型回傳格式不符，請重試",
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
            message: "Audited Report 模型回傳格式不符，請重試",
            detail: parsed.error,
            rawPreview: manus.text.slice(0, 500),
          },
          { status: 502 },
        );
      }

      const auditedExtract = enrichAuditedWithTextHeuristics(
        parsed.data,
        plainText,
      );
      const extract = auditedExtractToFinancial(auditedExtract);
      const comparisonTable = buildAuditedComparisonRows(auditedExtract);
      const incomplete = auditedFinancialsIncomplete(auditedExtract);
      const creditMetrics = buildAuditedCreditMetrics(auditedExtract, {
        monthlyDebtPayments:
          monthlyDebtPayments != null && Number.isFinite(monthlyDebtPayments)
            ? monthlyDebtPayments
            : null,
      });

      if (rawOnly) {
        return NextResponse.json({
          ...auditedExtract,
          comparisonTable,
          creditMetrics,
        });
      }

      return NextResponse.json({
        ok: true,
        model: manus.model || model,
        provider: getLlmProvider(),
        taskId: manus.id,
        fileName,
        mimeType,
        docKind,
        extractMethod,
        textLength: plainText.length,
        textPreview,
        extractHint: auditedExtractHint(auditedExtract),
        auditedExtract,
        comparisonTable,
        creditMetrics,
        financialsIncomplete: incomplete,
        extract,
        company_name: extract.company_name,
        financial_year: extract.financial_year,
        revenue: extract.revenue,
        EBITDA: extract.EBITDA,
        net_profit: extract.net_profit,
        existing_debt: extract.existing_debt,
        analysis: {
          documentType: "audit_report" as const,
          overall: incomplete ? ("red" as const) : ("amber" as const),
          summary: [
            auditedExtract.company_name,
            auditedExtract.auditor_name,
            auditedExtract.audit_opinion_type,
            comparisonTable.length
              ? `${comparisonTable.length} 個財政年度`
              : null,
            creditMetrics.latestEbitdaPolicy != null
              ? `EBITDA(政策) ${creditMetrics.latestEbitdaPolicy}`
              : null,
            incomplete ? "損益數字未抽出" : null,
          ]
            .filter(Boolean)
            .join(" · "),
          applicantFacingMessage: incomplete
            ? "已讀到公司／核數師資料，但未抽出損益表數字。請確認 PDF 含損益表頁，或重新上載該幾頁後再分析。"
            : "已完成 Audited Report 初步抽取（含三年比較／EBITDA／資產負債／Gearing／DSCR），供顧問覆核。AI 不直接決定批出貸款。",
        },
        disclaimer:
          "此建議只供初步參考，實際貸款條件及批核結果由相關貸款機構決定。",
      });
    }

    /** —— 身份證明（HKID／護照） —— */
    if (docKind === "identity") {
      const identityUser = buildIdentityExtractUserText({
        fileName: manusFileName,
        personRole,
        pastedText: plainText,
      });
      const manus = await manusRespond({
        system: IDENTITY_EXTRACT_SYSTEM_PROMPT,
        userText: hasVision
          ? `${identityUser}\n\n（已附證件頁面影像，請一併辨識姓名、證件號碼、日期。）`
          : identityUser,
        imageUrl,
        imageUrls,
        jsonMode: true,
        temperature: 0.1,
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
            message: "身份證明模型回傳格式不符，請重試",
            detail: manus.text.slice(0, 500),
          },
          { status: 502 },
        );
      }

      const parsed = parseIdentityExtract(parsedJson);
      if (!parsed.ok) {
        return NextResponse.json(
          {
            error: "INVALID_MODEL_JSON",
            message: "身份證明模型回傳格式不符，請重試",
            detail: parsed.error,
            rawPreview: manus.text.slice(0, 500),
          },
          { status: 502 },
        );
      }

      const identityExtract = parsed.data;
      const extract = identityExtractToFinancial(identityExtract);

      if (rawOnly) {
        return NextResponse.json(identityExtract);
      }

      return NextResponse.json({
        ok: true,
        model: manus.model || model,
        provider: getLlmProvider(),
        taskId: manus.id,
        fileName,
        mimeType,
        docKind,
        personRole: personRole ?? null,
        extractMethod,
        textLength: plainText.length,
        textPreview,
        extractHint: identityExtractHint(identityExtract),
        identityExtract,
        extract,
        company_name: extract.company_name,
        financial_year: extract.financial_year,
        revenue: extract.revenue,
        EBITDA: extract.EBITDA,
        net_profit: extract.net_profit,
        existing_debt: extract.existing_debt,
        analysis: {
          documentType: "identity" as const,
          overall: "amber" as const,
          summary: [
            personRole,
            identityExtract.doc_type,
            identityExtract.full_name_zh || identityExtract.full_name_en,
            identityExtract.id_number,
          ]
            .filter(Boolean)
            .join(" · "),
          applicantFacingMessage:
            "已完成身份證明初步抽取，供顧問核對董事／股東／擔保人。AI 不直接決定批出貸款。",
        },
        disclaimer:
          "此建議只供初步參考，實際貸款條件及批核結果由相關貸款機構決定。",
      });
    }

    /** —— 周年申報表 NAR1 —— */
    if (docKind === "nar1") {
      const nar1User = buildNar1ExtractUserText({
        fileName: manusFileName,
        companyNameHint,
        pastedText: plainText,
      });
      const manus = await manusRespond({
        system: NAR1_EXTRACT_SYSTEM_PROMPT,
        userText: hasVision
          ? `${nar1User}\n\n（已附 NAR1 頁面影像，請一併辨識公司名、註冊編號、董事、股東、股本。）`
          : nar1User,
        imageUrl,
        imageUrls,
        jsonMode: true,
        temperature: 0.1,
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
            message: "NAR1 模型回傳格式不符，請重試",
            detail: manus.text.slice(0, 500),
          },
          { status: 502 },
        );
      }

      const parsed = parseNar1Extract(parsedJson);
      if (!parsed.ok) {
        return NextResponse.json(
          {
            error: "INVALID_MODEL_JSON",
            message: "NAR1 模型回傳格式不符，請重試",
            detail: parsed.error,
            rawPreview: manus.text.slice(0, 500),
          },
          { status: 502 },
        );
      }

      const nar1Extract = parsed.data;
      const extract = nar1ExtractToFinancial(nar1Extract);

      if (rawOnly) {
        return NextResponse.json(nar1Extract);
      }

      return NextResponse.json({
        ok: true,
        model: manus.model || model,
        provider: getLlmProvider(),
        taskId: manus.id,
        fileName,
        mimeType,
        docKind,
        extractMethod,
        textLength: plainText.length,
        textPreview,
        extractHint: nar1ExtractHint(nar1Extract),
        nar1Extract,
        extract,
        company_name: extract.company_name,
        financial_year: extract.financial_year,
        revenue: extract.revenue,
        EBITDA: extract.EBITDA,
        net_profit: extract.net_profit,
        existing_debt: extract.existing_debt,
        company_number: nar1Extract.company_number,
        registered_office_address: nar1Extract.registered_office_address,
        annual_return_date: nar1Extract.annual_return_date,
        directors: nar1Extract.directors,
        company_secretary: nar1Extract.company_secretary,
        shareholders: nar1Extract.shareholders,
        issued_share_capital: nar1Extract.issued_share_capital,
        analysis: {
          documentType: "nar1" as const,
          overall: "amber" as const,
          summary: [
            nar1Extract.company_name,
            nar1Extract.company_number,
            nar1Extract.directors.length
              ? `董事 ${nar1Extract.directors.length}`
              : null,
            nar1Extract.shareholders.length
              ? `股東 ${nar1Extract.shareholders.length}`
              : null,
          ]
            .filter(Boolean)
            .join(" · "),
          applicantFacingMessage:
            "已完成 NAR1 初步抽取，供顧問覆核。AI 不直接決定批出貸款。",
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
      jsonMode: true,
        temperature: 0.1,
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

    const { extract, ebitdaAnalysis } = applyHardcodedEbitdaFormulas(
      toStructuredExtractJson(parsed.data),
    );
    const extractHint = buildExtractHint({
      docKind,
      extract,
      textLength: plainText.length,
      textPreview,
      extractMethod,
      ebitdaAnalysis,
    });

    if (rawOnly) {
      return NextResponse.json({ ...extract, ebitdaAnalysis });
    }

    const filled = [
      extract.company_name && "company_name",
      extract.financial_year && "financial_year",
      extract.revenue != null && "revenue",
      extract.EBITDA != null && "EBITDA",
      extract.net_profit != null && "net_profit",
      extract.existing_debt != null && "existing_debt",
      extract.earning_before_tax != null && "earning_before_tax",
      extract.interest != null && "interest",
      extract.tax != null && "tax",
      extract.depreciation != null && "depreciation",
    ].filter((x): x is string => Boolean(x));

    const missing = [
      !extract.company_name && "company_name",
      !extract.financial_year && "financial_year",
      extract.revenue == null && "revenue",
      extract.EBITDA == null && "EBITDA",
      extract.net_profit == null && "net_profit",
      extract.existing_debt == null && "existing_debt",
    ].filter((x): x is string => Boolean(x));

    const coverageNote =
      ebitdaAnalysis.coversDebtPayments == null
        ? ebitdaAnalysis.ebitdaComputed == null
          ? "未能計算 EBITDA 覆蓋"
          : "已計 EBITDA；缺 Total Debt payments"
        : ebitdaAnalysis.coversDebtPayments
          ? "EBITDA > Total Debt payments：通過"
          : "EBITDA > Total Debt payments：不通過";

    const analysis = {
      documentType: "audit_report" as const,
      overall:
        ebitdaAnalysis.coversDebtPayments === false
          ? ("red" as const)
          : ("amber" as const),
      summary: [
        extract.company_name ?? "未能抽出公司名稱",
        extract.financial_year ? `FY ${extract.financial_year}` : null,
        extract.revenue != null ? `Revenue ${extract.revenue}` : null,
        extract.EBITDA != null ? `EBITDA ${extract.EBITDA}` : null,
        coverageNote,
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
          `公式：${ebitdaAnalysis.formula}`,
          `硬規則：${ebitdaAnalysis.coverageRule}`,
          extract.EBITDA != null
            ? `EBITDA（${ebitdaAnalysis.ebitdaSource}）: ${extract.EBITDA}`
            : null,
          extract.total_debt_payments != null
            ? `Total Debt payments: ${extract.total_debt_payments}`
            : null,
          coverageNote,
          extract.net_profit != null
            ? `Net Profit: ${extract.net_profit}`
            : null,
        ].filter((n): n is string => Boolean(n)),
      },
      completeness: {
        ok: filled,
        issues: missing.map((k) => `缺少 ${k}`),
      },
      ruleHits: [
        {
          rule: "EBITDA > Total Debt payments",
          status:
            ebitdaAnalysis.coversDebtPayments == null
              ? "amber"
              : ebitdaAnalysis.coversDebtPayments
                ? "green"
                : "red",
          detail: coverageNote,
          suggestion:
            ebitdaAnalysis.coversDebtPayments === false
              ? "請覆核債務供款或補交完整審計損益組成"
              : "供顧問覆核；非正式批核",
        },
      ],
      confidence: missing.length === 0 ? 0.85 : 0.55,
      needsHumanReview:
        missing.length > 0 || ebitdaAnalysis.coversDebtPayments === false,
      applicantFacingMessage:
        "已完成財務文件初步抽取，供顧問覆核。AI 不直接決定批出貸款。EBITDA 以系統公式計算。",
    };

    return NextResponse.json({
      ok: true,
      model: manus.model || model,
      provider: getLlmProvider(),
      taskId: manus.id,
      fileName,
      mimeType,
      docKind,
      extractMethod,
      textLength: plainText.length,
      textPreview,
      extractHint,
      extract,
      ebitdaAnalysis,
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
    if (message === "MANUS_TIMEOUT" || message.startsWith("GEMINI_QUOTA")) {
      return NextResponse.json(
        {
          error: message.startsWith("GEMINI_QUOTA")
            ? "GEMINI_QUOTA"
            : "LLM_TIMEOUT",
          message: message.startsWith("GEMINI_QUOTA")
            ? "Gemini 配額／速率限制（常見於 gemini-3.5-flash）。系統已優先用 flash-lite；請稍後再試，或到 Google AI Studio 檢查 billing／quota。"
            : "AI 分析逾時，請稍後再試。",
          detail: message,
        },
        { status: message.startsWith("GEMINI_QUOTA") ? 429 : 504 },
      );
    }
    if (message === "MISSING_GEMINI_API_KEY") {
      return NextResponse.json(
        {
          error: "MISSING_GEMINI_API_KEY",
          message:
            "未接駁 Gemini：請在 Vercel 設定 GEMINI_API_KEY（Backend only，勿用 NEXT_PUBLIC_）。",
        },
        { status: 503 },
      );
    }
    if (/EMPTY_MODEL|GEMINI_ALL_MODELS_FAILED/i.test(message)) {
      return NextResponse.json(
        {
          error: "GEMINI_EMPTY_RESPONSE",
          message:
            "Gemini 回傳空白（thinking／配額問題）。請重試；若持續失敗請確認 Vercel 已設 GEMINI_MODEL=gemini-3.5-flash-lite。",
          detail: message,
        },
        { status: 502 },
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

/** GET：Gemini 接駁健康檢查；?schema=1 回範例 JSON */
export async function GET(req: NextRequest) {
  if (new URL(req.url).searchParams.get("schema") === "1") {
    return NextResponse.json({
      company_name: "ABC Limited",
      financial_year: "2025",
      revenue: 6200000,
      EBITDA: 930000,
      net_profit: 420000,
      existing_debt: 500000,
      earning_before_tax: 500000,
      interest: 120000,
      tax: 80000,
      depreciation: 180000,
      amortisation: 50000,
      total_debt_payments: 600000,
      ebitdaAnalysis: {
        formula:
          "EBITDA = Earning before tax + Interest + Tax + Depreciation + Amortisation",
        coverageRule: "EBITDA > Total Debt payments",
        ebitdaComputed: 930000,
        coversDebtPayments: true,
      },
    });
  }

  const configured = hasOpenAIKey();
  const provider = getLlmProvider();
  const keySource = getLlmKeySource();
  const model = getGeminiModel();

  let ping: {
    ok: boolean;
    detail?: string;
    latencyMs?: number;
  } = { ok: false };

  if (configured && provider === "gemini") {
    const t0 = Date.now();
    try {
      const r = await manusRespond({
        userText: 'Reply JSON only: {"ok":true}',
        jsonMode: true,
        temperature: 0,
        maxOutputTokens: 64,
        maxWaitMs: 20_000,
      });
      ping = {
        ok: /ok/i.test(r.text),
        detail: r.model,
        latencyMs: Date.now() - t0,
      };
    } catch (e) {
      ping = {
        ok: false,
        detail: e instanceof Error ? e.message : "ping failed",
        latencyMs: Date.now() - t0,
      };
    }
  } else if (!configured) {
    ping = {
      ok: false,
      detail: "MISSING_GEMINI_API_KEY",
    };
  }

  return NextResponse.json({
    ok: configured && provider === "gemini" && ping.ok,
    provider,
    model,
    configured,
    keySource,
    ping,
    endpoint: "POST /api/analyze-document",
    hint:
      !configured
        ? "請在 Vercel Environment Variables 設定 GEMINI_API_KEY（Production + Preview），不可用 NEXT_PUBLIC_"
        : !ping.ok
          ? "Key 已偵測但仍未能呼叫 Gemini（可能配額／模型）。系統會自動用 flash-lite 並 fallback。"
          : `Gemini 已接駁（${model}）。Vercel 若設咗 GEMINI_MODEL=gemini-3.5-flash 會自動改用 flash-lite。`,
  });
}
