import { NextRequest, NextResponse } from "next/server";
import {
  RegisterSchema,
  createSessionToken,
  findUserByEmail,
  getAuthStorageMode,
  isAdminEmail,
  mergeVaultCookie,
  readVaultFromCookieHeader,
  registerUser,
  sessionCookie,
} from "@/lib/auth";
import { ensureCustomerFromAuthUser } from "@/lib/customer-registry";

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

    if (isAdminEmail(parsed.data.email)) {
      return NextResponse.json(
        {
          error: "RESERVED_EMAIL",
          message: "此電郵已保留予管理員，請改用「管理員登入」",
        },
        { status: 400 },
      );
    }

    const vault = await readVaultFromCookieHeader(req.headers.get("cookie"));
    const user = await registerUser(parsed.data, vault);

    // 註冊即入客戶登記資料庫（後台可見）
    try {
      await ensureCustomerFromAuthUser({
        email: user.email,
        nameZh: user.nameZh,
        phone: user.phone,
        idNumber: user.idNumber,
        source: "auth_register",
      });
    } catch (err) {
      console.error("[register] ensureCustomerFromAuthUser", err);
    }

    const token = await createSessionToken(user);
    const product = (body as { product?: string }).product;
    const res = NextResponse.json({
      ok: true,
      user,
      storage: getAuthStorageMode(),
      next:
        product === "bizdoc"
          ? "/workspace/apply/classify"
          : user.profileCompleted
            ? "/app"
            : "/register/identity",
    });
    res.headers.append("Set-Cookie", sessionCookie(token));
    try {
      const full = await findUserByEmail(user.email);
      if (full) {
        res.headers.append(
          "Set-Cookie",
          await mergeVaultCookie(req.headers.get("cookie"), full),
        );
      }
    } catch {
      // vault 失敗唔擋註冊
    }
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
      {
        error: "REGISTER_FAILED",
        message: "註冊失敗，請稍後再試",
        detail: msg,
      },
      { status: 500 },
    );
  }
}
