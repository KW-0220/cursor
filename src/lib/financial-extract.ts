import { z } from "zod";
import {
  ebitdaCoversTotalDebtPayments,
  ebitdaFromComponents,
  FORMULA_DEFINITIONS,
} from "@/lib/formulas";

/**
 * 財務文件抽取 — 輸出格式：
 * 核心欄 + EBITDA 組成項（系統用硬編碼公式重算 EBITDA）
 *
 * 權威來源：Audited Financial Statements
 * EBITDA = Net Profit + Interest Expense + Tax Expense + Depreciation + Amortisation
 * 硬規則：EBITDA > Total Debt payments
 *
 * 缺資料必須 null，不可猜測。
 */

const nullableNumber = z.number().nullable();

export const FinancialExtractSchema = z.object({
  company_name: z.string().nullable(),
  financial_year: z
    .union([z.string(), z.number()])
    .nullable()
    .transform((v) => (v == null ? null : String(v))),
  revenue: nullableNumber,
  /** 可被系統用組成項覆寫 */
  EBITDA: nullableNumber,
  net_profit: nullableNumber,
  existing_debt: nullableNumber,
  // —— EBITDA 組成（AI 抽取；系統重算；缺省 null）——
  earning_before_tax: nullableNumber.default(null),
  interest: nullableNumber.default(null),
  tax: nullableNumber.default(null),
  depreciation: nullableNumber.default(null),
  amortisation: nullableNumber.default(null),
  /** 一年總債務供款 Total Debt payments（若文件／上下文有） */
  total_debt_payments: nullableNumber.default(null),
});

export type FinancialExtract = z.infer<typeof FinancialExtractSchema>;

export type EbitdaCoverageAnalysis = {
  formula: string;
  coverageRule: string;
  ebitdaComputed: number | null;
  ebitdaSource: "computed" | "disclosed" | "none";
  totalDebtPayments: number | null;
  coversDebtPayments: boolean | null;
  components: {
    earning_before_tax: number | null;
    interest: number | null;
    tax: number | null;
    depreciation: number | null;
    amortisation: number | null;
  };
};

export type DocKind =
  | "br"
  | "nar1"
  | "bank"
  | "financial"
  | "audited"
  | "identity"
  | "auto";

export function normalizeDocKind(raw: unknown): DocKind {
  const v = String(raw ?? "")
    .trim()
    .toLowerCase();
  if (
    v === "br" ||
    v === "nar1" ||
    v === "bank" ||
    v === "financial" ||
    v === "audited" ||
    v === "identity"
  ) {
    return v;
  }
  // aliases
  if (v === "audit" || v === "audited_report" || v === "audit_report") {
    return "audited";
  }
  if (v === "id" || v === "hkid" || v === "passport" || v === "identity_doc") {
    return "identity";
  }
  return "auto";
}

export const financialExtractJsonSchema = {
  name: "financial_document_extract",
  strict: true,
  schema: {
    type: "object",
    additionalProperties: false,
    properties: {
      company_name: { type: ["string", "null"] },
      financial_year: { type: ["string", "null"] },
      revenue: { type: ["number", "null"] },
      EBITDA: { type: ["number", "null"] },
      net_profit: { type: ["number", "null"] },
      existing_debt: { type: ["number", "null"] },
      earning_before_tax: { type: ["number", "null"] },
      interest: { type: ["number", "null"] },
      tax: { type: ["number", "null"] },
      depreciation: { type: ["number", "null"] },
      amortisation: { type: ["number", "null"] },
      total_debt_payments: { type: ["number", "null"] },
    },
    required: [
      "company_name",
      "financial_year",
      "revenue",
      "EBITDA",
      "net_profit",
      "existing_debt",
      "earning_before_tax",
      "interest",
      "tax",
      "depreciation",
      "amortisation",
      "total_debt_payments",
    ],
  },
} as const;

const JSON_SHAPE = `{
  "company_name": string | null,
  "financial_year": string | null,
  "revenue": number | null,
  "EBITDA": number | null,
  "net_profit": number | null,
  "existing_debt": number | null,
  "earning_before_tax": number | null,
  "interest": number | null,
  "tax": number | null,
  "depreciation": number | null,
  "amortisation": number | null,
  "total_debt_payments": number | null
}`;

const EBITDA_RULES = `EBITDA 規則（必須遵守；Audited Report 係最權威來源）：
- 系統硬編碼公式：${FORMULA_DEFINITIONS.ebitda}
- 來源指引：${FORMULA_DEFINITIONS.ebitdaSources}
- 請分別抽取：net_profit（損益表最底）、interest（利息／財務費用）、tax（利得稅）、depreciation、amortisation（無則 0）
- earning_before_tax（除稅前溢利）可一併抽出供比較，但 EBITDA 重算以 net_profit 為準，唔用 EBT
- 若文件直接寫 EBITDA，可填 EBITDA 欄；組成項仍盡量抽出供系統覆核
- 硬規則：${FORMULA_DEFINITIONS.ebitdaDebtCover}
- total_debt_payments = 一年總債務供款（例如各項月供×12 之合計；文件無則 null）
- 你只負責抽取數字，不要自行用其他定義重算／改寫公式`;

const COMMON_RULES = `重要規則：
- 只根據使用者訊息內提供的文字／圖片抽取，禁止上網搜尋、禁止開啟或下載任何外部檔案。
- 不要猜測不存在的資料。文件沒有的欄位必須填 null。
- 即使資料很少，也要立即回傳 JSON（缺欄位用 null），不要繼續研究。
- 金額為純數字（例如 6200000），不要貨幣符號、不要逗號、不要字串。
- 不可承諾批核，不可寫「保證批出／拒絕」。

${EBITDA_RULES}

只以 JSON 輸出（不要加其他文字）：
${JSON_SHAPE}`;

/** 對齊產品要求嘅 system prompt（再加 JSON schema 約束） */
export const FINANCIAL_EXTRACT_SYSTEM_PROMPT = `你是一個香港中小企貸款審批助手。

請分析財務文件（尤其 Audited Report），抽取：

1. 公司名稱（company_name）
2. 財政年度（financial_year）
3. Revenue（revenue）
4. EBITDA 組成及（如有）披露值
5. Net Profit（net_profit）
6. Existing Debt（existing_debt）
7. Total Debt payments（total_debt_payments，一年債務供款）

${COMMON_RULES}`;

export function buildExtractSystemPrompt(kind: DocKind): string {
  if (kind === "br") {
    return `你是一個香港中小企貸款審批助手。

文件類型：商業登記證（BR）。
BR 通常只有公司名稱／商業登記號碼，沒有 Revenue、EBITDA、Net Profit、Existing Debt。

請抽取：
- company_name：公司名稱（英文或中文）
- 其餘欄位一律填 null（不要猜測）

${COMMON_RULES}`;
  }

  if (kind === "nar1") {
    return `你是一個香港中小企貸款審批助手。

文件類型：公司註冊處周年申報表（NAR1）。
NAR1 通常有公司名稱／股本／董事，沒有完整損益表數字。

請抽取：
- company_name：公司名稱
- 若文件明確寫有財政年度可填 financial_year，否則 null
- revenue / EBITDA / net_profit / existing_debt／組成項：除非文件明確列出數字，否則 null

${COMMON_RULES}`;
  }

  if (kind === "bank") {
    return `你是一個香港中小企貸款審批助手。

文件類型：銀行月結單（PDF 文字層或頁面影像）。
銀行月結通常沒有 EBITDA／Net Profit；請按以下對應抽取：

- company_name：戶名／公司名（若有）
- financial_year：月結期間（例如 2024-06 或 2024）
- revenue：該月「存入合計／Total credits／總貸方」金額（月流入）；找不到則 null
- existing_debt：若見到貸款／透支／分期結欠合計則填，否則 null
- EBITDA、net_profit、earning_before_tax、interest、tax、depreciation、amortisation：通常 null
- total_debt_payments：若見到明確貸款月供可年化（×12）則填，否則 null

不要把期末結餘當成 revenue。不要上網搜尋。

${COMMON_RULES}`;
  }

  if (kind === "audited" || kind === "financial") {
    return `你是一個香港中小企貸款審批助手。

文件類型：Audited Report／財務報表。
請優先抽取 EBITDA 組成（EBT、Interest、Tax、Depreciation、Amortisation）及最近年度盈利數字。
完整三年結構抽取請用 docKind=audited 專用流程。

${COMMON_RULES}`;
  }

  return FINANCIAL_EXTRACT_SYSTEM_PROMPT;
}

export function buildFinancialExtractUserText(input: {
  fileName?: string;
  pastedText?: string;
  companyNameHint?: string;
  docKind?: DocKind;
}) {
  const kind = input.docKind ?? "auto";
  const lead =
    kind === "br"
      ? "請分析這份商業登記證（BR）"
      : kind === "nar1"
        ? "請分析這份 NAR1"
        : kind === "bank"
          ? "請分析這份銀行月結單"
          : "請分析這份財務文件（請抽出 EBITDA 組成項：EBT、Interest、Tax、D、A）";

  const parts = [
    lead,
    input.fileName ? `檔名：${input.fileName}` : null,
    `文件類型標記：${kind}`,
    input.companyNameHint ? `申請公司提示：${input.companyNameHint}` : null,
    input.pastedText
      ? `以下為文件文字／OCR 內容（可能不完整）：\n---\n${input.pastedText.slice(0, 100_000)}\n---`
      : null,
  ].filter(Boolean);
  return parts.join("\n\n");
}

/**
 * 用硬編碼公式覆寫 EBITDA，並計覆蓋結果。
 * 組成項齊 → 覆寫 EBITDA；否則保留披露值。
 */
export function applyHardcodedEbitdaFormulas(
  extract: FinancialExtract,
): {
  extract: FinancialExtract;
  ebitdaAnalysis: EbitdaCoverageAnalysis;
} {
  const normalized = toStructuredExtractJson(extract);
  const components = {
    earning_before_tax: normalized.earning_before_tax,
    interest: normalized.interest,
    tax: normalized.tax,
    depreciation: normalized.depreciation,
    amortisation: normalized.amortisation,
  };

  // 權威算法：Net Profit + Interest + Tax + D + A（唔用 EBT）
  const computed = ebitdaFromComponents(
    normalized.net_profit,
    components.interest,
    components.tax,
    components.depreciation,
    components.amortisation,
  );

  let ebitdaSource: EbitdaCoverageAnalysis["ebitdaSource"] = "none";
  let ebitdaValue: number | null = null;
  const next = { ...normalized };

  if (computed != null) {
    next.EBITDA = computed;
    ebitdaValue = computed;
    ebitdaSource = "computed";
  } else if (normalized.EBITDA != null) {
    ebitdaValue = normalized.EBITDA;
    ebitdaSource = "disclosed";
  }

  const totalDebt = normalized.total_debt_payments;
  const covers = ebitdaCoversTotalDebtPayments(ebitdaValue, totalDebt);

  return {
    extract: next,
    ebitdaAnalysis: {
      formula: FORMULA_DEFINITIONS.ebitda,
      coverageRule: FORMULA_DEFINITIONS.ebitdaDebtCover,
      ebitdaComputed: ebitdaValue,
      ebitdaSource,
      totalDebtPayments: totalDebt,
      coversDebtPayments: covers,
      components,
    },
  };
}

/** 給前端／申請人睇：點解好多欄係 null */
export function buildExtractHint(input: {
  docKind: DocKind;
  extract: FinancialExtract;
  textLength: number;
  textPreview: string;
  extractMethod?: string;
  ebitdaAnalysis?: EbitdaCoverageAnalysis | null;
}): string | null {
  const { docKind, extract, textLength, textPreview, extractMethod, ebitdaAnalysis } =
    input;
  const hasFinance =
    extract.revenue != null ||
    extract.EBITDA != null ||
    extract.net_profit != null ||
    extract.existing_debt != null;
  const usedVision =
    extractMethod === "pdf_vision" || extractMethod === "image";

  if (docKind === "br") {
    if (extract.company_name && !hasFinance) {
      return "已讀到 BR。通常只有公司名，不會有 revenue／EBITDA／純利；財務數字要睇銀行月結或審計報告。";
    }
    if (!extract.company_name && usedVision) {
      return "已用頁面影像辨識，但仍未見到清晰公司名。請改上更清楚嘅 JPG／PNG（成張證、唔好反光）。";
    }
  }

  if (docKind === "nar1") {
    if (extract.company_name && !hasFinance) {
      return "已讀到 NAR1。多數無損益表數字；revenue／EBITDA 請靠銀行月結或財務報表。";
    }
    if (!extract.company_name && usedVision) {
      return "已用頁面影像辨識 NAR1，但仍未抽出公司名。請上完整頁（唔好只封面）或改 JPG／PNG。";
    }
  }

  if (ebitdaAnalysis?.coversDebtPayments === false) {
    return "已計 EBITDA，但未滿足硬規則：EBITDA > Total Debt payments。需顧問覆核還款能力。";
  }
  if (
    ebitdaAnalysis?.ebitdaSource === "computed" &&
    ebitdaAnalysis.coversDebtPayments === true
  ) {
    return "已用 Audited 公式計 EBITDA（Net Profit＋Interest＋Tax＋D＋A），並滿足 EBITDA > Total Debt payments。";
  }
  if (
    ebitdaAnalysis?.ebitdaSource === "computed" &&
    ebitdaAnalysis.totalDebtPayments == null
  ) {
    return "已用 Audited 公式計 EBITDA；未有 Total Debt payments，暫未能判斷覆蓋。";
  }

  if (!hasFinance && textLength > 0 && !usedVision) {
    const hasDigit = /\d{3,}/.test(textPreview);
    if (!hasDigit) {
      return "PDF 有文字層但幾乎沒有金額數字（可能係封面／掃描影像）。系統會嘗試轉圖；若仍失敗請上清晰整頁照片。";
    }
    if (docKind === "bank") {
      return "已讀取月結文字，但未能定位「存入合計／Total credits」。請確認係完整交易月結（非只封面）。";
    }
    return "PDF 已讀取，但文字中找不到可對應的財務欄位；缺欄已填 null（非讀取失敗）。";
  }

  return null;
}

/** 示範 payload（schema 範例） */
export const FINANCIAL_EXTRACT_EXAMPLE: FinancialExtract = {
  company_name: "ABC Limited",
  financial_year: "2025",
  revenue: 6_200_000,
  EBITDA: 850_000,
  net_profit: 420_000,
  existing_debt: 500_000,
  earning_before_tax: 420_000,
  interest: 120_000,
  tax: 80_000,
  depreciation: 180_000,
  amortisation: 50_000,
  total_debt_payments: 600_000,
};

/** 固定輸出順序／欄位（給 UI／下游） */
export function toStructuredExtractJson(
  extract: Partial<FinancialExtract> | null | undefined,
): FinancialExtract {
  return {
    company_name: extract?.company_name ?? null,
    financial_year: extract?.financial_year ?? null,
    revenue: extract?.revenue ?? null,
    EBITDA: extract?.EBITDA ?? null,
    net_profit: extract?.net_profit ?? null,
    existing_debt: extract?.existing_debt ?? null,
    earning_before_tax: extract?.earning_before_tax ?? null,
    interest: extract?.interest ?? null,
    tax: extract?.tax ?? null,
    depreciation: extract?.depreciation ?? null,
    amortisation: extract?.amortisation ?? null,
    total_debt_payments: extract?.total_debt_payments ?? null,
  };
}

/**
 * 多份文件抽取合併：
 * - 文字欄：先填唔覆蓋
 * - revenue：多個月結有值則加總（6 個月流入）
 * - existing_debt：取最大（避免重複加總）
 */
export function mergeFinancialExtracts(
  list: Array<Partial<FinancialExtract> | null | undefined>,
): FinancialExtract {
  const out = toStructuredExtractJson(null);
  const revenues: number[] = [];
  const debts: number[] = [];

  for (const raw of list) {
    if (!raw) continue;
    const e = toStructuredExtractJson(raw);
    if (out.company_name == null && e.company_name != null) {
      out.company_name = e.company_name;
    }
    if (out.financial_year == null && e.financial_year != null) {
      out.financial_year = e.financial_year;
    }
    if (out.EBITDA == null && e.EBITDA != null) out.EBITDA = e.EBITDA;
    if (out.net_profit == null && e.net_profit != null) {
      out.net_profit = e.net_profit;
    }
    if (out.earning_before_tax == null && e.earning_before_tax != null) {
      out.earning_before_tax = e.earning_before_tax;
    }
    if (out.interest == null && e.interest != null) out.interest = e.interest;
    if (out.tax == null && e.tax != null) out.tax = e.tax;
    if (out.depreciation == null && e.depreciation != null) {
      out.depreciation = e.depreciation;
    }
    if (out.amortisation == null && e.amortisation != null) {
      out.amortisation = e.amortisation;
    }
    if (out.total_debt_payments == null && e.total_debt_payments != null) {
      out.total_debt_payments = e.total_debt_payments;
    }
    if (e.revenue != null) revenues.push(e.revenue);
    if (e.existing_debt != null) debts.push(e.existing_debt);
  }

  if (revenues.length === 1) out.revenue = revenues[0];
  else if (revenues.length > 1) {
    out.revenue = revenues.reduce((a, b) => a + b, 0);
  }
  if (debts.length) out.existing_debt = Math.max(...debts);

  return applyHardcodedEbitdaFormulas(out).extract;
}

export function formatStructuredExtractJson(
  extract: Partial<FinancialExtract> | null | undefined,
  space = 2,
) {
  return JSON.stringify(toStructuredExtractJson(extract), null, space);
}
