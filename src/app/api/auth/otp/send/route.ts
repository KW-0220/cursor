import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

export const runtime = "nodejs";

const bodySchema = z.object({
  phone: z.string().min(8),
});

/**
 * 手機 OTP 發送
 * 需設定 TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN / TWILIO_VERIFY_SERVICE_SID
 * 未設定時回傳 503，前端引導改用電郵註冊。
 */
export async function POST(req: NextRequest) {
  const parsed = bodySchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: "INVALID_PHONE", message: "請輸入有效手機號碼" },
      { status: 400 },
    );
  }

  const sid = process.env.TWILIO_ACCOUNT_SID?.trim();
  const token = process.env.TWILIO_AUTH_TOKEN?.trim();
  const service = process.env.TWILIO_VERIFY_SERVICE_SID?.trim();

  if (!sid || !token || !service) {
    return NextResponse.json(
      {
        error: "SMS_NOT_CONFIGURED",
        message:
          "手機短訊驗證尚未啟用。請改用「電郵註冊」建立帳戶（可立即使用）。",
      },
      { status: 503 },
    );
  }

  const phone = parsed.data.phone.replace(/\s+/g, "");
  const e164 = phone.startsWith("+") ? phone : `+${phone}`;
  const auth = Buffer.from(`${sid}:${token}`).toString("base64");

  const twilioRes = await fetch(
    `https://verify.twilio.com/v2/Services/${service}/Verifications`,
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({ To: e164, Channel: "sms" }),
    },
  );

  if (!twilioRes.ok) {
    const detail = await twilioRes.text();
    return NextResponse.json(
      {
        error: "SMS_SEND_FAILED",
        message: "驗證碼發送失敗，請稍後再試或改用電郵註冊",
        detail: detail.slice(0, 200),
      },
      { status: 502 },
    );
  }

  return NextResponse.json({ ok: true, to: e164, channel: "sms" });
}
