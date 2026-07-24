import { NextRequest, NextResponse } from "next/server";
import {
  evaluatePrescreen,
  type BankStatementMonth,
  type BrCertificate,
  type IdDocuments,
  type Nar1Return,
} from "@/lib/prescreen";
import { getDemoPrescreen } from "@/lib/prescreen-mock";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({
    ok: true,
    demo: getDemoPrescreen(),
    role:
      "AI 為財務助理及文件分析引擎，負責資料收集、提取、計算及預審條件；不直接決定批核。",
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      idDocs: IdDocuments;
      statements: BankStatementMonth[];
      br: BrCertificate | null;
      nar1: Nar1Return | null;
      requiredStatementMonths?: number;
    };
    const result = evaluatePrescreen(body);
    return NextResponse.json({ ok: true, result });
  } catch (err) {
    return NextResponse.json(
      {
        error: "PRESCREEN_FAILED",
        message: err instanceof Error ? err.message : "UNKNOWN",
      },
      { status: 400 },
    );
  }
}
