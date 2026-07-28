"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, EmptyState, SectionHeader } from "@/components/ui/layout";
import {
  DRAFT_STATUSES,
  LOAN_APP_STATUS_LABEL,
  type LoanAppStatus,
} from "@/lib/loan-app-status";
import { formatDateTime, formatHKD } from "@/lib/utils";

type AppRow = {
  id: string;
  loanType: "secured" | "unsecured" | null;
  requestedAmount: number | null;
  purpose: string | null;
  status: LoanAppStatus;
  statusLabel?: string;
  completionPercentage: number;
  missingItems: string[];
  nextStepLabel: string | null;
  lastSavedAt: string;
  submittedAt: string | null;
};

export default function ApplicationsPage() {
  const [apps, setApps] = useState<AppRow[] | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/applications");
      if (res.status === 401) {
        setApps([]);
        return;
      }
      const data = await res.json();
      setApps((data.applications as AppRow[]) || []);
    } catch {
      setApps([]);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function deleteDraft(id: string) {
    setDeletingId(id);
    try {
      const res = await fetch(`/api/applications/${id}`, { method: "DELETE" });
      if (res.ok) await load();
    } finally {
      setDeletingId(null);
      setConfirmId(null);
    }
  }

  const drafts =
    apps?.filter((a) => DRAFT_STATUSES.includes(a.status)) ?? [];
  const others =
    apps?.filter((a) => !DRAFT_STATUSES.includes(a.status)) ?? [];

  return (
    <main className="px-4 py-5">
      <SectionHeader
        title="申請"
        subtitle="草稿會自動保存；未齊文件亦可稍後繼續"
      />

      {apps === null ? (
        <p className="text-sm text-text-muted">載入中…</p>
      ) : apps.length === 0 ? (
        <EmptyState
          title="尚未有申請"
          description="開始新申請後，草稿及進度會在這裡列出。"
          action={
            <Link href="/apply">
              <Button size="lg">＋ 新申請</Button>
            </Link>
          }
        />
      ) : (
        <div className="space-y-5">
          <Link href="/apply">
            <Button fullWidth>＋ 新申請</Button>
          </Link>

          {drafts.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-sm font-semibold text-navy-900">
                草稿／填寫中
              </h2>
              {drafts.map((app) => (
                <Card key={app.id}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs text-text-muted">{app.id}</p>
                      <p className="mt-1 font-semibold text-navy-900">
                        {app.loanType === "secured"
                          ? "有抵押貸款"
                          : app.loanType === "unsecured"
                            ? "無抵押貸款"
                            : "中小企貸款申請"}
                      </p>
                      {typeof app.requestedAmount === "number" &&
                      app.requestedAmount > 0 ? (
                        <p className="mt-1 text-sm text-text-secondary tabular">
                          {formatHKD(app.requestedAmount)}
                          {app.purpose ? ` · ${app.purpose}` : ""}
                        </p>
                      ) : null}
                      <p className="mt-2 text-sm text-navy-800">
                        草稿完成度：{app.completionPercentage}%
                      </p>
                      {app.missingItems.length > 0 && (
                        <ul className="mt-1 space-y-0.5 text-xs text-text-muted">
                          <li className="font-medium text-text-secondary">
                            尚欠：
                          </li>
                          {app.missingItems.slice(0, 3).map((m) => (
                            <li key={m}>· {m}</li>
                          ))}
                        </ul>
                      )}
                      {app.nextStepLabel ? (
                        <p className="mt-1 text-xs text-teal-800">
                          下一步：{app.nextStepLabel}
                        </p>
                      ) : null}
                    </div>
                    <span className="rounded-full bg-surface-2 px-2.5 py-1 text-xs font-medium text-text-secondary">
                      {app.statusLabel || LOAN_APP_STATUS_LABEL[app.status]}
                    </span>
                  </div>
                  <p className="mt-3 text-xs text-text-muted">
                    最後儲存：{formatDateTime(app.lastSavedAt)}
                  </p>
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <Link href="/apply">
                      <Button fullWidth size="sm">
                        繼續申請
                      </Button>
                    </Link>
                    <Button
                      fullWidth
                      size="sm"
                      variant="outline"
                      disabled={deletingId === app.id}
                      onClick={() => setConfirmId(app.id)}
                    >
                      刪除草稿
                    </Button>
                  </div>
                </Card>
              ))}
            </section>
          )}

          {others.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-sm font-semibold text-navy-900">已提交</h2>
              {others.map((app) => (
                <Card key={app.id}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs text-text-muted">{app.id}</p>
                      <p className="mt-1 font-semibold text-navy-900">
                        {app.loanType === "secured"
                          ? "有抵押貸款"
                          : "無抵押貸款"}
                      </p>
                      <p className="mt-1 text-sm text-text-secondary">
                        {typeof app.requestedAmount === "number"
                          ? formatHKD(app.requestedAmount)
                          : "—"}
                        {app.purpose ? ` · ${app.purpose}` : ""}
                      </p>
                    </div>
                    <span className="rounded-full bg-teal-100 px-2.5 py-1 text-xs font-medium text-teal-800">
                      {app.statusLabel || LOAN_APP_STATUS_LABEL[app.status]}
                    </span>
                  </div>
                  <p className="mt-3 text-xs text-text-muted">
                    更新於 {formatDateTime(app.lastSavedAt)}
                  </p>
                </Card>
              ))}
            </section>
          )}
        </div>
      )}

      {confirmId && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center">
          <div className="w-full max-w-sm rounded-2xl bg-surface-1 p-5">
            <h3 className="font-semibold text-navy-900">刪除草稿？</h3>
            <p className="mt-2 text-sm text-text-secondary">
              刪除後，未提交的申請資料及相關文件可能無法恢復。已產生的法定或安全紀錄可能按適用政策保留。
            </p>
            <div className="mt-4 grid gap-2">
              <Button
                fullWidth
                disabled={deletingId === confirmId}
                onClick={() => void deleteDraft(confirmId)}
              >
                確認刪除草稿
              </Button>
              <Button
                fullWidth
                variant="outline"
                onClick={() => setConfirmId(null)}
              >
                取消
              </Button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
