/**
 * 申請完成度（規格 §九）— 按必要部分權重，唔係單純頁數。
 */

export type CompletionInput = {
  loanType: "secured" | "unsecured" | null;
  hasLoanBasics: boolean; // 金額／用途／年期
  hasApplicantCompany: boolean;
  hasBr: boolean;
  hasNar1: boolean;
  bankMonthsDone: number; // 0–6
  hasIdentity: boolean;
  hasAudited: boolean;
  hasDebtInfo: boolean; // 已回答有／無現有貸款（及有則填基本）
  hasCollateral: boolean; // secured 先計
  hasDeclarations: boolean; // 全部聲明已勾（正式提交前）
};

export type CompletionResult = {
  percentage: number;
  missingItems: string[];
  nextStepLabel: string;
  weights: Record<string, number>;
};

const BASE_WEIGHTS = {
  applicantCompany: 15,
  loanNeed: 10,
  brNar1: 10,
  bank: 15,
  identity: 10,
  audited: 15,
  debt: 10,
  collateral: 10,
  declarations: 5,
} as const;

function redistributeWithoutCollateral() {
  const { collateral: _, ...rest } = BASE_WEIGHTS;
  const sum = Object.values(rest).reduce((a, b) => a + b, 0);
  const scale = 100 / sum;
  const out: Record<string, number> = {};
  for (const [k, v] of Object.entries(rest)) {
    out[k] = Math.round(v * scale);
  }
  // 修正四捨五入誤差
  const total = Object.values(out).reduce((a, b) => a + b, 0);
  if (total !== 100) {
    out.loanNeed = (out.loanNeed || 0) + (100 - total);
  }
  return out;
}

export function computeCompletion(input: CompletionInput): CompletionResult {
  const weights =
    input.loanType === "secured"
      ? { ...BASE_WEIGHTS }
      : redistributeWithoutCollateral();

  const missing: string[] = [];
  let earned = 0;

  const add = (key: string, ok: boolean, missLabel: string) => {
    const w = weights[key] ?? 0;
    if (ok) earned += w;
    else if (w > 0) missing.push(missLabel);
  };

  add(
    "applicantCompany",
    input.hasApplicantCompany,
    "申請人及公司資料",
  );
  add("loanNeed", input.hasLoanBasics, "貸款金額／用途／年期");
  add("brNar1", input.hasBr && input.hasNar1, "BR 及 NAR1");
  if (!(input.hasBr && input.hasNar1)) {
    if (!input.hasBr && !missing.includes("商業登記證 BR"))
      missing.push("商業登記證 BR");
    if (!input.hasNar1 && !missing.includes("最近期 NAR1"))
      missing.push("最近期 NAR1");
  }
  const bankOk = input.bankMonthsDone >= 6;
  add(
    "bank",
    bankOk,
    bankOk
      ? ""
      : `銀行月結單（尚欠 ${6 - input.bankMonthsDone} 個月）`,
  );
  add("identity", input.hasIdentity, "董事／股東／擔保人身份證明");
  add("audited", input.hasAudited, "Audited Report");
  add("debt", input.hasDebtInfo, "現有債務資料");
  if (input.loanType === "secured") {
    add("collateral", input.hasCollateral, "抵押品基本資料及文件");
  }
  add("declarations", input.hasDeclarations, "聲明及提交確認");

  const cleanMissing = missing.filter(Boolean);
  // brNar1 已拆細，去掉合併項
  const missingItems = cleanMissing.filter((m) => m !== "BR 及 NAR1");

  let nextStepLabel = "繼續申請";
  if (!input.hasLoanBasics) nextStepLabel = "填寫貸款金額及用途";
  else if (!input.hasBr || !input.hasNar1) nextStepLabel = "上載 BR／NAR1";
  else if (input.bankMonthsDone < 6) nextStepLabel = "補齊銀行月結單";
  else if (!input.hasIdentity) nextStepLabel = "上載身份證明";
  else if (!input.hasAudited) nextStepLabel = "上載 Audited Report";
  else if (!input.hasDebtInfo) nextStepLabel = "填寫現有債務";
  else if (input.loanType === "secured" && !input.hasCollateral)
    nextStepLabel = "填寫抵押品資料";
  else if (!input.hasDeclarations) nextStepLabel = "確認聲明並提交";
  else nextStepLabel = "可以提交";

  return {
    percentage: Math.min(100, Math.max(0, Math.round(earned))),
    missingItems,
    nextStepLabel,
    weights,
  };
}
