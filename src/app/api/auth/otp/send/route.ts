import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  getTwilioAuth,
  toE164,
  twilioBasicAuthHeader,
} from "@/lib/twilio";

export const runtime = "nodejs";

const bodySchema = z.object({
  phone: z.string().min(8),
});

/** 手機 OTP 發送（Twilio Verify） */
export async function POST(req: NextRequest) {
  const parsed = bodySchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: "INVALID_PHONE", message: "請輸入有效手機號碼" },
      { status: 400 },
    );
  }

  const auth = getTwilioAuth();
  if (!auth) {
    return NextResponse.json(
      {
        error: "SMS_NOT_CONFIGURED",
        message:
          "手機短訊驗證尚未啟用。請改用「電郵註冊」建立帳戶（可立即使用）。",
      },
      { status: 503 },
    );
  }

  const e164 = toE164(parsed.data.phone);

  const twilioRes = await fetch(
    `https://verify.twilio.com/v2/Services/${auth.serviceSid}/Verifications`,
    {
      method: "POST",
      headers: {
        Authorization: twilioBasicAuthHeader(auth),
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({ To: e164, Channel: "sms" }),
    },
  );

  if (!twilioRes.ok) {
    const detail = await twilioRes.text();
    let message = "驗證碼發送失敗，請稍後再試或改用電郵註冊";
    try {
      const j = JSON.parse(detail) as { code?: number; message?: string };
      if (j.code === 21608) {
        message =
          "Twilio Trial 只能發送至已驗證手機。請到 Twilio Console → Verified Caller IDs 加入你的號碼，或升級帳戶。";
      } else if (j.code === 21211) {
        message = "手機號碼格式無效，請使用國際格式（例如 +85291234567）";
      } else if (j.message) {
        message = j.message;
      }
    } catch {
      // keep default
    }
    return NextResponse.json(
      {
        error: "SMS_SEND_FAILED",
        message,
        detail: detail.slice(0, 300),
      },
      { status: 502 },
    );
  }

  return NextResponse.json({ ok: true, to: e164, channel: "sms" });
}
