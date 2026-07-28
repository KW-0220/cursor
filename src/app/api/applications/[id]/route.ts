import { NextRequest, NextResponse } from "next/server";
import { requireUserSession } from "@/lib/api-session";
import {
  VersionConflictError,
  getApplication,
  patchApplication,
  softDeleteApplication,
  submitApplication,
} from "@/lib/applications-store";
import { LOAN_APP_STATUS_LABEL } from "@/lib/loan-app-status";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, ctx: Ctx) {
  const session = await requireUserSession();
  if (!session) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }
  const { id } = await ctx.params;
  const app = await getApplication(id, session.id);
  if (!app) {
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  }
  return NextResponse.json({
    ok: true,
    application: app,
    statusLabel: LOAN_APP_STATUS_LABEL[app.status],
  });
}

/**
 * PATCH — auto-save / manual save
 * body: { versionNumber, draftData?, mergeDraft?, currentStep?, … }
 */
export async function PATCH(req: NextRequest, ctx: Ctx) {
  const session = await requireUserSession();
  if (!session) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }
  const { id } = await ctx.params;
  const body = (await req.json().catch(() => ({}))) as {
    versionNumber?: number;
    loanType?: "secured" | "unsecured" | null;
    requestedAmount?: number | null;
    purpose?: string | null;
    currentStep?: number;
    completionPercentage?: number;
    missingItems?: string[];
    nextStepLabel?: string | null;
    draftData?: Record<string, unknown>;
    mergeDraft?: boolean;
    status?: string;
  };

  if (typeof body.versionNumber !== "number") {
    return NextResponse.json(
      { error: "MISSING_VERSION", message: "請提供 versionNumber" },
      { status: 400 },
    );
  }

  try {
    const app = await patchApplication({
      id,
      userId: session.id,
      expectedVersion: body.versionNumber,
      patch: {
        loanType: body.loanType,
        requestedAmount: body.requestedAmount,
        purpose: body.purpose,
        currentStep: body.currentStep,
        completionPercentage: body.completionPercentage,
        missingItems: body.missingItems,
        nextStepLabel: body.nextStepLabel,
        draftData: body.draftData,
        mergeDraft: body.mergeDraft ?? true,
      },
    });
    return NextResponse.json({
      ok: true,
      application: app,
      statusLabel: LOAN_APP_STATUS_LABEL[app.status],
      savedAt: app.lastSavedAt,
    });
  } catch (err) {
    if (err instanceof VersionConflictError) {
      return NextResponse.json(
        {
          error: "VERSION_CONFLICT",
          message: "此申請已在另一部裝置更新。請重新載入最新內容。",
          application: err.current,
          statusLabel: LOAN_APP_STATUS_LABEL[err.current.status],
        },
        { status: 409 },
      );
    }
    const msg = err instanceof Error ? err.message : "PATCH_FAILED";
    const status =
      msg === "NOT_FOUND"
        ? 404
        : msg === "FORBIDDEN"
          ? 403
          : msg === "NOT_EDITABLE"
            ? 409
            : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}

export async function DELETE(_req: NextRequest, ctx: Ctx) {
  const session = await requireUserSession();
  if (!session) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }
  const { id } = await ctx.params;
  try {
    await softDeleteApplication({ id, userId: session.id });
    return NextResponse.json({ ok: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "DELETE_FAILED";
    const status =
      msg === "NOT_FOUND" ? 404 : msg === "FORBIDDEN" ? 403 : msg === "NOT_DELETABLE" ? 409 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}

/** POST ?action=submit — 正式提交（須客戶主動） */
export async function POST(req: NextRequest, ctx: Ctx) {
  const session = await requireUserSession();
  if (!session) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }
  const { id } = await ctx.params;
  const action = req.nextUrl.searchParams.get("action");
  if (action !== "submit") {
    return NextResponse.json({ error: "UNKNOWN_ACTION" }, { status: 400 });
  }
  const body = (await req.json().catch(() => ({}))) as {
    versionNumber?: number;
  };
  if (typeof body.versionNumber !== "number") {
    return NextResponse.json({ error: "MISSING_VERSION" }, { status: 400 });
  }
  try {
    const app = await submitApplication({
      id,
      userId: session.id,
      expectedVersion: body.versionNumber,
    });
    return NextResponse.json({
      ok: true,
      application: app,
      statusLabel: LOAN_APP_STATUS_LABEL[app.status],
    });
  } catch (err) {
    if (err instanceof VersionConflictError) {
      return NextResponse.json(
        {
          error: "VERSION_CONFLICT",
          message: "此申請已在另一部裝置更新。請重新載入最新內容。",
          application: err.current,
        },
        { status: 409 },
      );
    }
    const msg = err instanceof Error ? err.message : "SUBMIT_FAILED";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
