"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { APPLY_STEPS, type ApplyStepId } from "@/lib/bizdoc/types";
import { saveLabel, useBizdoc } from "@/lib/bizdoc/client-store";
import { Button } from "@/components/ui/button";
import { BizProgressBar } from "@/components/biz/status";
import { cn } from "@/lib/utils";

export function ApplyWizardShell({
  stepId,
  children,
  onNext,
  nextLabel,
}: {
  stepId: ApplyStepId;
  children: React.ReactNode;
  /** 覆寫預設「儲存並下一步」行為（例如分類頁要先驗證） */
  onNext?: () => void;
  nextLabel?: string;
}) {
  const router = useRouter();
  const { app, saveState, lastSavedAt, saveNow, hydrated } = useBizdoc();
  const idx = APPLY_STEPS.findIndex((s) => s.id === stepId);
  const prev = idx > 0 ? APPLY_STEPS[idx - 1] : null;
  const next = idx < APPLY_STEPS.length - 1 ? APPLY_STEPS[idx + 1] : null;

  if (!hydrated || !app.id) {
    return (
      <div className="flex flex-1 items-center justify-center p-8 text-sm text-[color:var(--biz-muted)]">
        載入申請資料……
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col lg:flex-row">
      <aside className="hidden w-64 shrink-0 border-r border-[color:var(--biz-border)] bg-[color:var(--biz-surface)] p-5 lg:block">
        <p className="text-xs font-medium uppercase tracking-wide text-[color:var(--biz-muted)]">
          申請步驟
        </p>
        <ol className="mt-4 space-y-1">
          {APPLY_STEPS.map((s, i) => {
            const active = s.id === stepId;
            const done = i < idx;
            return (
              <li key={s.id}>
                <Link
                  href={`/workspace/apply/${s.id}`}
                  className={cn(
                    "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition",
                    active
                      ? "bg-[color:var(--biz-forest-800)] text-white"
                      : done
                        ? "text-[color:var(--biz-forest-800)] hover:bg-[color:var(--biz-forest-100)]"
                        : "text-[color:var(--biz-muted)] hover:bg-[color:var(--biz-surface-2)]",
                  )}
                >
                  <span
                    className={cn(
                      "flex size-6 items-center justify-center rounded-full text-xs font-semibold",
                      active
                        ? "bg-[color:var(--biz-gold-500)] text-[color:var(--biz-ink)]"
                        : "bg-[color:var(--biz-surface-2)]",
                    )}
                  >
                    {i + 1}
                  </span>
                  {s.label}
                </Link>
              </li>
            );
          })}
        </ol>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="border-b border-[color:var(--biz-border)] bg-[color:var(--biz-surface)] px-4 py-4 md:px-8">
          <div className="mb-3 flex items-center justify-between gap-3 lg:hidden">
            <p className="text-sm font-medium text-[color:var(--biz-ink)]">
              第 {idx + 1}／{APPLY_STEPS.length} 步 · {APPLY_STEPS[idx].label}
            </p>
          </div>
          <BizProgressBar value={app.completeness} />
          <p className="mt-2 text-xs text-[color:var(--biz-muted)]">
            {saveLabel(saveState, lastSavedAt)}
          </p>
        </div>

        <div className="flex-1 px-4 py-6 md:px-8 md:py-8">{children}</div>

        <div className="sticky bottom-0 z-20 border-t border-[color:var(--biz-border)] bg-[color:var(--biz-surface)]/95 px-4 py-3 backdrop-blur md:px-8">
          <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={!prev}
              onClick={() => prev && router.push(`/workspace/apply/${prev.id}`)}
            >
              上一步
            </Button>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  saveNow();
                  router.push("/workspace");
                }}
              >
                儲存並稍後繼續
              </Button>
              {next ? (
                <Button
                  type="button"
                  onClick={() => {
                    if (onNext) {
                      onNext();
                      return;
                    }
                    saveNow();
                    router.push(`/workspace/apply/${next.id}`);
                  }}
                >
                  {nextLabel || "儲存並下一步"}
                </Button>
              ) : (
                <Button
                  type="button"
                  onClick={() => {
                    if (onNext) {
                      onNext();
                      return;
                    }
                    saveNow();
                    router.push("/workspace/apply/review");
                  }}
                >
                  {nextLabel || "前往檢查及提交"}
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
