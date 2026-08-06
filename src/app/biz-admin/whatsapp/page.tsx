"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { WhatsAppBadge } from "@/components/biz/status";
import { Button } from "@/components/ui/button";
import { formatDateTime } from "@/lib/bizdoc/completeness";
import type { BizApplication, BizWhatsAppMessage } from "@/lib/bizdoc/types";

type Row = {
  app: BizApplication;
  msg: BizWhatsAppMessage;
};

export default function BizAdminWhatsAppPage() {
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

  const rows = useMemo(() => {
    const out: Row[] = [];
    for (const app of apps) {
      for (const msg of app.whatsapp) {
        out.push({ app, msg });
      }
    }
    return out.sort(
      (a, b) =>
        new Date(b.msg.sentAt).getTime() - new Date(a.msg.sentAt).getTime(),
    );
  }, [apps]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-[color:var(--biz-ink)]">
            WhatsApp 通知中心
          </h2>
          <p className="mt-1 text-sm text-[color:var(--biz-muted)]">
            提交確認、補件要求、文件收齊等通知紀錄（MVP 模擬發送）
          </p>
        </div>
        <Button size="sm" variant="outline" onClick={() => void load()}>
          重新整理
        </Button>
      </div>

      {error && (
        <p className="rounded-xl bg-danger-100 px-3 py-2 text-sm text-danger-600">
          {error}
        </p>
      )}

      {loading ? (
        <p className="text-sm text-[color:var(--biz-muted)]">載入中…</p>
      ) : rows.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-[color:var(--biz-border)] bg-white px-6 py-12 text-center text-sm text-[color:var(--biz-muted)]">
          尚無 WhatsApp 紀錄。
        </p>
      ) : (
        <ul className="space-y-3">
          {rows.map(({ app, msg }) => (
            <li
              key={msg.id}
              className="rounded-2xl border border-[color:var(--biz-border)] bg-white p-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="text-xs text-[color:var(--biz-muted)]">
                  <span className="font-medium text-[color:var(--biz-ink)]">
                    {msg.type}
                  </span>{" "}
                  · {formatDateTime(msg.sentAt)} · {msg.phone}
                </div>
                <WhatsAppBadge status={msg.status} />
              </div>
              <p className="mt-2 text-sm">{msg.content}</p>
              <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-[color:var(--biz-muted)]">
                <span>
                  {app.company.nameZh || app.id} · {app.applicant.name}
                </span>
                <Link
                  href={`/biz-admin/applications/${app.id}`}
                  className="text-[color:var(--biz-forest-700)] hover:underline"
                >
                  開啟申請 →
                </Link>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
