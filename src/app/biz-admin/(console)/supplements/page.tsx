"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { BizDocBadge, BizStatusBadge } from "@/components/biz/status";
import { Button } from "@/components/ui/button";
import { formatDateTime } from "@/lib/bizdoc/completeness";
import { BIZ_DOC_SLOTS } from "@/lib/bizdoc/documents";
import type { BizApplication, BizUploadedFile } from "@/lib/bizdoc/types";

type Row = {
  app: BizApplication;
  file: BizUploadedFile;
};

export default function BizAdminSupplementsPage() {
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
      for (const file of app.files) {
        if (file.status === "needs_resubmit" || file.status === "incomplete") {
          out.push({ app, file });
        }
      }
    }
    return out.sort(
      (a, b) =>
        new Date(b.file.uploadedAt).getTime() -
        new Date(a.file.uploadedAt).getTime(),
    );
  }, [apps]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-[color:var(--biz-ink)]">
            補件中心
          </h2>
          <p className="mt-1 text-sm text-[color:var(--biz-muted)]">
            跨申請彙整需補件／不完整文件
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
          目前沒有待補件項目。
        </p>
      ) : (
        <ul className="space-y-3">
          {rows.map(({ app, file }) => {
            const slot = BIZ_DOC_SLOTS.find((s) => s.id === file.slotId);
            return (
              <li
                key={`${app.id}-${file.id}`}
                className="rounded-2xl border border-[color:var(--biz-border)] bg-white p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-medium text-[color:var(--biz-ink)]">
                      {file.originalName}
                    </p>
                    <p className="mt-1 text-xs text-[color:var(--biz-muted)]">
                      {slot?.name || file.slotId} · {app.company.nameZh || app.id}{" "}
                      · {app.applicant.name}
                    </p>
                    {(file.issueType || file.issueReason) && (
                      <p className="mt-2 text-sm text-[color:var(--biz-gold-800)]">
                        {file.issueType}
                        {file.issueReason ? ` — ${file.issueReason}` : ""}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <BizDocBadge status={file.status} />
                    <BizStatusBadge status={app.status} />
                    <p className="text-xs text-[color:var(--biz-muted)]">
                      {formatDateTime(file.uploadedAt)}
                    </p>
                    <Link href={`/biz-admin/applications/${app.id}`}>
                      <Button size="sm" variant="outline">
                        開啟申請
                      </Button>
                    </Link>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
