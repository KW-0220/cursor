import { NextRequest, NextResponse } from "next/server";
import {
  LoginSchema,
  createSessionToken,
  findUserByEmail,
  getAuthStorageMode,
  mergeVaultCookie,
  readVaultFromCookieHeader,
  sessionCookie,
  verifyLogin,
} from "@/lib/auth";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = LoginSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "INVALID_BODY",
          message: parsed.error.issues[0]?.message ?? "資料不正確",
        },
        { status: 400 },
      );
    }

    const vault = await readVaultFromCookieHeader(req.headers.get("cookie"));
    const user = await verifyLogin(parsed.data, vault);
    const full = await findUserByEmail(user.email);
    const token = await createSessionToken(user);
    const res = NextResponse.json({
      ok: true,
      user,
      storage: getAuthStorageMode(),
      next: user.profileCompleted ? "/app" : "/register/identity",
    });
    res.headers.append("Set-Cookie", sessionCookie(token));
    if (full) {
      res.headers.append(
        "Set-Cookie",
        await mergeVaultCookie(req.headers.get("cookie"), full),
      );
    }
    return res;
  } catch (err) {
    const msg = err instanceof Error ? err.message : "UNKNOWN";
    if (msg === "INVALID_CREDENTIALS") {
      return NextResponse.json(
        { error: "INVALID_CREDENTIALS", message: "電郵或密碼不正確" },
        { status: 401 },
      );
    }
    return NextResponse.json(
      { error: "LOGIN_FAILED", message: "登入失敗，請稍後再試" },
      { status: 500 },
    );
  }
}
