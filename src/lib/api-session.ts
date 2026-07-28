import { cookies } from "next/headers";
import { getSessionFromCookieHeader, COOKIE_NAME } from "@/lib/auth";

export async function requireUserSession() {
  const jar = await cookies();
  const token = jar.get(COOKIE_NAME)?.value;
  const header = token ? `${COOKIE_NAME}=${token}` : null;
  const session = await getSessionFromCookieHeader(header);
  if (!session?.id) return null;
  return session;
}
