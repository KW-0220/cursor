import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  ensureApplicationForDocuments,
  listApplications,
} from "@/lib/applications-registry";
import { getCustomer, listCustomers } from "@/lib/customer-registry";
import { linkDocumentsCustomer, listDocuments } from "@/lib/documents-registry";
import { requireAdminContext } from "@/lib/supabase/context";
import { supabaseListCustomers } from "@/lib/supabase/customers";

export const runtime = "nodejs";

const bodySchema = z.object({
  applicationId: z.string().min(1),
  customerId: z.string().min(1),
});

/**
 * POST /api/admin/link-application
 * 將未歸戶申請＋其文件掛到指定客戶（補件 stub 救援）
 */
export async function POST(req: NextRequest) {
  const gate = await requireAdminContext(req);
  if (gate.error || !gate.data) {
    return NextResponse.json(
      { error: gate.error?.message || "UNAUTHORIZED" },
      { status: "status" in gate ? gate.status : 401 },
    );
  }

  try {
    const parsed = bodySchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: "INVALID_BODY", details: parsed.error.flatten() },
        { status: 400 },
      );
    }
    const { applicationId, customerId } = parsed.data;

    let customer = await getCustomer(customerId);
    if (!customer) {
      const fromSb = await supabaseListCustomers(gate.data.supabaseAdmin).catch(
        () => [],
      );
      customer = fromSb.find((c) => c.id === customerId) ?? null;
    }
    if (!customer) {
      const legacy = await listCustomers();
      customer = legacy.find((c) => c.id === customerId) ?? null;
    }
    if (!customer) {
      return NextResponse.json({ error: "CUSTOMER_NOT_FOUND" }, { status: 404 });
    }

    const app = await ensureApplicationForDocuments(applicationId, {
      customerId: customer.id,
      email: customer.email,
      applicantNameZh: customer.applicantNameZh,
      phone: customer.phone,
    });
    const linkedDocs = await linkDocumentsCustomer(applicationId, customer.id);
    const docs = await listDocuments({ applicationId });

    return NextResponse.json({
      ok: true,
      application: app,
      linkedDocuments: linkedDocs,
      documentCount: docs.length,
      customer: { id: customer.id, email: customer.email },
    });
  } catch (err) {
    return NextResponse.json(
      {
        error: "LINK_FAILED",
        message: err instanceof Error ? err.message : "UNKNOWN",
      },
      { status: 500 },
    );
  }
}

/** GET — 列出未歸戶（無 customerId／email）但有文件的申請 */
export async function GET(req: NextRequest) {
  const gate = await requireAdminContext(req);
  if (gate.error || !gate.data) {
    return NextResponse.json(
      { error: gate.error?.message || "UNAUTHORIZED" },
      { status: "status" in gate ? gate.status : 401 },
    );
  }

  const [apps, docs] = await Promise.all([
    listApplications(),
    listDocuments(),
  ]);
  const orphans = apps
    .filter((a) => !a.customerId && !a.email)
    .map((a) => {
      const appDocs = docs.filter((d) => d.applicationId === a.id);
      return {
        id: a.id,
        purpose: a.purpose,
        amount: a.amount,
        status: a.status,
        updatedAt: a.updatedAt,
        documentCount: appDocs.length || a.documents?.length || 0,
        documents: appDocs.slice(0, 20).map((d) => ({
          id: d.id,
          kind: d.kind,
          fileName: d.fileName,
          slot: d.slot,
        })),
      };
    })
    .filter((a) => a.documentCount > 0);

  return NextResponse.json({
    ok: true,
    count: orphans.length,
    orphans,
  });
}
