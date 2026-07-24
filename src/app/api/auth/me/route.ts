import { NextRequest, NextResponse } from "next/server";
import {
  clearSessionCookie,
  getSessionFromCookieHeader,
  findUserByEmail,
} from "@/lib/auth";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const session = await getSessionFromCookieHeader(
    req.headers.get("cookie"),
  );
  if (!session) {
    return NextResponse.json({ ok: false, user: null }, { status: 401 });
  }
  const full = await findUserByEmail(session.email);
  return NextResponse.json({
    ok: true,
    user: full
      ? {
          id: full.id,
          email: full.email,
          nameZh: full.nameZh,
          phone: full.phone,
          profileCompleted: full.profileCompleted,
          createdAt: full.createdAt,
        }
      : session,
  });
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.headers.set("Set-Cookie", clearSessionCookie());
  return res;
}
