import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import type { BizApplication } from "@/lib/bizdoc/types";
import {
  getBizApplicationFromDb,
  listBizApplicationsFromDb,
  upsertBizApplicationToDb,
} from "@/lib/bizdoc/supabase";
import {
  mergeWhatsAppStatus,
  notifyBizWhatsApp,
} from "@/lib/bizdoc/notify";

export const runtime = "nodejs";
export const maxDuration = 60;

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
    return Boolean(
      v && typeof v === "object" && typeof (v as { id?: string }).id === "string",
    );
  }),
  notifyEvents: z
    .array(
      z.enum([
        "submitted",
        "supplement",
        "docs_complete",
        "reviewer_resubmit",
      ]),
    )
    .optional(),
});

/** POST — upsert 申請；可附帶 notifyEvents 觸發 WhatsApp */
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

    const incoming = parsed.data.application;
    const prev = await getBizApplicationFromDb(incoming.id);

    let events = parsed.data.notifyEvents ?? [];
    // 自動偵測：首次提交
    if (
      incoming.status === "submitted" &&
      prev?.status !== "submitted" &&
      !events.includes("submitted")
    ) {
      events = [...events, "submitted"];
    }
    // 自動偵測：客戶補件後回到覆核
    if (
      incoming.status === "supplement_review" &&
      prev?.status === "needs_supplement" &&
      !events.includes("reviewer_resubmit")
    ) {
      events = [...events, "reviewer_resubmit"];
    }

    let next: BizApplication = incoming;
    const allWa = [];
    for (const event of events) {
      if (event === "submitted") {
        const wa = await notifyBizWhatsApp({ app: next, event: "submitted" });
        allWa.push(...wa);
        const waStatus = mergeWhatsAppStatus(wa);
        const at = new Date().toISOString();
        next = {
          ...next,
          whatsapp: [...(next.whatsapp || []), ...wa],
          timeline: [
            ...(next.timeline || []),
            {
              id: `t-wa-submit-${at}`,
              status: "whatsapp_sent",
              label: "WhatsApp 通知已發送",
              at,
              description: "已通知客戶及審核人員（如已設定）",
              whatsappStatus: waStatus,
            },
          ],
        };
      } else if (event === "reviewer_resubmit") {
        const wa = await notifyBizWhatsApp({
          app: next,
          event: "reviewer_resubmit",
        });
        allWa.push(...wa);
        next = {
          ...next,
          whatsapp: [...(next.whatsapp || []), ...wa],
        };
      } else if (event === "supplement" || event === "docs_complete") {
        const wa = await notifyBizWhatsApp({ app: next, event });
        allWa.push(...wa);
        next = {
          ...next,
          whatsapp: [...(next.whatsapp || []), ...wa],
        };
      }
    }

    // 避免客戶端 mock 訊息與真實發送重複：若本次有 notify，剝掉剛由 client 假寫入的同類型 sent 訊息
    if (events.length > 0) {
      const cut = Date.now() - 15_000;
      next = {
        ...next,
        whatsapp: (next.whatsapp || []).filter((m) => {
          const t = new Date(m.sentAt).getTime();
          if (Number.isNaN(t) || t < cut) return true;
          // 保留剛真正送出的（有 provider／failReason／recipientRole）
          if (m.provider || m.providerMessageId || m.recipientRole) return true;
          if (
            events.includes("submitted") &&
            m.type === "submitted" &&
            m.status === "sent" &&
            !m.provider
          ) {
            return false;
          }
          return true;
        }),
      };
    }

    const saved = await upsertBizApplicationToDb(next);
    return NextResponse.json({
      ok: true,
      application: saved,
      notified: allWa.length,
      whatsapp: allWa,
    });
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
