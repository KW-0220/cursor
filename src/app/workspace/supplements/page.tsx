"use client";

import Link from "next/link";
import { FileUploadCard } from "@/components/biz/file-upload-card";
import { BizDocBadge } from "@/components/biz/status";
import { getDocSlot } from "@/lib/bizdoc/documents";
import { addMockUpload } from "@/lib/bizdoc/store";
import { useBizdoc } from "@/lib/bizdoc/client-store";
import { Button } from "@/components/ui/button";

export default function SupplementsPage() {
  const { app, update, hydrated } = useBizdoc();
  if (!hydrated || !app.id) {
    return (
      <div className="flex flex-1 items-center justify-center p-8 text-sm text-[color:var(--biz-muted)]">
        載入中……
      </div>
    );
  }

  const need = app.files.filter((f) =>
    [
      "needs_resubmit",
      "unclear",
      "expired",
      "incomplete",
      "wrong_type",
      "inconsistent",
    ].includes(f.status),
  );
  const slots = [...new Set(need.map((f) => f.slotId))];

  return (
    <main className="flex-1 px-4 py-6 md:px-8 md:py-8">
      <h1 className="font-[family-name:var(--font-biz-display)] text-3xl font-semibold text-[color:var(--biz-forest-900)]">
        補件要求
      </h1>
      <p className="mt-1 text-sm text-[color:var(--biz-muted)]">
        請按指示重新上載；補交後狀態會更新為「補交文件檢查中」。
      </p>

      {need.length === 0 ? (
        <div className="mt-10 rounded-2xl border border-dashed border-[color:var(--biz-border)] px-6 py-16 text-center">
          <p className="text-sm text-[color:var(--biz-muted)]">
            目前沒有補件要求
          </p>
          <Link href="/workspace" className="mt-4 inline-block">
            <Button variant="outline">返回概覽</Button>
          </Link>
        </div>
      ) : (
        <div className="mt-8 space-y-6">
          {need.map((f) => (
            <div
              key={f.id}
              className="rounded-2xl border border-[color:var(--biz-gold-600)]/30 bg-[color:var(--biz-gold-100)]/40 p-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-medium">{f.originalName}</p>
                <BizDocBadge status={f.status} />
              </div>
              <p className="mt-2 text-sm text-[color:var(--biz-gold-800)]">
                問題類型：{f.issueType || "需要補交"}
              </p>
              <p className="mt-1 text-sm text-[color:var(--biz-ink)]">
                {f.issueReason}
              </p>
            </div>
          ))}

          {slots.map((slotId) => (
            <FileUploadCard
              key={slotId}
              slot={getDocSlot(slotId)}
              files={app.files.filter((f) => f.slotId === slotId)}
              onUpload={(file) => {
                const next = addMockUpload(app, slotId, {
                  name: file.name,
                  size: file.size,
                  type: file.type,
                });
                update(() => next);
              }}
            />
          ))}
        </div>
      )}
    </main>
  );
}
