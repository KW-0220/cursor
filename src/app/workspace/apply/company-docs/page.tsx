"use client";

import { ApplyWizardShell } from "@/components/biz/apply-wizard-shell";
import { FileUploadCard } from "@/components/biz/file-upload-card";
import { Field, Select } from "@/components/ui/field";
import { slotsByCategory } from "@/lib/bizdoc/documents";
import { addMockUpload } from "@/lib/bizdoc/store";
import { useBizdoc } from "@/lib/bizdoc/client-store";
import type { Nar1Option } from "@/lib/bizdoc/types";

export default function CompanyDocsStepPage() {
  const { app, update, hydrated } = useBizdoc();
  if (!hydrated || !app.id) return null;
  const slots = slotsByCategory("company");

  return (
    <ApplyWizardShell stepId="company-docs">
      <div className="mx-auto max-w-3xl space-y-6">
        <div>
          <h1 className="font-[family-name:var(--font-biz-display)] text-2xl font-semibold text-[color:var(--biz-forest-900)]">
            公司文件
          </h1>
          <p className="mt-1 text-sm text-[color:var(--biz-muted)]">
            每類文件獨立上載；上載成功後即時儲存。
          </p>
        </div>

        <Field label="最新週年申報表情況">
          <Select
            value={app.nar1Option ?? ""}
            onChange={(e) =>
              update((p) => ({
                ...p,
                nar1Option: (e.target.value || null) as Nar1Option | null,
              }))
            }
          >
            <option value="">請選擇</option>
            <option value="has_nar1">已有最新週年申報表</option>
            <option value="under_one_year">公司成立未滿一年</option>
            <option value="not_yet">暫未有週年申報表</option>
          </Select>
        </Field>

        {slots.map((slot) => (
          <FileUploadCard
            key={slot.id}
            slot={slot}
            files={app.files.filter((f) => f.slotId === slot.id)}
            locked={Boolean(app.submittedAt) && !app.files.some((f) => f.slotId === slot.id && f.status === "needs_resubmit")}
            onUpload={(file) => {
              const next = addMockUpload(app, slot.id, {
                name: file.name,
                size: file.size,
                type: file.type,
              });
              update(() => next);
            }}
            onRemove={(fileId) => {
              if (app.submittedAt) return;
              update((p) => ({
                ...p,
                files: p.files.filter((f) => f.id !== fileId),
              }));
            }}
          />
        ))}
      </div>
    </ApplyWizardShell>
  );
}
