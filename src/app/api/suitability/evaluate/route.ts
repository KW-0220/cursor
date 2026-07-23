import { NextRequest, NextResponse } from "next/server";
import {
  evaluateSuitability,
  getDemoSuitable,
  type SuitabilityInput,
} from "@/lib/suitability";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({
    ok: true,
    demo: getDemoSuitable(),
    rule: "companyAge >= 2 && monthlyRevenue >= 100000 && debtRatio < 50 → Suitable",
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as Partial<SuitabilityInput>;
    const input: SuitabilityInput = {
      companyAge:
        body.companyAge === undefined || body.companyAge === null
          ? null
          : Number(body.companyAge),
      monthlyRevenue:
        body.monthlyRevenue === undefined || body.monthlyRevenue === null
          ? null
          : Number(body.monthlyRevenue),
      debtRatio:
        body.debtRatio === undefined || body.debtRatio === null
          ? null
          : Number(body.debtRatio),
    };

    if (
      (input.companyAge != null && Number.isNaN(input.companyAge)) ||
      (input.monthlyRevenue != null && Number.isNaN(input.monthlyRevenue)) ||
      (input.debtRatio != null && Number.isNaN(input.debtRatio))
    ) {
      return NextResponse.json(
        { error: "INVALID_NUMBER", message: "數值格式不正確" },
        { status: 400 },
      );
    }

    const result = evaluateSuitability(input);
    return NextResponse.json({ ok: true, result });
  } catch (err) {
    return NextResponse.json(
      {
        error: "SUITABILITY_FAILED",
        message: err instanceof Error ? err.message : "UNKNOWN",
      },
      { status: 400 },
    );
  }
}
