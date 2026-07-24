import { NextRequest, NextResponse } from "next/server";
import {
  clearSessionCookie,
  clearVaultCookie,
  getSessionFromCookieHeader,
  findUserByEmail,
  readVaultFromCookieHeader,
  upsertUserIntoStore,
} from "@/lib/auth";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const cookie = req.headers.get("cookie");
  const session = await getSessionFromCookieHeader(cookie);
  if (!session) {
    return NextResponse.json({ ok: false, user: null }, { status: 401 });
  }

  let full = await findUserByEmail(session.email);
  if (!full) {
    const vault = await readVaultFromCookieHeader(cookie);
    const fromVault = vault.find(
      (u) => u.email.toLowerCase() === session.email.toLowerCase(),
    );
    if (fromVault) {
      await upsertUserIntoStore(fromVault);
      full = fromVault;
    }
  }

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
  res.headers.append("Set-Cookie", clearSessionCookie());
  res.headers.append("Set-Cookie", clearVaultCookie());
  return res;
}
