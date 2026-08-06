"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { formatDateTime } from "@/lib/bizdoc/completeness";
import type { BizApplication, BizAuditEntry } from "@/lib/bizdoc/types";

type Row = {
  app: BizApplication;
  entry: BizAuditEntry;
};

export default function BizAdminAuditPage() {
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
      for (const entry of app.auditLog) {
        out.push({ app, entry });
      }
    }
    return out.sort(
      (a, b) =>
        new Date(b.entry.at).getTime() - new Date(a.entry.at).getTime(),
    );
  }, [apps]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-[color:var(--biz-ink)]">
            操作審計
          </h2>
          <p className="mt-1 text-sm text-[color:var(--biz-muted)]">
            審核員動作、狀態變更、補件與內部備註紀錄
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
          尚無操作紀錄。
        </p>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-[color:var(--biz-border)] bg-white">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="border-b border-[color:var(--biz-border)] bg-[color:var(--biz-surface-2)] text-xs text-[color:var(--biz-muted)]">
              <tr>
                <th className="px-3 py-3 font-medium">時間</th>
                <th className="px-3 py-3 font-medium">申請</th>
                <th className="px-3 py-3 font-medium">操作者</th>
                <th className="px-3 py-3 font-medium">動作</th>
                <th className="px-3 py-3 font-medium">詳情</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ app, entry }) => (
                <tr
                  key={entry.id}
                  className="border-b border-[color:var(--biz-border)] last:border-0"
                >
                  <td className="px-3 py-3 text-xs text-[color:var(--biz-muted)]">
                    {formatDateTime(entry.at)}
                  </td>
                  <td className="px-3 py-3">
                    <Link
                      href={`/biz-admin/applications/${app.id}`}
                      className="text-[color:var(--biz-forest-700)] hover:underline"
                    >
                      {app.id}
                    </Link>
                    <p className="text-xs text-[color:var(--biz-muted)]">
                      {app.company.nameZh}
                    </p>
                  </td>
                  <td className="px-3 py-3">{entry.actor}</td>
                  <td className="px-3 py-3 font-medium">{entry.action}</td>
                  <td className="px-3 py-3 text-[color:var(--biz-muted)]">
                    {entry.detail}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
