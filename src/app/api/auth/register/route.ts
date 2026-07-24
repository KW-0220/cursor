import { NextRequest, NextResponse } from "next/server";
import {
  RegisterSchema,
  createSessionToken,
  getAuthStorageMode,
  registerUser,
  sessionCookie,
} from "@/lib/auth";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = RegisterSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "INVALID_BODY",
          message: parsed.error.issues[0]?.message ?? "資料不正確",
        },
        { status: 400 },
      );
    }

    const user = await registerUser(parsed.data);
    const token = await createSessionToken(user);
    const res = NextResponse.json({
      ok: true,
      user,
      storage: getAuthStorageMode(),
      next:
        user.profileCompleted ? "/app" : "/register/identity",
    });
    res.headers.set("Set-Cookie", sessionCookie(token));
    return res;
  } catch (err) {
    const msg = err instanceof Error ? err.message : "UNKNOWN";
    if (msg === "EMAIL_EXISTS") {
      return NextResponse.json(
        { error: "EMAIL_EXISTS", message: "此電郵已註冊，請直接登入" },
        { status: 409 },
      );
    }
    return NextResponse.json(
      { error: "REGISTER_FAILED", message: "註冊失敗，請稍後再試" },
      { status: 500 },
    );
  }
}
