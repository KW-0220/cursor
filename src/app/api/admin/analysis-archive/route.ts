import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  archiveAnalysis,
  deleteArchivedAnalysis,
  getArchivedAnalysis,
  listArchivedAnalyses,
  updateArchivedAnalysis,
} from "@/lib/analysis-archive-registry";
import {
  getSessionFromCookieHeader,
} from "@/lib/auth";
import { requireAdminContext } from "@/lib/supabase/context";

export const runtime = "nodejs";

const archiveSchema = z.object({
  title: z.string().optional(),
  fileName: z.string().nullable().optional(),
  docKind: z.string().optional(),
  companyName: z.string().nullable().optional(),
  loanType: z.string().nullable().optional(),
  amountHkd: z.number().nullable().optional(),
  purpose: z.string().nullable().optional(),
  summary: z.string().nullable().optional(),
  overall: z.string().nullable().optional(),
  payload: z.record(z.string(), z.unknown()),
  notes: z.string().nullable().optional(),
  id: z.string().optional(),
});

const patchSchema = z.object({
  id: z.string().min(1),
  title: z.string().optional(),
  notes: z.string().nullable().optional(),
});

/** GET /api/admin/analysis-archive?id= */
export async function GET(req: NextRequest) {
  const gate = await requireAdminContext(req);
  if (gate.error || !gate.data) {
    return NextResponse.json(
      { error: gate.error?.message || "UNAUTHORIZED" },
      { status: "status" in gate ? gate.status : 401 },
    );
  }

  const id = req.nextUrl.searchParams.get("id");
  if (id) {
    const item = await getArchivedAnalysis(id);
    if (!item) {
      return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
    }
    return NextResponse.json({ ok: true, item });
  }

  const items = await listArchivedAnalyses();
  return NextResponse.json({
    ok: true,
    count: items.length,
    items: items.map((i) => ({
      id: i.id,
      title: i.title,
      fileName: i.fileName,
      docKind: i.docKind,
      companyName: i.companyName,
      loanType: i.loanType,
      amountHkd: i.amountHkd,
      purpose: i.purpose,
      summary: i.summary,
      overall: i.overall,
      notes: i.notes,
      archivedBy: i.archivedBy,
      archivedAt: i.archivedAt,
      updatedAt: i.updatedAt,
    })),
  });
}

/** POST — 歸檔一筆分析結果 */
export async function POST(req: NextRequest) {
  const gate = await requireAdminContext(req);
  if (gate.error || !gate.data) {
    return NextResponse.json(
      { error: gate.error?.message || "UNAUTHORIZED" },
      { status: "status" in gate ? gate.status : 401 },
    );
  }

  try {
    const parsed = archiveSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: "INVALID_BODY", details: parsed.error.flatten() },
        { status: 400 },
      );
    }
    const session = await getSessionFromCookieHeader(
      req.headers.get("cookie"),
    );
    const d = parsed.data;
    const analysis = (d.payload.analysis ?? null) as
      | { summary?: string; overall?: string; companyNameGuess?: string }
      | null;
    const item = await archiveAnalysis({
      id: d.id,
      title:
        d.title?.trim() ||
        d.fileName ||
        analysis?.companyNameGuess ||
        "未命名分析",
      fileName: d.fileName ?? null,
      docKind: d.docKind || String(d.payload.docKind || "auto"),
      companyName:
        d.companyName ??
        (typeof d.payload.company_name === "string"
          ? d.payload.company_name
          : null) ??
        analysis?.companyNameGuess ??
        null,
      loanType: d.loanType ?? null,
      amountHkd: d.amountHkd ?? null,
      purpose: d.purpose ?? null,
      summary: d.summary ?? analysis?.summary ?? null,
      overall: d.overall ?? analysis?.overall ?? null,
      payload: d.payload,
      notes: d.notes ?? null,
      archivedBy: session?.email ?? null,
    });
    return NextResponse.json({ ok: true, item });
  } catch (err) {
    return NextResponse.json(
      {
        error: "ARCHIVE_FAILED",
        message: err instanceof Error ? err.message : "UNKNOWN",
      },
      { status: 500 },
    );
  }
}

/** PATCH — 改標題／備註 */
export async function PATCH(req: NextRequest) {
  const gate = await requireAdminContext(req);
  if (gate.error || !gate.data) {
    return NextResponse.json(
      { error: gate.error?.message || "UNAUTHORIZED" },
      { status: "status" in gate ? gate.status : 401 },
    );
  }
  try {
    const parsed = patchSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: "INVALID_BODY", details: parsed.error.flatten() },
        { status: 400 },
      );
    }
    const item = await updateArchivedAnalysis(parsed.data.id, {
      title: parsed.data.title,
      notes: parsed.data.notes,
    });
    if (!item) {
      return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
    }
    return NextResponse.json({ ok: true, item });
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

/** DELETE ?id= 或 body { id } / { ids } */
export async function DELETE(req: NextRequest) {
  const gate = await requireAdminContext(req);
  if (gate.error || !gate.data) {
    return NextResponse.json(
      { error: gate.error?.message || "UNAUTHORIZED" },
      { status: "status" in gate ? gate.status : 401 },
    );
  }

  try {
    const urlId = req.nextUrl.searchParams.get("id");
    let ids: string[] = urlId ? [urlId] : [];
    try {
      const body = await req.json();
      if (typeof body?.id === "string") ids.push(body.id);
      if (Array.isArray(body?.ids)) {
        ids.push(...body.ids.filter((x: unknown) => typeof x === "string"));
      }
    } catch {
      /* empty */
    }
    ids = [...new Set(ids.filter(Boolean))];
    if (!ids.length) {
      return NextResponse.json(
        { error: "MISSING_ID", message: "請提供 id" },
        { status: 400 },
      );
    }
    let removed = 0;
    for (const id of ids) {
      if (await deleteArchivedAnalysis(id)) removed += 1;
    }
    return NextResponse.json({ ok: true, removed, ids });
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
