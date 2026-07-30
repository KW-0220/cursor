"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, EmptyState, SectionHeader } from "@/components/ui/layout";
import {
  clientAppStatusLabel,
  clientAppStatusTone,
  normalizeClientAppStatus,
} from "@/lib/application-status";
import {
  loadStoredApplications,
  saveStoredApplications,
  type StoredApplication,
} from "@/lib/applications-client";
import { cn, formatDateTime, formatHKD } from "@/lib/utils";

/** 真實用戶申請列表：審批中／成功批核／申請失敗（失敗顯示原因） */
export default function ApplicationsPage() {
  const [apps, setApps] = useState<StoredApplication[] | null>(null);

  useEffect(() => {
    const local = loadStoredApplications();
    setApps(local);

    // 以後端狀態覆寫（成功批核／申請失敗＋原因）
    if (local.length === 0) return;
    const ids = local.map((a) => a.id).join(",");
    void fetch(`/api/applications?ids=${encodeURIComponent(ids)}`)
      .then((r) => r.json())
      .then((data) => {
        const remote = (data.applications ?? []) as Array<{
          id: string;
          status: string;
          failureReason?: string | null;
          updatedAt?: string;
        }>;
        if (!remote.length) return;
        const byId = new Map(remote.map((a) => [a.id, a]));
        const merged = local.map((app) => {
          const r = byId.get(app.id);
          if (!r) return app;
          return {
            ...app,
            status: normalizeClientAppStatus(r.status),
            failureReason: r.failureReason ?? app.failureReason ?? null,
            updatedAt: r.updatedAt || app.updatedAt,
          };
        });
        saveStoredApplications(merged);
        setApps(merged);
      })
      .catch(() => null);
  }, []);

  return (
    <main className="px-4 py-5">
      <SectionHeader
        title="申請"
        subtitle="狀態：審批中 · 成功批核 · 申請失敗"
      />

      {apps === null ? (
        <p className="text-sm text-text-muted">載入中…</p>
      ) : apps.length === 0 ? (
        <EmptyState
          title="尚未有申請"
          description="開始新申請後，進度會在這裡列出。"
          action={
            <Link href="/apply">
              <Button size="lg">＋ 新申請</Button>
            </Link>
          }
        />
      ) : (
        <div className="space-y-3">
          <Link href="/apply">
            <Button fullWidth>＋ 新申請</Button>
          </Link>
          {apps.map((app) => {
            const status = normalizeClientAppStatus(app.status);
            return (
              <Link key={app.id} href={`/app/applications/${app.id}`}>
                <Card className="transition hover:bg-surface-2/60">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs text-text-muted">{app.id}</p>
                      <p className="mt-1 font-semibold text-navy-900">
                        {app.loanType === "secured"
                          ? "有抵押貸款"
                          : "無抵押貸款"}
                      </p>
                      <p className="mt-1 text-sm text-text-secondary">
                        <span className="tabular">
                          {formatHKD(app.amount)}
                        </span>
                        {" · "}
                        {app.purpose}
                      </p>
                      <p className="mt-1 text-xs text-text-muted">
                        文件 {app.docsPct ?? 0}%
                        {typeof app.bankCount === "number"
                          ? ` · 月結單 ${app.bankCount}/6`
                          : ""}
                      </p>
                    </div>
                    <span
                      className={cn(
                        "shrink-0 rounded-full px-2.5 py-1 text-xs font-medium",
                        clientAppStatusTone(status),
                      )}
                    >
                      {clientAppStatusLabel(status)}
                    </span>
                  </div>

                  {status === "rejected" && (
                    <div className="mt-3 rounded-xl bg-danger-100/70 px-3 py-2 text-xs text-danger-600">
                      <p className="font-medium">失敗原因</p>
                      <p className="mt-0.5 leading-relaxed">
                        {app.failureReason?.trim() || "未有提供失敗原因"}
                      </p>
                    </div>
                  )}

                  {status === "approved" && (
                    <p className="mt-3 text-xs text-success-600">
                      已成功批核。實際放款條件以貸款機構通知為準。
                    </p>
                  )}

                  <p className="mt-3 text-xs text-text-muted">
                    更新於 {formatDateTime(app.updatedAt)}
                  </p>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </main>
  );
}
