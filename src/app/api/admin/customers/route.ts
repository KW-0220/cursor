import { NextRequest, NextResponse } from "next/server";
import { clearApplicantUsers } from "@/lib/auth";
import {
  CustomerRegistrationSchema,
  clearAllCustomers,
  getCustomerStorageMode,
  listCustomers,
  upsertCustomer,
} from "@/lib/customer-registry";
import { mysqlClearApplicantUsers } from "@/lib/db/auth-mysql";
import { isMysqlConfigured } from "@/lib/db/mysql";
import { clearSupabaseApplicantUsers } from "@/lib/supabase/admin";
import { requireAdminContext } from "@/lib/supabase/context";
import { listApplications } from "@/lib/applications-registry";
import {
  documentKindLabel,
  listDocuments,
} from "@/lib/documents-registry";
import {
  supabaseListCustomers,
  supabaseUpsertCustomer,
} from "@/lib/supabase/customers";

export const runtime = "nodejs";

async function withDocuments<T extends { id: string; email: string }>(
  customers: T[],
) {
  const [allDocs, apps] = await Promise.all([
    listDocuments(),
    listApplications(),
  ]);
  const appIdsByCustomer = new Map<string, Set<string>>();
  for (const app of apps) {
    const keys: string[] = [];
    if (app.customerId) keys.push(app.customerId);
    if (app.email) {
      const match = customers.find(
        (c) => c.email.trim().toLowerCase() === app.email!.toLowerCase(),
      );
      if (match) keys.push(match.id);
    }
    for (const key of keys) {
      const set = appIdsByCustomer.get(key) ?? new Set<string>();
      set.add(app.id);
      appIdsByCustomer.set(key, set);
    }
  }

  return customers.map((c) => {
    const appIds = appIdsByCustomer.get(c.id) ?? new Set<string>();
    const docs = allDocs.filter(
      (d) => d.customerId === c.id || appIds.has(d.applicationId),
    );
    const seen = new Set<string>();
    const unique = docs.filter((d) => {
      if (seen.has(d.id)) return false;
      seen.add(d.id);
      return true;
    });
    return {
      ...c,
      applicationIds: [...appIds],
      documents: unique.map((d) => ({
        id: d.id,
        kind: d.kind,
        kindLabel: documentKindLabel(d.kind),
        slot: d.slot,
        fileName: d.fileName,
        mimeType: d.mimeType,
        size: d.size,
        applicationId: d.applicationId,
        createdAt: d.createdAt,
        downloadUrl: `/api/admin/documents?id=${encodeURIComponent(d.id)}`,
      })),
      documentCount: unique.length,
    };
  });
}

/** GET /api/admin/customers — 需 Supabase admin session（@supabase/server） */
export async function GET(req: NextRequest) {
  const gate = await requireAdminContext(req);
  if (gate.error || !gate.data) {
    return NextResponse.json(
      { error: gate.error?.message || "UNAUTHORIZED" },
      { status: "status" in gate ? gate.status : 401 },
    );
  }

  const storage = getCustomerStorageMode();
  try {
    const customers = await withDocuments(
      await supabaseListCustomers(gate.data.supabaseAdmin),
    );
    return NextResponse.json({
      ok: true,
      count: customers.length,
      customers,
      storage,
      durable: true,
      authMode: gate.data.authMode,
      backend: "supabase",
      collectFrom: "POST /api/customers + 申請提交文件",
      storageNote:
        "客戶：Supabase Postgres；文件：Supabase Storage（customer-documents）",
    });
  } catch (err) {
    // table / network 問題時回退舊 registry（仍要已通過 admin gate）
    const customers = await withDocuments(await listCustomers());
    return NextResponse.json({
      ok: true,
      count: customers.length,
      customers,
      storage,
      durable: storage === "supabase" || storage === "mysql" || storage === "redis",
      authMode: gate.data.authMode,
      backend: "fallback",
      warning: err instanceof Error ? err.message : "SUPABASE_LIST_FAILED",
    });
  }
}

/**
 * DELETE /api/admin/customers
 * 清空客戶登記資料庫；預設同時清空申請人帳戶（逼重新註冊）。
 * Query: ?users=0 只清客戶、保留登入帳戶
 */
export async function DELETE(req: NextRequest) {
  const gate = await requireAdminContext(req);
  if (gate.error || !gate.data) {
    return NextResponse.json(
      { error: gate.error?.message || "UNAUTHORIZED" },
      { status: "status" in gate ? gate.status : 401 },
    );
  }

  const wipeUsers =
    req.nextUrl.searchParams.get("users") !== "0" &&
    req.nextUrl.searchParams.get("users") !== "false";

  try {
    const customers = await clearAllCustomers();

    let users: {
      legacyRemoved: number;
      mysqlRemoved: number;
      supabaseRemoved: number;
      keptAdmin: boolean;
    } | null = null;

    if (wipeUsers) {
      const legacy = await clearApplicantUsers();
      let mysqlRemoved = 0;
      if (isMysqlConfigured()) {
        try {
          mysqlRemoved = await mysqlClearApplicantUsers();
        } catch (err) {
          console.error("[customers DELETE] mysql users clear", err);
        }
      }
      const supabase = await clearSupabaseApplicantUsers();
      users = {
        legacyRemoved: legacy.removed,
        mysqlRemoved,
        supabaseRemoved: supabase.removed,
        keptAdmin: true,
      };
    }

    return NextResponse.json({
      ok: true,
      wiped: true,
      customers,
      users,
      message: wipeUsers
        ? "已清空客戶登記；申請人須重新註冊（管理員保留）"
        : "已清空客戶登記（登入帳戶未動）",
    });
  } catch (err) {
    return NextResponse.json(
      {
        error: "CLEAR_FAILED",
        message: err instanceof Error ? err.message : "UNKNOWN",
      },
      { status: 500 },
    );
  }
}

/** POST /api/admin/customers — 需 Supabase admin session */
export async function POST(req: NextRequest) {
  const gate = await requireAdminContext(req);
  if (gate.error || !gate.data) {
    return NextResponse.json(
      { error: gate.error?.message || "UNAUTHORIZED" },
      { status: "status" in gate ? gate.status : 401 },
    );
  }

  try {
    const body = await req.json();
    const parsed = CustomerRegistrationSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "INVALID_BODY",
          details: parsed.error.flatten(),
        },
        { status: 400 },
      );
    }
    const customer = await supabaseUpsertCustomer(
      parsed.data,
      gate.data.supabaseAdmin,
    ).catch(() => upsertCustomer(parsed.data));
    return NextResponse.json({
      ok: true,
      customer,
      storage: getCustomerStorageMode(),
      authMode: gate.data.authMode,
      backend: "supabase",
    });
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
