import { NextRequest, NextResponse } from "next/server";
import { isAdminCredentials } from "@/lib/auth";
import { ensureSupabaseAdminUser } from "@/lib/supabase/admin";
import { supabaseCustomersReady } from "@/lib/supabase/customers";

export const runtime = "nodejs";

/**
 * POST /api/admin/bootstrap
 * 用固定後台帳密確保 Supabase Auth admin user 存在（再交 browser signIn）。
 */
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as { email?: string; password?: string };
    const email = body.email?.trim() || "";
    const password = body.password || "";
    if (!isAdminCredentials(email, password)) {
      return NextResponse.json(
        { error: "INVALID_CREDENTIALS", message: "電郵或密碼不正確" },
        { status: 401 },
      );
    }

    const user = await ensureSupabaseAdminUser({ email, password });
    const customersOk = await supabaseCustomersReady().catch(() => false);

    return NextResponse.json({
      ok: true,
      userId: user?.id,
      email: user?.email,
      role: user?.app_metadata?.role,
      customersTable: customersOk,
      backend: "supabase",
    });
  } catch (err) {
    return NextResponse.json(
      {
        error: "BOOTSTRAP_FAILED",
        message: err instanceof Error ? err.message : "UNKNOWN",
      },
      { status: 500 },
    );
  }
}
