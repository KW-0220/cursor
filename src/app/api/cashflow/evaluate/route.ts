import { NextRequest, NextResponse } from "next/server";
import { analyzeBankCashflow } from "@/lib/bank-cashflow";
import { getDemoCashflowAnalysis, getDemoBankMonths } from "@/lib/bank-cashflow-mock";
import { DEFAULT_CASHFLOW_RULES } from "@/lib/cashflow-rules";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const incomplete = req.nextUrl.searchParams.get("incomplete") === "1";
  const withAnomalies = req.nextUrl.searchParams.get("anomalies") === "1";
  return NextResponse.json({
    ok: true,
    stage: "phase1_cashflow_prescreen",
    note: "第一階段初步資格及現金流評估，非正式批核。",
    balanceBasis: "ledger",
    result: getDemoCashflowAnalysis({ incomplete, withAnomalies }),
    rules: DEFAULT_CASHFLOW_RULES,
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const months = body.months ?? getDemoBankMonths();
    const rules = body.rules ?? DEFAULT_CASHFLOW_RULES;
    const result = analyzeBankCashflow(months, rules);
    return NextResponse.json({ ok: true, result });
  } catch (err) {
    return NextResponse.json(
      {
        error: "CASHFLOW_EVAL_FAILED",
        message: err instanceof Error ? err.message : "UNKNOWN",
      },
      { status: 400 },
    );
  }
}
