import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  createSessionToken,
  findUserByEmail,
  registerUser,
  sessionCookie,
  updateUserContact,
  type PublicUser,
} from "@/lib/auth";

export const runtime = "nodejs";

const bodySchema = z.object({
  phone: z.string().min(8),
  code: z.string().min(4),
  email: z.string().email().optional(),
  password: z.string().min(8).optional(),
  nameZh: z.string().optional(),
});

/** 核對 Twilio Verify OTP；成功後建立／登入帳戶 */
export async function POST(req: NextRequest) {
  const parsed = bodySchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: "INVALID_BODY", message: "請輸入手機號碼及驗證碼" },
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
        message: "手機短訊驗證尚未啟用，請改用電郵註冊",
      },
      { status: 503 },
    );
  }

  const phone = parsed.data.phone.replace(/\s+/g, "");
  const e164 = phone.startsWith("+") ? phone : `+${phone}`;
  const auth = Buffer.from(`${sid}:${token}`).toString("base64");

  const twilioRes = await fetch(
    `https://verify.twilio.com/v2/Services/${service}/VerificationCheck`,
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({ To: e164, Code: parsed.data.code }),
    },
  );
  const twilioJson = (await twilioRes.json()) as { status?: string };
  if (!twilioRes.ok || twilioJson.status !== "approved") {
    return NextResponse.json(
      { error: "INVALID_OTP", message: "驗證碼不正確或已過期" },
      { status: 401 },
    );
  }

  const email =
    parsed.data.email?.trim().toLowerCase() ||
    `${e164.replace(/\D/g, "")}@sms.sme-loanflow.local`;
  const password =
    parsed.data.password ||
    `SmsVerified!${e164.replace(/\D/g, "").slice(-8)}`;

  let user: PublicUser;
  const existing = await findUserByEmail(email);
  if (existing) {
    const updated = await updateUserContact(existing.id, {
      phone: e164,
      nameZh: parsed.data.nameZh,
    });
    user = updated ?? {
      id: existing.id,
      email: existing.email,
      nameZh: existing.nameZh,
      phone: e164,
      profileCompleted: existing.profileCompleted,
      createdAt: existing.createdAt,
      updatedAt: existing.updatedAt,
    };
  } else {
    user = await registerUser({
      email,
      password,
      nameZh: parsed.data.nameZh,
      phone: e164,
    });
  }

  const sessionToken = await createSessionToken(user);
  const res = NextResponse.json({
    ok: true,
    user,
    next: user.profileCompleted ? "/app" : "/register/identity",
  });
  res.headers.set("Set-Cookie", sessionCookie(sessionToken));
  return res;
}
