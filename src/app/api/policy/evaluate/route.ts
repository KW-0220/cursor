import { NextRequest, NextResponse } from "next/server";
import { evaluatePolicy, type PolicyEvaluationInput } from "@/lib/policy";
import { getDemoPolicyEvaluation } from "@/lib/policy-mock";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({
    ok: true,
    demo: getDemoPolicyEvaluation(),
    disclaimer:
      "此建議只供初步參考，實際貸款條件及批核結果由相關貸款機構決定。",
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as PolicyEvaluationInput;
    const evaluation = evaluatePolicy(body);
    return NextResponse.json({
      ok: true,
      evaluation,
      disclaimer:
        "此建議只供初步參考，實際貸款條件及批核結果由相關貸款機構決定。",
    });
  } catch (err) {
    return NextResponse.json(
      {
        error: "POLICY_EVAL_FAILED",
        message: err instanceof Error ? err.message : "UNKNOWN",
      },
      { status: 400 },
    );
  }
}
