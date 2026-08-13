"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { BizStatusBadge } from "@/components/biz/status";
import { Button } from "@/components/ui/button";
import { formatDateTime } from "@/lib/bizdoc/completeness";
import type { BizApplication } from "@/lib/bizdoc/types";

export default function BizAdminDashboardPage() {
  const [apps, setApps] = useState<BizApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/biz/admin/applications", {
        cache: "no-store",
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || json.error || "載入失敗");
      setApps(json.applications || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const stats = useMemo(() => {
    const byStatus: Record<string, number> = {};
    let supplements = 0;
    let awaitingReview = 0;
    for (const a of apps) {
      byStatus[a.status] = (byStatus[a.status] || 0) + 1;
      for (const f of a.files) {
        if (f.status === "needs_resubmit") supplements += 1;
        if (
          f.status === "awaiting_review" ||
          f.status === "reviewing" ||
          f.status === "uploaded" ||
          f.status === "reuploaded"
        ) {
          awaitingReview += 1;
        }
      }
    }
    return {
      total: apps.length,
      review: (byStatus.doc_review || 0) + (byStatus.submitted || 0),
      needsSupplement: byStatus.needs_supplement || 0,
      docsComplete: byStatus.docs_complete || 0,
      supplements,
      awaitingReview,
    };
  }, [apps]);

  const queue = useMemo(() => {
    return [...apps]
      .filter((a) =>
        [
          "submitted",
          "doc_review",
          "needs_supplement",
          "supplement_review",
        ].includes(a.status),
      )
      .sort(
        (a, b) =>
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
      )
      .slice(0, 8);
  }, [apps]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-[color:var(--biz-ink)]">
            後台總覽
          </h2>
          <p className="mt-1 text-sm text-[color:var(--biz-muted)]">
            開戶文件通專屬審核台 · Supabase <code className="text-xs">biz_applications</code>
          </p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => void load()}>
            重新整理
          </Button>
          <Link href="/biz-admin/applications">
            <Button size="sm">申請管理</Button>
          </Link>
        </div>
      </div>

      {error && (
        <p className="rounded-xl bg-danger-100 px-3 py-2 text-sm text-danger-600">
          {error}
        </p>
      )}

      {loading ? (
        <p className="text-sm text-[color:var(--biz-muted)]">載入中…</p>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            <Stat label="全部申請" value={stats.total} />
            <Stat label="待／審核中" value={stats.review} />
            <Stat label="需補件申請" value={stats.needsSupplement} />
            <Stat label="待審文件數" value={stats.awaitingReview} />
            <Stat label="補件項目" value={stats.supplements} />
            <Stat label="文件已收齊" value={stats.docsComplete} />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <section className="rounded-2xl border border-[color:var(--biz-border)] bg-white p-5">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-[color:var(--biz-ink)]">
                  待辦佇列
                </h3>
                <Link
                  href="/biz-admin/applications"
                  className="text-xs text-[color:var(--biz-forest-700)] hover:underline"
                >
                  全部申請 →
                </Link>
              </div>
              <ul className="mt-4 space-y-3">
                {queue.map((a) => (
                  <li
                    key={a.id}
                    className="flex items-start justify-between gap-3 border-b border-[color:var(--biz-border)] pb-3 last:border-0"
                  >
                    <div>
                      <p className="text-sm font-medium">
                        {a.company.nameZh || a.id}
                      </p>
                      <p className="text-xs text-[color:var(--biz-muted)]">
                        {a.applicant.name} · {formatDateTime(a.updatedAt)}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <BizStatusBadge status={a.status} />
                      <Link href={`/biz-admin/applications/${a.id}`}>
                        <Button size="sm" variant="outline">
                          處理
                        </Button>
                      </Link>
                    </div>
                  </li>
                ))}
                {queue.length === 0 && (
                  <p className="text-sm text-[color:var(--biz-muted)]">
                    目前沒有待辦申請。
                  </p>
                )}
              </ul>
            </section>

            <section className="rounded-2xl border border-[color:var(--biz-border)] bg-white p-5">
              <h3 className="font-semibold text-[color:var(--biz-ink)]">
                快捷入口
              </h3>
              <div className="mt-4 grid gap-2">
                <QuickLink
                  href="/biz-admin/supplements"
                  title="補件中心"
                  desc="跨申請查看需補件文件"
                />
                <QuickLink
                  href="/biz-admin/whatsapp"
                  title="WhatsApp 通知"
                  desc="提交／補件／收齊通知紀錄"
                />
                <QuickLink
                  href="/biz-admin/audit"
                  title="操作審計"
                  desc="審核員動作與狀態變更"
                />
              </div>
              <p className="mt-6 text-xs text-[color:var(--biz-muted)]">
                狀態說明：文件已收齊 ≠ 戶口獲批。本系統只處理文件整理與收齊流程。
              </p>
            </section>
          </div>
        </>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-[color:var(--biz-border)] bg-white px-4 py-3">
      <p className="text-xs text-[color:var(--biz-muted)]">{label}</p>
      <p className="mt-1 tabular text-2xl font-semibold text-[color:var(--biz-ink)]">
        {value}
      </p>
    </div>
  );
}

function QuickLink({
  href,
  title,
  desc,
}: {
  href: string;
  title: string;
  desc: string;
}) {
  return (
    <Link
      href={href}
      className="rounded-xl border border-[color:var(--biz-border)] px-4 py-3 transition hover:border-[color:var(--biz-forest-700)] hover:bg-[color:var(--biz-forest-100)]/40"
    >
      <p className="text-sm font-medium text-[color:var(--biz-ink)]">{title}</p>
      <p className="text-xs text-[color:var(--biz-muted)]">{desc}</p>
    </Link>
  );
}
