import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  getWhatsAppStatusSummary,
  sendWhatsAppMessage,
} from "@/lib/bizdoc/whatsapp";
import { requireBizAdminContext } from "@/lib/supabase/context";

export const runtime = "nodejs";

/** GET — WhatsApp 接駁狀態 */
export async function GET(req: NextRequest) {
  const auth = await requireBizAdminContext(req);
  if (auth.error || !auth.data) {
    return NextResponse.json(
      { error: auth.error?.message || "UNAUTHORIZED" },
      { status: "status" in auth ? auth.status : 401 },
    );
  }
  return NextResponse.json(getWhatsAppStatusSummary());
}

const testSchema = z.object({
  to: z.string().min(5),
  message: z.string().min(1).max(1000).optional(),
});

/** POST — 測試發送 */
export async function POST(req: NextRequest) {
  const auth = await requireBizAdminContext(req);
  if (auth.error || !auth.data) {
    return NextResponse.json(
      { error: auth.error?.message || "UNAUTHORIZED" },
      { status: "status" in auth ? auth.status : 401 },
    );
  }

  const parsed = testSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "INVALID_BODY" }, { status: 400 });
  }

  const result = await sendWhatsAppMessage({
    to: parsed.data.to,
    body:
      parsed.data.message ||
      `【開戶文件通】WhatsApp 測試訊息 ${new Date().toLocaleString("zh-HK")}`,
    meta: { test: true },
  });

  return NextResponse.json({
    ...getWhatsAppStatusSummary(),
    result,
  });
}
