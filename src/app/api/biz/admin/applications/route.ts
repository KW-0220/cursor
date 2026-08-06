import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import type { BizApplication, BizDocStatus } from "@/lib/bizdoc/types";
import { canConfirmDocsComplete } from "@/lib/bizdoc/completeness";
import {
  deleteBizApplicationFromDb,
  getBizApplicationFromDb,
  listBizApplicationsFromDb,
  upsertBizApplicationToDb,
} from "@/lib/bizdoc/supabase";
import { requireAdminContext } from "@/lib/supabase/context";

export const runtime = "nodejs";

async function gate(req: NextRequest) {
  return requireAdminContext(req);
}

export async function GET(req: NextRequest) {
  const auth = await gate(req);
  if (auth.error || !auth.data) {
    return NextResponse.json(
      { error: auth.error?.message || "UNAUTHORIZED" },
      { status: "status" in auth ? auth.status : 401 },
    );
  }

  try {
    const id = req.nextUrl.searchParams.get("id");
    if (id) {
      const app = await getBizApplicationFromDb(id);
      if (!app) {
        return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
      }
      return NextResponse.json({ application: app });
    }
    const applications = await listBizApplicationsFromDb();
    return NextResponse.json({ applications });
  } catch (err) {
    return NextResponse.json(
      {
        error: "BIZ_ADMIN_LIST_FAILED",
        message: err instanceof Error ? err.message : String(err),
      },
      { status: 500 },
    );
  }
}

const upsertSchema = z.object({
  application: z.custom<BizApplication>((v) =>
    Boolean(v && typeof v === "object" && (v as { id?: string }).id),
  ),
});

export async function PUT(req: NextRequest) {
  const auth = await gate(req);
  if (auth.error || !auth.data) {
    return NextResponse.json(
      { error: auth.error?.message || "UNAUTHORIZED" },
      { status: "status" in auth ? auth.status : 401 },
    );
  }
  try {
    const parsed = upsertSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "INVALID_BODY" }, { status: 400 });
    }
    const saved = await upsertBizApplicationToDb(parsed.data.application);
    return NextResponse.json({ ok: true, application: saved });
  } catch (err) {
    return NextResponse.json(
      {
        error: "BIZ_ADMIN_UPSERT_FAILED",
        message: err instanceof Error ? err.message : String(err),
      },
      { status: 500 },
    );
  }
}

const actionSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("set_file_status"),
    id: z.string().min(1),
    fileId: z.string().min(1),
    status: z.string().min(1),
    issueType: z.string().optional(),
    issueReason: z.string().optional(),
    adminNote: z.string().optional(),
  }),
  z.object({
    action: z.literal("request_supplement"),
    id: z.string().min(1),
    fileId: z.string().min(1),
    issueType: z.string().min(1),
    issueReason: z.string().min(1),
  }),
  z.object({
    action: z.literal("confirm_docs_complete"),
    id: z.string().min(1),
    actor: z.string().optional(),
  }),
  z.object({
    action: z.literal("set_status"),
    id: z.string().min(1),
    status: z.string().min(1),
    assignee: z.string().optional(),
  }),
  z.object({
    action: z.literal("add_note"),
    id: z.string().min(1),
    content: z.string().min(1),
    author: z.string().optional(),
  }),
  z.object({
    action: z.literal("seed_demo"),
  }),
  z.object({
    action: z.literal("delete"),
    id: z.string().min(1),
  }),
]);

export async function POST(req: NextRequest) {
  const auth = await gate(req);
  if (auth.error || !auth.data) {
    return NextResponse.json(
      { error: auth.error?.message || "UNAUTHORIZED" },
      { status: "status" in auth ? auth.status : 401 },
    );
  }

  try {
    const parsed = actionSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: "INVALID_BODY", details: parsed.error.flatten() },
        { status: 400 },
      );
    }
    const body = parsed.data;
    const now = new Date().toISOString();
    const actorEmail =
      (auth.data.jwtClaims as { email?: string } | null)?.email || "admin";

    if (body.action === "seed_demo") {
      const { seedDemoApplications } = await import("@/lib/bizdoc/seed");
      const seeded = await seedDemoApplications({ force: true });
      return NextResponse.json({ ok: true, applications: seeded });
    }

    if (body.action === "delete") {
      await deleteBizApplicationFromDb(body.id);
      return NextResponse.json({ ok: true });
    }

    const existing = await getBizApplicationFromDb(body.id);
    if (!existing) {
      return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
    }

    let next: BizApplication = existing;

    if (body.action === "set_file_status") {
      next = {
        ...existing,
        files: existing.files.map((f) =>
          f.id === body.fileId
            ? {
                ...f,
                status: body.status as BizDocStatus,
                issueType: body.issueType ?? f.issueType,
                issueReason: body.issueReason ?? f.issueReason,
                adminNote: body.adminNote ?? f.adminNote,
              }
            : f,
        ),
        auditLog: [
          ...existing.auditLog,
          {
            id: `a-${now}`,
            actor: existing.assignee || actorEmail,
            action: "update_file_status",
            detail: `${body.fileId} → ${body.status}`,
            at: now,
          },
        ],
      };
    }

    if (body.action === "request_supplement") {
      const file = existing.files.find((f) => f.id === body.fileId);
      next = {
        ...existing,
        status: "needs_supplement",
        files: existing.files.map((f) =>
          f.id === body.fileId
            ? {
                ...f,
                status: "needs_resubmit",
                issueType: body.issueType,
                issueReason: body.issueReason,
              }
            : f,
        ),
        timeline: [
          ...existing.timeline,
          {
            id: `t-sup-${now}`,
            status: "needs_supplement",
            label: "需要補交資料",
            at: now,
            description: `${file?.originalName || "文件"}：${body.issueType}`,
            clientAction: "查看補件要求",
            whatsappStatus: "sent",
          },
        ],
        whatsapp: [
          ...existing.whatsapp,
          {
            id: `w-sup-${now}`,
            type: "supplement",
            content: `你的申請（${existing.id}｜${existing.company.nameZh || "未命名公司"}）有部分資料或文件需要補充或重新上載。請登入申請平台查看詳細要求。`,
            phone: existing.applicant.whatsapp,
            sentAt: now,
            status: "sent",
          },
        ],
        auditLog: [
          ...existing.auditLog,
          {
            id: `a-sup-${now}`,
            actor: existing.assignee || actorEmail,
            action: "request_supplement",
            detail: `${file?.originalName}: ${body.issueType} — ${body.issueReason}`,
            at: now,
          },
        ],
      };
    }

    if (body.action === "confirm_docs_complete") {
      if (!canConfirmDocsComplete(existing)) {
        return NextResponse.json(
          { error: "DOCS_NOT_READY", message: "仍有必須文件未通過" },
          { status: 400 },
        );
      }
      const actor = body.actor || existing.assignee || actorEmail;
      next = {
        ...existing,
        status: "docs_complete",
        timeline: [
          ...existing.timeline,
          {
            id: `t-done-${now}`,
            status: "docs_complete",
            label: "文件已收齊",
            at: now,
            description: "所有初步所需文件已確認收齊。",
            whatsappStatus: "sent",
          },
        ],
        whatsapp: [
          ...existing.whatsapp,
          {
            id: `w-done-${now}`,
            type: "docs_complete",
            content: `你的申請（${existing.id}｜${existing.company.nameZh || "未命名公司"}）所需文件已完成初步檢查並確認收齊。團隊將進入下一階段處理；文件收齊不代表商業戶口已獲批。`,
            phone: existing.applicant.whatsapp,
            sentAt: now,
            status: "sent",
          },
        ],
        auditLog: [
          ...existing.auditLog,
          {
            id: `a-done-${now}`,
            actor,
            action: "confirm_docs_complete",
            detail: "確認文件已收齊",
            at: now,
          },
        ],
      };
    }

    if (body.action === "set_status") {
      next = {
        ...existing,
        status: body.status as BizApplication["status"],
        assignee: body.assignee ?? existing.assignee,
        auditLog: [
          ...existing.auditLog,
          {
            id: `a-st-${now}`,
            actor: body.assignee || actorEmail,
            action: "set_status",
            detail: body.status,
            at: now,
          },
        ],
      };
    }

    if (body.action === "add_note") {
      next = {
        ...existing,
        internalNotes: [
          ...existing.internalNotes,
          {
            id: `n-${now}`,
            author: body.author || existing.assignee || actorEmail,
            content: body.content,
            createdAt: now,
          },
        ],
      };
    }

    const saved = await upsertBizApplicationToDb(next);
    return NextResponse.json({ ok: true, application: saved });
  } catch (err) {
    return NextResponse.json(
      {
        error: "BIZ_ADMIN_ACTION_FAILED",
        message: err instanceof Error ? err.message : String(err),
      },
      { status: 500 },
    );
  }
}
