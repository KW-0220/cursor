"use client";

import Link from "next/link";
import { BizDocBadge } from "@/components/biz/status";
import { BIZ_DOC_SLOTS } from "@/lib/bizdoc/documents";
import { formatDateTime } from "@/lib/bizdoc/completeness";
import { useBizdoc } from "@/lib/bizdoc/client-store";
import { Button } from "@/components/ui/button";

export default function DocumentsCenterPage() {
  const { app, hydrated } = useBizdoc();
  if (!hydrated || !app.id) {
    return (
      <div className="flex flex-1 items-center justify-center p-8 text-sm text-[color:var(--biz-muted)]">
        載入中……
      </div>
    );
  }

  const groups = [
    {
      title: "已上載文件",
      files: app.files.filter((f) =>
        ["uploaded", "awaiting_review", "reviewing", "reuploaded"].includes(
          f.status,
        ),
      ),
    },
    {
      title: "等待檢查",
      files: app.files.filter((f) => f.status === "awaiting_review"),
    },
    {
      title: "已通過",
      files: app.files.filter((f) => f.status === "approved"),
    },
    {
      title: "需要重新上載",
      files: app.files.filter((f) =>
        [
          "needs_resubmit",
          "unclear",
          "expired",
          "incomplete",
          "wrong_type",
          "inconsistent",
        ].includes(f.status),
      ),
    },
  ];

  return (
    <main className="flex-1 px-4 py-6 md:px-8 md:py-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-[family-name:var(--font-biz-display)] text-3xl font-semibold text-[color:var(--biz-forest-900)]">
            文件中心
          </h1>
          <p className="mt-1 text-sm text-[color:var(--biz-muted)]">
            按狀態查看已上載文件。已通過文件不可刪除。
          </p>
        </div>
        <Link href="/workspace/apply/documents">
          <Button variant="outline">前往上載</Button>
        </Link>
      </div>

      {app.files.length === 0 ? (
        <div className="mt-10 rounded-2xl border border-dashed border-[color:var(--biz-border)] px-6 py-16 text-center">
          <p className="text-sm text-[color:var(--biz-muted)]">沒有已上載文件</p>
          <Link href="/workspace/apply/documents" className="mt-4 inline-block">
            <Button>開始上載</Button>
          </Link>
        </div>
      ) : (
        <div className="mt-8 space-y-8">
          {groups.map((g) => (
            <section key={g.title}>
              <h2 className="text-sm font-semibold text-[color:var(--biz-ink)]">
                {g.title}
                <span className="ml-2 text-[color:var(--biz-muted)]">
                  ({g.files.length})
                </span>
              </h2>
              {g.files.length === 0 ? (
                <p className="mt-2 text-xs text-[color:var(--biz-muted)]">—</p>
              ) : (
                <ul className="mt-3 space-y-2">
                  {g.files.map((f) => {
                    const slot = BIZ_DOC_SLOTS.find((s) => s.id === f.slotId);
                    return (
                      <li
                        key={f.id}
                        className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[color:var(--biz-border)] bg-[color:var(--biz-surface)] px-4 py-3"
                      >
                        <div>
                          <p className="text-sm font-medium">{f.originalName}</p>
                          <p className="text-xs text-[color:var(--biz-muted)]">
                            {slot?.name} · {formatDateTime(f.uploadedAt)}
                          </p>
                        </div>
                        <BizDocBadge status={f.status} />
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          ))}
        </div>
      )}
    </main>
  );
}
