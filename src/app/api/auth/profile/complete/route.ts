import { NextRequest, NextResponse } from "next/server";
import {
  createSessionToken,
  getSessionFromCookieHeader,
  markProfileCompleted,
  sessionCookie,
  updateUserContact,
} from "@/lib/auth";

export const runtime = "nodejs";

/** 完成身份／公司資料後標記 profileCompleted */
export async function POST(req: NextRequest) {
  const session = await getSessionFromCookieHeader(req.headers.get("cookie"));
  if (!session) {
    return NextResponse.json(
      { error: "UNAUTHORIZED", message: "請先登入或註冊" },
      { status: 401 },
    );
  }

  const body = (await req.json().catch(() => ({}))) as {
    nameZh?: string;
    phone?: string;
  };

  if (body.nameZh || body.phone) {
    await updateUserContact(session.id, {
      nameZh: body.nameZh,
      phone: body.phone,
    });
  }

  const user = await markProfileCompleted(session.id);
  if (!user) {
    return NextResponse.json(
      { error: "USER_NOT_FOUND", message: "找不到帳戶" },
      { status: 404 },
    );
  }

  const token = await createSessionToken(user);
  const res = NextResponse.json({ ok: true, user });
  res.headers.set("Set-Cookie", sessionCookie(token));
  return res;
}
