import { NextRequest, NextResponse } from "next/server";
import {
  clearApplicantUsers,
  removeApplicantUserByEmail,
} from "@/lib/auth";
import { listArchivedAnalyses } from "@/lib/analysis-archive-registry";
import {
  CustomerRegistrationSchema,
  clearAllCustomers,
  deleteCustomer,
  getCustomer,
  getCustomerStorageMode,
  listCustomers,
  upsertCustomer,
} from "@/lib/customer-registry";
import {
  applicationMatchesCustomer,
  archiveMatchesCustomer,
} from "@/lib/customer-match";
import { mysqlClearApplicantUsers } from "@/lib/db/auth-mysql";
import { isMysqlConfigured } from "@/lib/db/mysql";
import {
  clearSupabaseApplicantUsers,
  deleteSupabaseUserByEmail,
} from "@/lib/supabase/admin";
import { requireAdminContext } from "@/lib/supabase/context";
import {
  deleteApplication,
  listApplications,
} from "@/lib/applications-registry";
import {
  deleteDocumentsByApplication,
  deleteDocumentsByCustomer,
  documentKindLabel,
  listDocuments,
} from "@/lib/documents-registry";
import {
  supabaseListCustomers,
  supabaseUpsertCustomer,
} from "@/lib/supabase/customers";

export const runtime = "nodejs";

async function enrichCustomers<
  T extends {
    id: string;
    email: string;
    companyNameZh?: string | null;
    companyNameEn?: string | null;
    applicantNameZh?: string | null;
    applicantNameEn?: string | null;
    brNumber?: string | null;
  },
>(customers: T[]) {
  const [allDocs, apps, archives] = await Promise.all([
    listDocuments(),
    listApplications(),
    listArchivedAnalyses().catch(() => []),
  ]);

  return customers.map((c) => {
    const linkedApps = apps
      .filter((a) => applicationMatchesCustomer(a, c))
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    const appIds = new Set(linkedApps.map((a) => a.id));

    // 申請內嵌 documents 亦視為已收集文件（即使 documents.json 空）
    const embeddedDocs = linkedApps.flatMap((a) =>
      (a.documents ?? []).map((d) => ({
        id: d.id,
        kind: d.kind,
        kindLabel: documentKindLabel(d.kind),
        slot: d.slot,
        fileName: d.fileName,
        mimeType: d.mimeType,
        size: d.size,
        applicationId: a.id,
        createdAt: a.createdAt,
        downloadUrl: `/api/admin/documents?id=${encodeURIComponent(d.id)}`,
        source: "application" as const,
      })),
    );

    const registryDocs = allDocs
      .filter((d) => d.customerId === c.id || appIds.has(d.applicationId))
      .map((d) => ({
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
        source: "registry" as const,
      }));

    const linkedArchives = archives.filter((a) =>
      archiveMatchesCustomer(a, c),
    );

    const archiveAsDocs = linkedArchives.map((a) => ({
      id: a.id,
      kind: a.docKind || "other",
      kindLabel: `AI 分析 · ${a.docKind || "文件"}`,
      slot: a.docKind || "archive",
      fileName: a.fileName || a.title,
      mimeType: "application/json",
      size: 0,
      applicationId: a.customerId || "",
      createdAt: a.archivedAt,
      downloadUrl: "",
      source: "archive" as const,
      archiveId: a.id,
      summary: a.summary,
      overall: a.overall,
      payload: a.payload,
    }));

    const seen = new Set<string>();
    const uniqueDocs = [...registryDocs, ...embeddedDocs, ...archiveAsDocs].filter(
      (d) => {
        const key = `${d.source}:${d.id}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      },
    );

    return {
      ...c,
      applicationIds: [...appIds],
      applications: linkedApps.map((a) => ({
        id: a.id,
        status: a.status,
        failureReason: a.failureReason,
        amount: a.amount,
        purpose: a.purpose,
        loanType: a.loanType,
        aiAnalysis: a.aiAnalysis ?? null,
        updatedAt: a.updatedAt,
        createdAt: a.createdAt,
        documentCount:
          uniqueDocs.filter((d) => d.applicationId === a.id).length ||
          a.documents?.length ||
          0,
      })),
      analyses: linkedArchives.map((a) => ({
        id: a.id,
        title: a.title,
        fileName: a.fileName,
        docKind: a.docKind,
        companyName: a.companyName,
        summary: a.summary,
        overall: a.overall,
        archivedAt: a.archivedAt,
        archivedBy: a.archivedBy,
        payload: a.payload,
      })),
      documents: uniqueDocs,
      documentCount: uniqueDocs.length,
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
    const customers = await enrichCustomers(
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
    const customers = await enrichCustomers(await listCustomers());
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
 * - ?id=CUS-… 或 body { id } / { ids }：刪除指定客戶（一併刪關聯申請／文件）
 * - 無 id：清空全部客戶登記；預設同時清空申請人帳戶（逼重新註冊）
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

  const urlId = req.nextUrl.searchParams.get("id");
  let ids: string[] = urlId ? [urlId] : [];
  try {
    const body = await req.json();
    if (typeof body?.id === "string" && body.id.trim()) {
      ids.push(body.id.trim());
    }
    if (Array.isArray(body?.ids)) {
      ids.push(
        ...body.ids.filter(
          (x: unknown): x is string =>
            typeof x === "string" && Boolean(x.trim()),
        ),
      );
    }
  } catch {
    /* no body */
  }
  ids = [...new Set(ids.map((x) => x.trim()).filter(Boolean))];

  // —— 單一／多筆刪除 ——
  if (ids.length > 0) {
    try {
      const apps = await listApplications();
      const results: Array<{
        id: string;
        ok: boolean;
        email: string | null;
        applicationsRemoved: number;
        documentsRemoved: number;
        userRemoved: boolean;
      }> = [];

      for (const id of ids) {
        const before = await getCustomer(id);
        const email =
          before?.email?.trim().toLowerCase() ||
          null;
        const appIds = [
          ...new Set(
            apps
              .filter(
                (a) =>
                  a.customerId === id ||
                  (email && a.email?.trim().toLowerCase() === email),
              )
              .map((a) => a.id),
          ),
        ];

        const customerHit = await deleteCustomer(id);

        let documentsRemoved = 0;
        for (const appId of appIds) {
          documentsRemoved += await deleteDocumentsByApplication(appId);
          await deleteApplication(appId);
        }
        documentsRemoved += await deleteDocumentsByCustomer(id);

        let userRemoved = false;
        if (wipeUsers && email) {
          try {
            const legacy = await removeApplicantUserByEmail(email);
            const sb = await deleteSupabaseUserByEmail(email);
            userRemoved = Boolean(legacy.removed || sb.removed);
          } catch (err) {
            console.error("[customers DELETE one] user wipe", err);
          }
        }

        const ok =
          customerHit.ok ||
          Boolean(before) ||
          appIds.length > 0 ||
          documentsRemoved > 0 ||
          userRemoved;

        results.push({
          id,
          ok,
          email: email || customerHit.email,
          applicationsRemoved: appIds.length,
          documentsRemoved,
          userRemoved,
        });
      }

      const removed = results.filter((r) => r.ok).length;
      if (!removed) {
        return NextResponse.json(
          { error: "NOT_FOUND", message: "找不到要刪除的客戶", results },
          { status: 404 },
        );
      }
      return NextResponse.json({
        ok: true,
        removed,
        results,
        message: `已刪除 ${removed} 位客戶及其關聯申請／文件`,
      });
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
