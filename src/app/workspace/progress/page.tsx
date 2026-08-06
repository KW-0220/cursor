"use client";

import Link from "next/link";
import { BizStatusBadge, WhatsAppBadge } from "@/components/biz/status";
import { BIZ_STATUS_DESC } from "@/lib/bizdoc/types";
import { formatDateTime } from "@/lib/bizdoc/completeness";
import { useBizdoc } from "@/lib/bizdoc/client-store";
import { Button } from "@/components/ui/button";

export default function ProgressPage() {
  const { app, hydrated } = useBizdoc();
  if (!hydrated || !app.id) {
    return (
      <div className="flex flex-1 items-center justify-center p-8 text-sm text-[color:var(--biz-muted)]">
        載入中……
      </div>
    );
  }

  return (
    <main className="flex-1 px-4 py-6 md:px-8 md:py-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-[family-name:var(--font-biz-display)] text-3xl font-semibold text-[color:var(--biz-forest-900)]">
            申請進度
          </h1>
          <p className="mt-1 text-sm text-[color:var(--biz-muted)]">
            {app.id} · {app.company.nameZh || "未命名公司"}
          </p>
        </div>
        <BizStatusBadge status={app.status} />
      </div>

      <p className="mt-4 max-w-2xl text-sm text-[color:var(--biz-muted)]">
        {BIZ_STATUS_DESC[app.status]}
        文件收齊或提交相關機構，均不代表商業戶口已獲批。
      </p>

      <ol className="relative mt-10 space-y-0 border-l-2 border-[color:var(--biz-border)] ml-3">
        {app.timeline.map((ev, i) => {
          const active = i === app.timeline.length - 1;
          return (
            <li key={ev.id} className="relative pb-8 pl-8 last:pb-0">
              <span
                className={
                  active
                    ? "absolute -left-[9px] top-1 size-4 rounded-full border-2 border-[color:var(--biz-gold-500)] bg-[color:var(--biz-forest-800)]"
                    : "absolute -left-[7px] top-1.5 size-3 rounded-full bg-[color:var(--biz-forest-600)]"
                }
              />
              <p className="text-sm font-semibold text-[color:var(--biz-ink)]">
                {ev.label}
              </p>
              <p className="mt-0.5 text-xs text-[color:var(--biz-muted)]">
                {formatDateTime(ev.at)}
              </p>
              <p className="mt-2 text-sm text-[color:var(--biz-muted)]">
                {ev.description}
              </p>
              {ev.clientAction && (
                <Link href="/workspace/supplements" className="mt-2 inline-block">
                  <Button size="sm" variant="outline">
                    {ev.clientAction}
                  </Button>
                </Link>
              )}
              {ev.whatsappStatus && (
                <div className="mt-2">
                  <WhatsAppBadge status={ev.whatsappStatus} />
                </div>
              )}
            </li>
          );
        })}
      </ol>

      <section className="mt-10 rounded-2xl border border-[color:var(--biz-border)] bg-[color:var(--biz-surface)] p-5">
        <h2 className="text-sm font-semibold">WhatsApp 通知記錄</h2>
        {app.whatsapp.length === 0 ? (
          <p className="mt-3 text-sm text-[color:var(--biz-muted)]">
            尚未有通知記錄
          </p>
        ) : (
          <ul className="mt-3 space-y-3">
            {app.whatsapp.map((w) => (
              <li
                key={w.id}
                className="rounded-xl border border-[color:var(--biz-border)] px-3 py-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-xs text-[color:var(--biz-muted)]">
                    {formatDateTime(w.sentAt)} · {w.phone}
                  </p>
                  <WhatsAppBadge status={w.status} />
                </div>
                <p className="mt-2 text-sm leading-relaxed">{w.content}</p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
