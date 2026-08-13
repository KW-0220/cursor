import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  createSessionToken,
  findUserByEmail,
  mergeVaultCookie,
  registerUser,
  sessionCookie,
  updateUserContact,
  type PublicUser,
} from "@/lib/auth";
import { ensureCustomerFromAuthUser } from "@/lib/customer-registry";
import {
  getTwilioAuth,
  toE164,
  twilioBasicAuthHeader,
} from "@/lib/twilio";

export const runtime = "nodejs";

const bodySchema = z.object({
  phone: z.string().min(8),
  code: z.string().min(4),
  email: z.string().email().optional(),
  password: z.string().min(8).optional(),
  nameZh: z.string().optional(),
  idNumber: z.string().trim().min(5, "請輸入身份證／護照號碼"),
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

  const auth = getTwilioAuth();
  if (!auth) {
    return NextResponse.json(
      {
        error: "SMS_NOT_CONFIGURED",
        message: "手機短訊驗證尚未啟用，請改用電郵註冊",
      },
      { status: 503 },
    );
  }

  const e164 = toE164(parsed.data.phone);

  const twilioRes = await fetch(
    `https://verify.twilio.com/v2/Services/${auth.serviceSid}/VerificationCheck`,
    {
      method: "POST",
      headers: {
        Authorization: twilioBasicAuthHeader(auth),
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
      idNumber: existing.idNumber ?? parsed.data.idNumber,
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
      idNumber: parsed.data.idNumber,
    });
  }

  try {
    await ensureCustomerFromAuthUser({
      email: user.email,
      nameZh: user.nameZh,
      phone: user.phone,
      idNumber: user.idNumber,
      source: "auth_otp",
    });
  } catch (err) {
    console.error("[otp/verify] ensureCustomerFromAuthUser", err);
  }

  const full = await findUserByEmail(user.email);
  const sessionToken = await createSessionToken(user);
  const res = NextResponse.json({
    ok: true,
    user,
    next: user.profileCompleted ? "/app" : "/register/identity",
  });
  res.headers.append("Set-Cookie", sessionCookie(sessionToken));
  if (full) {
    res.headers.append(
      "Set-Cookie",
      await mergeVaultCookie(req.headers.get("cookie"), full),
    );
  }
  return res;
}
