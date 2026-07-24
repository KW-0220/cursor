import {
  analyzeBankCashflow,
  type BankStatementMonthDetail,
  type BankTransaction,
} from "./bank-cashflow";
import { DEFAULT_CASHFLOW_RULES } from "./cashflow-rules";
import {
  evaluateCrossCheck,
  evaluateRequiredDocsProgress,
  getDefaultMandatorySlots,
  type CrossCheckCell,
  type RequiredDocCardStatus,
} from "./required-docs";

function synthDaily(
  month: string,
  opening: number,
  closing: number,
): { date: string; balanceHkd: number }[] {
  const [y, m] = month.split("-").map(Number);
  const n = new Date(y, m, 0).getDate();
  const out: { date: string; balanceHkd: number }[] = [];
  for (let d = 1; d <= n; d++) {
    const t = (d - 1) / Math.max(n - 1, 1);
    const bal = Math.round(opening + (closing - opening) * t);
    out.push({
      date: `${month}-${String(d).padStart(2, "0")}`,
      balanceHkd: bal,
    });
  }
  return out;
}

function tx(
  id: string,
  date: string,
  description: string,
  credit: number | null,
  debit: number | null,
  counterparty?: string,
  category?: BankTransaction["creditCategory"],
): BankTransaction {
  return {
    id,
    date,
    description,
    creditHkd: credit,
    debitHkd: debit,
    balanceAfterHkd: null,
    counterpartyGuess: counterparty ?? null,
    creditCategory: category ?? (counterparty ? "operating_income" : "unclear"),
    sourcePage: 2,
    confidence: 0.88,
  };
}

/** Brief 示例：1–3 月 + 補足至 6 個月 */
export function getDemoBankMonths(
  opts?: { incomplete?: boolean; withAnomalies?: boolean },
): BankStatementMonthDetail[] {
  const base: Array<{
    month: string;
    open: number;
    close: number;
    credits: number;
    count: number;
  }> = [
    { month: "2025-10", open: 170_000, close: 185_000, credits: 610_000, count: 26 },
    { month: "2025-11", open: 185_000, close: 175_000, credits: 580_000, count: 24 },
    { month: "2025-12", open: 175_000, close: 190_000, credits: 630_000, count: 27 },
    { month: "2026-01", open: 180_000, close: 220_000, credits: 650_000, count: 28 },
    { month: "2026-02", open: 220_000, close: 165_000, credits: 590_000, count: 25 },
    { month: "2026-03", open: 165_000, close: 240_000, credits: 680_000, count: 31 },
  ];

  const months = (opts?.incomplete ? base.slice(0, 5) : base).map((b, i) => {
    const transactions: BankTransaction[] = [
      tx(`${b.month}-c1`, `${b.month}-05`, "FPS IN Customer A", Math.round(b.credits * 0.35), null, "客戶 A"),
      tx(`${b.month}-c2`, `${b.month}-12`, "STRIPE PAYOUT", Math.round(b.credits * 0.28), null, "支付平台 B"),
      tx(`${b.month}-c3`, `${b.month}-18`, "TT FROM RELATED CO", Math.round(b.credits * 0.15), null, "關聯公司 C", "related_party"),
      tx(`${b.month}-c4`, `${b.month}-22`, "CASH/CHQ DEP REF", Math.round(b.credits * 0.12), null, undefined, "unclear"),
      tx(`${b.month}-c5`, `${b.month}-28`, "SALES RECEIPT", Math.round(b.credits * 0.1), null, "其他客戶"),
      tx(`${b.month}-d1`, `${b.month}-10`, "AUTOPAY RENT", null, 45_000),
    ];

    if (opts?.withAnomalies && i === 4) {
      transactions.push(
        tx(`${b.month}-bounce`, `${b.month}-15`, "Returned Cheque / 退票", null, 28_000),
        tx(`${b.month}-ap`, `${b.month}-16`, "Autopay Rejected Insufficient Funds", null, 12_000),
      );
    }

    return {
      month: b.month,
      bankName: "恒生銀行",
      accountHolder: "智創科技有限公司",
      accountType: "商業往來",
      accountLast4: "4821",
      currency: "HKD",
      startDate: `${b.month}-01`,
      endDate: `${b.month}-${String(new Date(+b.month.slice(0, 4), +b.month.slice(5), 0).getDate()).padStart(2, "0")}`,
      openingBalanceHkd: b.open,
      closingBalanceHkd: b.close,
      overdraftLimitHkd: 50_000,
      availableBalanceHkd: null,
      dailyLedgerBalances: synthDaily(b.month, b.open, b.close),
      transactions,
      complete: true,
      missingPages: false,
      pdfOnly: true,
    } satisfies BankStatementMonthDetail;
  });

  return months;
}

export function getDemoCashflowAnalysis(opts?: {
  incomplete?: boolean;
  withAnomalies?: boolean;
}) {
  return analyzeBankCashflow(
    getDemoBankMonths(opts),
    DEFAULT_CASHFLOW_RULES,
  );
}

export function getDemoRequiredDocs(scenario: "ok" | "partial" | "start" = "partial") {
  const map: Record<string, Partial<Record<"br" | "nar1" | "bank_statements" | "identity", RequiredDocCardStatus>>> = {
    start: {},
    partial: {
      br: "completed",
      nar1: "completed",
      bank_statements: "needs_resubmit",
      identity: "needs_confirm",
    },
    ok: {
      br: "completed",
      nar1: "completed",
      bank_statements: "completed",
      identity: "completed",
    },
  };
  const slots = getDefaultMandatorySlots(map[scenario]);
  if (scenario === "partial") {
    slots[2].detail = "缺少一個月份，請補交";
    slots[3].detail = "尚有 1 名董事未上載身份證明";
  }
  return evaluateRequiredDocsProgress(slots, [
    {
      id: "sup-1",
      type: "管理帳目",
      note: "2026 Q1",
      status: "not_uploaded",
    },
  ]);
}

export function getDemoCrossCheck(conflict = false) {
  const cells: CrossCheckCell[] = [
    {
      field: "company_name",
      label: "公司名稱",
      br: "match",
      nar1: conflict ? "mismatch" : "match",
      bank: "match",
      id: "na",
    },
    {
      field: "br_number",
      label: "商業登記號碼",
      br: "match",
      nar1: "missing",
      bank: "missing",
      id: "na",
    },
    {
      field: "cr_number",
      label: "公司註冊編號",
      br: "missing",
      nar1: "match",
      bank: "missing",
      id: "na",
    },
    {
      field: "company_address",
      label: "公司地址",
      br: "match",
      nar1: "match",
      bank: "missing",
      id: "na",
    },
    {
      field: "director_names",
      label: "董事姓名",
      br: "na",
      nar1: "match",
      bank: "na",
      id: conflict ? "mismatch" : "match",
    },
    {
      field: "shareholder_names",
      label: "股東姓名",
      br: "na",
      nar1: "match",
      bank: "na",
      id: "match",
    },
    {
      field: "account_holder",
      label: "戶口持有人",
      br: "na",
      nar1: "missing",
      bank: "match",
      id: "na",
    },
  ];
  return evaluateCrossCheck(cells);
}

export const DEMO_PARTIES = [
  { id: "p1", name: "陳大文", role: "董事兼股東", sharePct: 60, docType: "香港身份證", status: "completed" as const },
  { id: "p2", name: "李美華", role: "董事", sharePct: null, docType: "香港身份證", status: "completed" as const },
  { id: "p3", name: "王志明", role: "股東", sharePct: 25, docType: "護照", status: "not_uploaded" as const },
  { id: "p4", name: "陳大文", role: "個人擔保人", sharePct: null, docType: "香港身份證", status: "completed" as const },
];
