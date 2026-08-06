import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import type { BizApplication } from "@/lib/bizdoc/types";
import {
  getBizApplicationFromDb,
  listBizApplicationsFromDb,
  upsertBizApplicationToDb,
} from "@/lib/bizdoc/supabase";

export const runtime = "nodejs";

/** GET — 客戶端可用申請編號讀取（後台請用 /api/biz/admin） */
export async function GET(req: NextRequest) {
  try {
    const id = req.nextUrl.searchParams.get("id");
    if (id) {
      const app = await getBizApplicationFromDb(id);
      if (!app) {
        return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
      }
      return NextResponse.json({ application: app });
    }
    const apps = await listBizApplicationsFromDb();
    return NextResponse.json({ applications: apps });
  } catch (err) {
    return NextResponse.json(
      {
        error: "BIZ_LIST_FAILED",
        message: err instanceof Error ? err.message : String(err),
      },
      { status: 500 },
    );
  }
}

const upsertSchema = z.object({
  application: z.custom<BizApplication>((v) => {
    return Boolean(v && typeof v === "object" && typeof (v as { id?: string }).id === "string");
  }),
});

/** POST — upsert 申請（server 用 secret client 寫入；MVP 供工作台同步） */
export async function POST(req: NextRequest) {
  try {
    const raw = await req.json();
    const parsed = upsertSchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "INVALID_BODY", details: parsed.error.flatten() },
        { status: 400 },
      );
    }
    const saved = await upsertBizApplicationToDb(parsed.data.application);
    return NextResponse.json({ ok: true, application: saved });
  } catch (err) {
    return NextResponse.json(
      {
        error: "BIZ_UPSERT_FAILED",
        message: err instanceof Error ? err.message : String(err),
      },
      { status: 500 },
    );
  }
}
