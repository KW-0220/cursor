import { NextRequest, NextResponse } from "next/server";
import { isBizAdminCredentials } from "@/lib/auth";
import { ensureSupabaseBizAdminUser } from "@/lib/supabase/admin";

export const runtime = "nodejs";

/**
 * POST /api/biz/admin/bootstrap
 * 開戶文件通專屬後台帳密 → 確保 Supabase Auth biz_admin 存在。
 */
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as { email?: string; password?: string };
    const email = body.email?.trim() || "";
    const password = body.password || "";
    if (!isBizAdminCredentials(email, password)) {
      return NextResponse.json(
        { error: "INVALID_CREDENTIALS", message: "電郵或密碼不正確" },
        { status: 401 },
      );
    }

    const user = await ensureSupabaseBizAdminUser({ email, password });

    return NextResponse.json({
      ok: true,
      userId: user?.id,
      email: user?.email,
      role: user?.app_metadata?.role,
      product: "bizdoc",
      backend: "supabase",
    });
  } catch (err) {
    return NextResponse.json(
      {
        error: "BIZ_BOOTSTRAP_FAILED",
        message: err instanceof Error ? err.message : "UNKNOWN",
      },
      { status: 500 },
    );
  }
}
