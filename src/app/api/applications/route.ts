import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  getApplication,
  listApplications,
  updateApplicationStatus,
  upsertApplication,
} from "@/lib/applications-registry";
import { CLIENT_APP_STATUSES } from "@/lib/application-status";

export const runtime = "nodejs";

const upsertSchema = z.object({
  id: z.string().min(1),
  loanType: z.enum(["secured", "unsecured"]).nullable(),
  amount: z.number().nonnegative(),
  purpose: z.string().min(1),
  docsPct: z.number().optional(),
  bankCount: z.number().optional(),
  status: z.string().optional(),
  failureReason: z.string().nullable().optional(),
});

const patchSchema = z.object({
  id: z.string().min(1),
  status: z.enum(CLIENT_APP_STATUSES),
  failureReason: z.string().nullable().optional(),
});

/** GET /api/applications?id=SLF-… 或列表 */
export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  if (id) {
    const app = await getApplication(id);
    if (!app) {
      return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
    }
    return NextResponse.json({ ok: true, application: app });
  }
  const ids = req.nextUrl.searchParams.get("ids");
  if (ids) {
    const want = new Set(ids.split(",").map((s) => s.trim()).filter(Boolean));
    const all = await listApplications();
    return NextResponse.json({
      ok: true,
      applications: all.filter((a) => want.has(a.id)),
    });
  }
  const applications = await listApplications();
  return NextResponse.json({
    ok: true,
    count: applications.length,
    applications,
  });
}

/** POST — 提交／同步申請（預設審批中） */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = upsertSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "INVALID_BODY", details: parsed.error.flatten() },
        { status: 400 },
      );
    }
    const application = await upsertApplication({
      ...parsed.data,
      status: parsed.data.status || "under_review",
    });
    return NextResponse.json({ ok: true, application });
  } catch (err) {
    return NextResponse.json(
      {
        error: "UPSERT_FAILED",
        message: err instanceof Error ? err.message : "UNKNOWN",
      },
      { status: 500 },
    );
  }
}

/**
 * PATCH — 更新申請狀態
 * body: { id, status: under_review|approved|rejected, failureReason? }
 */
export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "INVALID_BODY", details: parsed.error.flatten() },
        { status: 400 },
      );
    }
    if (
      parsed.data.status === "rejected" &&
      !parsed.data.failureReason?.trim()
    ) {
      return NextResponse.json(
        { error: "FAILURE_REASON_REQUIRED", message: "申請失敗須提供失敗原因" },
        { status: 400 },
      );
    }
    const application = await updateApplicationStatus(
      parsed.data.id,
      parsed.data.status,
      parsed.data.failureReason,
    );
    if (!application) {
      return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
    }
    return NextResponse.json({ ok: true, application });
  } catch (err) {
    return NextResponse.json(
      {
        error: "PATCH_FAILED",
        message: err instanceof Error ? err.message : "UNKNOWN",
      },
      { status: 500 },
    );
  }
}
