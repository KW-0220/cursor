"use client";

import { ApplyWizardShell } from "@/components/biz/apply-wizard-shell";
import { FileUploadCard } from "@/components/biz/file-upload-card";
import { getDocSlot } from "@/lib/bizdoc/documents";
import { addMockUpload } from "@/lib/bizdoc/store";
import { useBizdoc } from "@/lib/bizdoc/client-store";

export default function PersonalDocsStepPage() {
  const { app, update, hydrated } = useBizdoc();
  if (!hydrated || !app.id) return null;
  const slots = [
    getDocSlot("director_id"),
    getDocSlot("shareholder_id"),
    getDocSlot("address_proof"),
  ];

  return (
    <ApplyWizardShell stepId="personal-docs">
      <div className="mx-auto max-w-3xl space-y-6">
        <div>
          <h1 className="font-[family-name:var(--font-biz-display)] text-2xl font-semibold text-[color:var(--biz-forest-900)]">
            個人文件
          </h1>
          <p className="mt-1 text-sm text-[color:var(--biz-muted)]">
            董事／股東身份證明與住址證明。支援香港身份證、護照及海外地址證明。
          </p>
        </div>
        {slots.map((slot) => (
          <FileUploadCard
            key={slot.id}
            slot={slot}
            files={app.files.filter((f) => f.slotId === slot.id)}
            onUpload={(file) => {
              const next = addMockUpload(app, slot.id, {
                name: file.name,
                size: file.size,
                type: file.type,
              });
              update(() => next);
            }}
            onRemove={(fileId) => {
              const f = app.files.find((x) => x.id === fileId);
              if (f?.status === "approved") return;
              update((p) => ({
                ...p,
                files: p.files.filter((x) => x.id !== fileId),
              }));
            }}
          />
        ))}
      </div>
    </ApplyWizardShell>
  );
}
