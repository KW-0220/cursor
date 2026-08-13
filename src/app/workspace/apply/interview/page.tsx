"use client";

import { ApplyWizardShell } from "@/components/biz/apply-wizard-shell";
import { Button } from "@/components/ui/button";
import { INTERVIEW_CHECKLIST_BASE } from "@/lib/bizdoc/documents";
import { useBizdoc } from "@/lib/bizdoc/client-store";
import type { InterviewItemStatus } from "@/lib/bizdoc/types";
import { cn } from "@/lib/utils";

const STATUS_LABEL: Record<InterviewItemStatus, string> = {
  needed: "需要帶備",
  prepared: "已準備",
  na: "不適用",
};

export default function InterviewPrepPage() {
  const { app, update, saveNow } = useBizdoc();

  function setStatus(id: string, status: InterviewItemStatus) {
    update((prev) => ({
      ...prev,
      interviewChecklist: {
        ...prev.interviewChecklist,
        [id]: status,
      },
    }));
    saveNow();
  }

  return (
    <ApplyWizardShell stepId="interview">
      <div className="mx-auto max-w-3xl space-y-6">
        <div>
          <h2 className="text-2xl font-semibold text-[color:var(--biz-ink)]">
            面簽當天帶備文件
          </h2>
          <p className="mt-2 text-sm text-[color:var(--biz-muted)]">
            此部分不是一般文件上載，而是面簽前 Checklist。電子版 CV
            已上載後，仍須列印正本於面簽當天帶備。
          </p>
        </div>

        <ul className="space-y-3">
          {INTERVIEW_CHECKLIST_BASE.map((item) => {
            const status =
              app.interviewChecklist?.[item.id] ?? ("needed" as const);
            return (
              <li
                key={item.id}
                className="rounded-2xl border border-[color:var(--biz-border)] bg-white p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-medium">{item.label}</p>
                    {item.hint && (
                      <p className="mt-1 text-xs text-[color:var(--biz-gold-800)]">
                        {item.hint}
                      </p>
                    )}
                  </div>
                  <span
                    className={cn(
                      "rounded-md px-2 py-0.5 text-[11px] font-medium",
                      status === "prepared"
                        ? "bg-[color:var(--biz-forest-100)] text-[color:var(--biz-forest-800)]"
                        : status === "na"
                          ? "bg-[color:var(--biz-surface-2)] text-[color:var(--biz-muted)]"
                          : "bg-[color:var(--biz-gold-100)] text-[color:var(--biz-gold-800)]",
                    )}
                  >
                    {STATUS_LABEL[status]}
                  </span>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {(
                    Object.keys(STATUS_LABEL) as InterviewItemStatus[]
                  ).map((s) => (
                    <Button
                      key={s}
                      size="sm"
                      variant={status === s ? "primary" : "outline"}
                      onClick={() => setStatus(item.id, s)}
                    >
                      {STATUS_LABEL[s]}
                    </Button>
                  ))}
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </ApplyWizardShell>
  );
}
