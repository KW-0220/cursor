import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  CLIENT_APP_STATUSES,
  normalizeClientAppStatus,
} from "@/lib/application-status";
import {
  deleteApplication,
  deleteApplications,
  getApplication,
  updateApplicationStatus,
} from "@/lib/applications-registry";
import {
  deleteDocumentsByApplication,
  deleteDocumentsByApplications,
} from "@/lib/documents-registry";
import { requireAdminContext } from "@/lib/supabase/context";

export const runtime = "nodejs";

const deleteBodySchema = z.object({
  /** 單一或多個申請編號；空陣列／省略 + all=true 清空全部 */
  ids: z.array(z.string().min(1)).optional(),
  id: z.string().min(1).optional(),
  all: z.boolean().optional(),
});

const patchBodySchema = z.object({
  id: z.string().min(1),
  status: z.enum(CLIENT_APP_STATUSES),
  failureReason: z.string().max(2000).optional().nullable(),
});

/**
 * PATCH /api/admin/applications
 * body: { id, status: under_review|approved|rejected, failureReason? }
 * 後台案件總覽更新目前狀態
 */
export async function PATCH(req: NextRequest) {
  const gate = await requireAdminContext(req);
  if (gate.error || !gate.data) {
    return NextResponse.json(
      { error: gate.error?.message || "UNAUTHORIZED" },
      { status: "status" in gate ? gate.status : 401 },
    );
  }

  try {
    const raw = await req.json();
    const parsed = patchBodySchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "INVALID_BODY", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const status = normalizeClientAppStatus(parsed.data.status);
    let failureReason = parsed.data.failureReason?.trim() || null;

    if (status === "rejected" && !failureReason) {
      failureReason = "後台拒絕（未填寫原因）";
    }

    const application = await updateApplicationStatus(
      parsed.data.id,
      status,
      failureReason,
    );
    if (!application) {
      return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
    }

    return NextResponse.json({
      ok: true,
      application,
    });
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

/**
 * DELETE /api/admin/applications
 * body: { id } | { ids: [] } | { all: true }
 * 同步刪除申請紀錄及關聯文件（客戶登記保留）
 */
export async function DELETE(req: NextRequest) {
  const gate = await requireAdminContext(req);
  if (gate.error || !gate.data) {
    return NextResponse.json(
      { error: gate.error?.message || "UNAUTHORIZED" },
      { status: "status" in gate ? gate.status : 401 },
    );
  }

  try {
    const urlId = req.nextUrl.searchParams.get("id")?.trim() || null;
    let body: z.infer<typeof deleteBodySchema> = {};
    try {
      const raw = await req.json();
      const parsed = deleteBodySchema.safeParse(raw);
      if (parsed.success) body = parsed.data;
    } catch {
      /* empty body ok when ?id= */
    }

    if (body.all) {
      const result = await deleteApplications();
      const docsRemoved = await deleteDocumentsByApplications(result.ids);
      return NextResponse.json({
        ok: true,
        removed: result.removed,
        documentsRemoved: docsRemoved,
        ids: result.ids,
      });
    }

    const ids = [
      ...(body.ids ?? []),
      ...(body.id ? [body.id] : []),
      ...(urlId ? [urlId] : []),
    ].filter(Boolean);

    if (ids.length === 1) {
      const id = ids[0]!;
      const existing = await getApplication(id);
      if (!existing) {
        return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
      }
      await deleteApplication(id);
      const documentsRemoved = await deleteDocumentsByApplication(id);
      return NextResponse.json({
        ok: true,
        removed: 1,
        documentsRemoved,
        ids: [id],
      });
    }

    if (ids.length > 1) {
      const result = await deleteApplications(ids);
      const documentsRemoved = await deleteDocumentsByApplications(result.ids);
      return NextResponse.json({
        ok: true,
        removed: result.removed,
        documentsRemoved,
        ids: result.ids,
      });
    }

    return NextResponse.json(
      {
        error: "MISSING_ID",
        message: "請提供 id／ids，或 all:true 清空全部案件",
      },
      { status: 400 },
    );
  } catch (err) {
    return NextResponse.json(
      {
        error: "DELETE_FAILED",
        message: err instanceof Error ? err.message : "UNKNOWN",
      },
      { status: 500 },
    );
  }
}
