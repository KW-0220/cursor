"use client";

import { useState } from "react";
import Link from "next/link";
import { FileUploadCard } from "@/components/biz/file-upload-card";
import { BizDocBadge } from "@/components/biz/status";
import { getDocSlot } from "@/lib/bizdoc/documents";
import { useBizdoc } from "@/lib/bizdoc/client-store";
import { uploadBizdocFile } from "@/lib/bizdoc/upload-client";
import { Button } from "@/components/ui/button";
import type { BizDocSlotId } from "@/lib/bizdoc/documents";

export default function SupplementsPage() {
  const { app, update, saveNow, hydrated } = useBizdoc();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

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

  async function reupload(slotId: BizDocSlotId, file: File) {
    setError(null);
    setBusy(true);
    try {
      const uploaded = await uploadBizdocFile({
        applicationId: app.id,
        slotId,
        file,
        uploadedBy: app.applicant.name || "客戶",
      });
      update((prev) => ({
        ...prev,
        status: "supplement_review",
        files: [
          ...prev.files.filter(
            (f) => f.slotId !== slotId || f.status === "approved",
          ),
          {
            ...uploaded,
            status: "reuploaded" as const,
            version: uploaded.version,
          },
        ],
      }));
      // 強制寫入並通知審核員
      const nextApp = {
        ...app,
        status: "supplement_review" as const,
        updatedAt: new Date().toISOString(),
        files: [
          ...app.files.filter(
            (f) => f.slotId !== slotId || f.status === "approved",
          ),
          {
            ...uploaded,
            status: "reuploaded" as const,
            version: uploaded.version,
          },
        ],
      };
      saveNow();
      void fetch("/api/biz/applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          application: nextApp,
          notifyEvents: ["reviewer_resubmit"],
        }),
      }).catch(() => null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "上載失敗");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="flex-1 px-4 py-6 md:px-8 md:py-8">
      <h1 className="font-[family-name:var(--font-biz-display)] text-3xl font-semibold text-[color:var(--biz-forest-900)]">
        補件要求
      </h1>
      <p className="mt-1 text-sm text-[color:var(--biz-muted)]">
        請按指示重新上載；補交後狀態會更新為「補交文件檢查中」。
      </p>

      {error && (
        <p className="mt-4 rounded-xl bg-danger-100 px-3 py-2 text-sm text-danger-600">
          {error}
        </p>
      )}
      {busy && (
        <p className="mt-2 text-sm text-[color:var(--biz-forest-700)]">
          正在上載……
        </p>
      )}

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

          {slots.map((slotId) => {
            const slot = getDocSlot(slotId);
            if (!slot) return null;
            return (
              <FileUploadCard
                key={slotId}
                slot={{ ...slot, required: true }}
                files={app.files.filter((f) => f.slotId === slotId)}
                onUpload={(file) => {
                  void reupload(slotId, file);
                }}
              />
            );
          })}
        </div>
      )}
    </main>
  );
}
