"use client";

import Link from "next/link";
import { AlertTriangle, ArrowRight, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BizProgressBar, BizStatusBadge, WhatsAppBadge } from "@/components/biz/status";
import {
  BIZ_STATUS_CTA,
  BIZ_STATUS_DESC,
} from "@/lib/bizdoc/types";
import { buildChecklist, formatDateTime } from "@/lib/bizdoc/completeness";
import { useBizdoc } from "@/lib/bizdoc/client-store";

export default function WorkspaceDashboardPage() {
  const { app, hydrated } = useBizdoc();

  if (!hydrated || !app.id) {
    return (
      <div className="flex flex-1 items-center justify-center p-8 text-sm text-[color:var(--biz-muted)]">
        載入中……
      </div>
    );
  }

  const checklist = buildChecklist(app);
  const missing = checklist.filter((c) => !c.done);
  const needsAction =
    app.status === "draft" ||
    app.status === "missing_docs" ||
    app.status === "needs_supplement" ||
    app.status === "needs_further_info";
  const cta = BIZ_STATUS_CTA[app.status];
  const ctaHref =
    app.status === "needs_supplement"
      ? "/workspace/supplements"
      : app.status === "missing_docs"
        ? "/workspace/documents"
        : "/workspace/apply/applicant";
  const lastWa = app.whatsapp[app.whatsapp.length - 1];

  return (
    <main className="flex-1 px-4 py-6 md:px-8 md:py-8">
      <div className="animate-biz-rise flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-[color:var(--biz-muted)]">
            申請概覽
          </p>
          <h1 className="mt-1 font-[family-name:var(--font-biz-display)] text-3xl font-semibold text-[color:var(--biz-forest-900)]">
            {app.company.nameZh || "未命名公司"}
          </h1>
          <p className="mt-1 text-sm text-[color:var(--biz-muted)]">
            申請編號 {app.id} · 建立於 {formatDateTime(app.createdAt)}
          </p>
        </div>
        <BizStatusBadge status={app.status} />
      </div>

      <div className="animate-biz-rise-delay mt-6 grid gap-4 lg:grid-cols-3">
        <section className="rounded-2xl border border-[color:var(--biz-border)] bg-[color:var(--biz-surface)] p-5 lg:col-span-2">
          <BizProgressBar value={app.completeness} />
          <p className="mt-4 text-sm leading-relaxed text-[color:var(--biz-ink)]">
            {BIZ_STATUS_DESC[app.status]}
            {app.pausedReason ? ` 原因：${app.pausedReason}` : ""}
          </p>
          <div className="mt-4 flex flex-wrap gap-3 text-sm">
            <div className="rounded-xl bg-[color:var(--biz-surface-2)] px-3 py-2">
              <p className="text-xs text-[color:var(--biz-muted)]">尚欠項目</p>
              <p className="tabular text-lg font-semibold">{missing.length}</p>
            </div>
            <div className="rounded-xl bg-[color:var(--biz-surface-2)] px-3 py-2">
              <p className="text-xs text-[color:var(--biz-muted)]">最近更新</p>
              <p className="text-sm font-medium">{formatDateTime(app.updatedAt)}</p>
            </div>
            {app.submittedAt && (
              <div className="rounded-xl bg-[color:var(--biz-surface-2)] px-3 py-2">
                <p className="text-xs text-[color:var(--biz-muted)]">提交時間</p>
                <p className="text-sm font-medium">
                  {formatDateTime(app.submittedAt)}
                </p>
              </div>
            )}
          </div>

          {needsAction && (
            <div className="mt-5 flex flex-wrap items-center gap-3 rounded-xl bg-[color:var(--biz-gold-100)] px-4 py-3 text-sm text-[color:var(--biz-gold-800)]">
              <AlertTriangle className="size-4 shrink-0" />
              <span className="flex-1">需要你採取行動</span>
              <Link href={ctaHref}>
                <Button size="sm" className="bg-[color:var(--biz-forest-800)] hover:bg-[color:var(--biz-forest-900)]">
                  {cta || "繼續"}
                  <ArrowRight className="size-4" />
                </Button>
              </Link>
            </div>
          )}

          {!needsAction && app.submittedAt && (
            <div className="mt-5 rounded-xl bg-[color:var(--biz-forest-100)] px-4 py-3 text-sm text-[color:var(--biz-forest-800)]">
              你暫時無需採取行動。團隊正在處理；如需補件會透過 WhatsApp 通知。
            </div>
          )}

          <div className="mt-6 flex flex-wrap gap-2">
            <Link href="/workspace/apply/applicant">
              <Button>繼續申請</Button>
            </Link>
            <Link href="/workspace/progress">
              <Button variant="outline">查看進度</Button>
            </Link>
            <Link href="/workspace/documents">
              <Button variant="outline">文件中心</Button>
            </Link>
          </div>
        </section>

        <section className="space-y-4">
          <div className="rounded-2xl border border-[color:var(--biz-border)] bg-[color:var(--biz-surface)] p-5">
            <p className="text-sm font-semibold text-[color:var(--biz-ink)]">
              下一步行動
            </p>
            <p className="mt-2 text-sm text-[color:var(--biz-muted)]">
              {cta
                ? `請${cta}`
                : app.status === "docs_complete"
                  ? "等待下一階段安排（文件收齊 ≠ 開戶獲批）"
                  : "無需額外操作，請留意 WhatsApp 通知"}
            </p>
          </div>

          {lastWa && (
            <div className="rounded-2xl border border-[color:var(--biz-border)] bg-[color:var(--biz-surface)] p-5">
              <div className="flex items-center justify-between gap-2">
                <p className="inline-flex items-center gap-1.5 text-sm font-semibold">
                  <MessageCircle className="size-4 text-[color:var(--biz-forest-700)]" />
                  最近 WhatsApp
                </p>
                <WhatsAppBadge status={lastWa.status} />
              </div>
              <p className="mt-3 text-xs leading-relaxed text-[color:var(--biz-muted)]">
                {lastWa.content}
              </p>
              <p className="mt-2 text-[11px] text-[color:var(--biz-muted)]">
                {formatDateTime(lastWa.sentAt)}
              </p>
            </div>
          )}
        </section>
      </div>

      {missing.length > 0 && (
        <section className="animate-biz-rise-delay-2 mt-6 rounded-2xl border border-[color:var(--biz-border)] bg-[color:var(--biz-surface)] p-5">
          <h2 className="text-sm font-semibold text-[color:var(--biz-ink)]">
            尚欠項目
          </h2>
          <ul className="mt-3 divide-y divide-[color:var(--biz-border)]">
            {missing.map((m) => (
              <li
                key={m.id}
                className="flex items-center justify-between gap-3 py-3 text-sm"
              >
                <span>{m.label}</span>
                {m.href && (
                  <Link
                    href={m.href}
                    className="text-[color:var(--biz-forest-700)] hover:underline"
                  >
                    前往
                  </Link>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}
