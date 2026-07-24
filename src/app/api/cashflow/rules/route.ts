import { NextResponse } from "next/server";
import { DEFAULT_CASHFLOW_RULES } from "@/lib/cashflow-rules";

export const runtime = "nodejs";

/** 銀行現金流審批規則（後台可配置；MVP 回傳預設） */
export async function GET() {
  return NextResponse.json({
    ok: true,
    rules: [DEFAULT_CASHFLOW_RULES],
    note: "門檻不可寫死於客戶端文案；由此 API／後台設定驅動。",
  });
}

export async function PUT(req: Request) {
  const body = await req.json();
  return NextResponse.json({
    ok: true,
    saved: true,
    rules: body.rules ?? DEFAULT_CASHFLOW_RULES,
    mode: "stub",
  });
}
