import { NextRequest, NextResponse } from "next/server";
import { requireUserSession } from "@/lib/api-session";
import {
  createApplication,
  findActiveDraft,
  getApplicationsStorageMode,
  listApplicationsForUser,
} from "@/lib/applications-store";
import { LOAN_APP_STATUS_LABEL } from "@/lib/loan-app-status";

export const runtime = "nodejs";

/**
 * GET  /api/applications — 我的申請列表
 * POST /api/applications — 建立草稿（可帶 resume=1 回傳現有草稿）
 */
export async function GET(req: NextRequest) {
  const session = await requireUserSession();
  if (!session) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const wantActive = req.nextUrl.searchParams.get("activeDraft") === "1";
  if (wantActive) {
    const draft = await findActiveDraft(session.id);
    return NextResponse.json({
      ok: true,
      draft,
      statusLabel: draft ? LOAN_APP_STATUS_LABEL[draft.status] : null,
      storageMode: getApplicationsStorageMode(),
    });
  }

  const apps = await listApplicationsForUser(session.id);
  return NextResponse.json({
    ok: true,
    applications: apps.map((a) => ({
      ...a,
      statusLabel: LOAN_APP_STATUS_LABEL[a.status],
    })),
    storageMode: getApplicationsStorageMode(),
  });
}

export async function POST(req: NextRequest) {
  const session = await requireUserSession();
  if (!session) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const body = (await req.json().catch(() => ({}))) as {
    resume?: boolean;
    loanType?: "secured" | "unsecured" | null;
    draftData?: Record<string, unknown>;
    currentStep?: number;
  };

  if (body.resume) {
    const existing = await findActiveDraft(session.id);
    if (existing) {
      return NextResponse.json({
        ok: true,
        application: existing,
        resumed: true,
        statusLabel: LOAN_APP_STATUS_LABEL[existing.status],
      });
    }
  }

  const app = await createApplication({
    userId: session.id,
    loanType: body.loanType ?? null,
    draftData: body.draftData,
    currentStep: body.currentStep,
  });

  return NextResponse.json({
    ok: true,
    application: app,
    resumed: false,
    statusLabel: LOAN_APP_STATUS_LABEL[app.status],
  });
}
