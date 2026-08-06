"use client";

import { useState } from "react";
import Link from "next/link";
import { ApplyWizardShell } from "@/components/biz/apply-wizard-shell";
import { FileUploadCard } from "@/components/biz/file-upload-card";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/field";
import {
  DOC_GROUP_LABEL,
  classificationSummary,
  effectiveCategory,
  isClassificationComplete,
  type DocGroupId,
} from "@/lib/bizdoc/classification";
import { useBizdoc } from "@/lib/bizdoc/client-store";
import {
  buildDocProgress,
  getResolvedPlans,
  statementSetMissing,
  statementSetSatisfied,
} from "@/lib/bizdoc/completeness";
import {
  STATEMENT_MONTH_SETS,
  planToUploadDef,
  type BizDocSlotId,
} from "@/lib/bizdoc/documents";
import { uploadBizdocFile } from "@/lib/bizdoc/upload-client";

export default function DynamicDocumentsPage() {
  const { app, update, saveNow } = useBizdoc();
  const classified = isClassificationComplete(app.classification);
  const cat = effectiveCategory(app.classification);
  const plans = getResolvedPlans(app);
  const progress = buildDocProgress(app);
  const [uploading, setUploading] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  async function addFile(slotId: BizDocSlotId, file: File) {
    setUploadError(null);
    setUploading(slotId);
    try {
      const uploaded = await uploadBizdocFile({
        applicationId: app.id,
        slotId,
        file,
        uploadedBy: app.applicant.name || "客戶",
      });
      update((prev) => ({
        ...prev,
        files: [
          ...prev.files.filter(
            (f) => f.slotId !== slotId || f.status === "approved",
          ),
          uploaded,
        ],
      }));
      saveNow();
    } catch (e) {
      setUploadError(e instanceof Error ? e.message : "上載失敗");
    } finally {
      setUploading(null);
    }
  }

  function removeFile(fileId: string) {
    update((prev) => ({
      ...prev,
      files: prev.files.filter((f) => f.id !== fileId),
    }));
    saveNow();
  }

  if (!classified || !cat) {
    return (
      <ApplyWizardShell stepId="documents">
        <div className="mx-auto max-w-3xl rounded-2xl border border-dashed border-[color:var(--biz-border)] bg-white px-6 py-12 text-center">
          <p className="text-sm text-[color:var(--biz-muted)]">
            請先完成並確認申請分類，系統才會顯示對應文件清單。
          </p>
          <Link href="/workspace/apply/classify" className="mt-4 inline-block">
            <Button>前往分類問卷</Button>
          </Link>
        </div>
      </ApplyWizardShell>
    );
  }

  const byGroup = new Map<DocGroupId, typeof plans>();
  for (const p of plans) {
    const list = byGroup.get(p.slot.group) ?? [];
    list.push(p);
    byGroup.set(p.slot.group, list);
  }

  const showRelated = app.classification.hasRelatedCompany === "yes";

  return (
    <ApplyWizardShell stepId="documents">
      <div className="mx-auto max-w-3xl space-y-8">
        <div>
          <h2 className="text-2xl font-semibold text-[color:var(--biz-ink)]">
            個人化文件上載
          </h2>
          <p className="mt-2 text-sm text-[color:var(--biz-muted)]">
            你的申請類別：{classificationSummary(app.classification)}
          </p>
        </div>

        <div className="rounded-2xl border border-[color:var(--biz-border)] bg-white p-5">
          <p className="text-sm font-medium">
            文件進度：已完成 {progress.requiredDone}／{progress.requiredTotal} 項（
            {progress.percent}%）
          </p>
          {progress.missingLabels.length > 0 && (
            <div className="mt-3">
              <p className="text-xs text-[color:var(--biz-muted)]">尚欠：</p>
              <ul className="mt-1 space-y-1 text-sm text-[color:var(--biz-gold-800)]">
                {progress.missingLabels.slice(0, 8).map((l) => (
                  <li key={l}>・{l}</li>
                ))}
              </ul>
            </div>
          )}
          <p className="mt-3 text-xs text-[color:var(--biz-muted)]">
            面簽當天需帶備：{progress.interviewNeeded} 項（見「面簽準備」步驟）
          </p>
        </div>

        {uploadError && (
          <p className="rounded-xl bg-danger-100 px-3 py-2 text-sm text-danger-600">
            {uploadError}
          </p>
        )}
        {uploading && (
          <p className="text-sm text-[color:var(--biz-forest-700)]">
            正在上載文件……
          </p>
        )}

        {showRelated && (
          <section className="space-y-3 rounded-2xl border border-[color:var(--biz-border)] bg-white p-5">
            <h3 className="font-semibold">關聯公司資料</h3>
            <p className="text-xs text-[color:var(--biz-muted)]">
              由相同股東／董事／UBO／管理團隊持有或控制，並已有實際業務營運的公司。
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="關聯公司名稱">
                <Input
                  value={app.relatedCompany.name}
                  onChange={(e) =>
                    update((p) => ({
                      ...p,
                      relatedCompany: { ...p.relatedCompany, name: e.target.value },
                    }))
                  }
                />
              </Field>
              <Field label="所在地">
                <Input
                  value={app.relatedCompany.location}
                  onChange={(e) =>
                    update((p) => ({
                      ...p,
                      relatedCompany: {
                        ...p.relatedCompany,
                        location: e.target.value,
                      },
                    }))
                  }
                />
              </Field>
              <Field label="與香港公司的關係">
                <Input
                  value={app.relatedCompany.relation}
                  onChange={(e) =>
                    update((p) => ({
                      ...p,
                      relatedCompany: {
                        ...p.relatedCompany,
                        relation: e.target.value,
                      },
                    }))
                  }
                />
              </Field>
              <div className="sm:col-span-2">
                <Field label="備註">
                  <Textarea
                    value={app.relatedCompany.notes}
                    onChange={(e) =>
                      update((p) => ({
                        ...p,
                        relatedCompany: {
                          ...p.relatedCompany,
                          notes: e.target.value,
                        },
                      }))
                    }
                  />
                </Field>
              </div>
            </div>
          </section>
        )}

        {(["personal", "related", "hk"] as const).map((key) => {
          const set = STATEMENT_MONTH_SETS[key];
          const inPlan = plans.some(
            (p) =>
              set.months.includes(p.slot.id) || p.slot.id === set.combined,
          );
          if (!inPlan) return null;
          const ok = statementSetSatisfied(app, key);
          const missing = statementSetMissing(app, key);
          return (
            <div
              key={key}
              className="rounded-xl border border-[color:var(--biz-border)] bg-[color:var(--biz-surface-2)] px-4 py-3 text-sm"
            >
              <p className="font-medium">
                {key === "personal"
                  ? "個人銀行流水"
                  : key === "related"
                    ? "關聯公司銀行流水"
                    : "香港公司銀行結單"}{" "}
                · {ok ? "月份完整 ✓" : "尚未完整"}
              </p>
              {!ok && (
                <p className="mt-1 text-xs text-[color:var(--biz-gold-800)]">
                  尚欠：{missing.join("、") || "請上載分月或合併 PDF"}
                </p>
              )}
            </div>
          );
        })}

        {[...byGroup.entries()].map(([group, groupPlans]) => (
          <section key={group} className="space-y-4">
            <h3 className="text-lg font-semibold text-[color:var(--biz-ink)]">
              群組 {group} · {DOC_GROUP_LABEL[group]}
            </h3>
            {groupPlans.map((plan) => {
              const def = planToUploadDef(plan);
              const files = app.files.filter((f) => f.slotId === plan.slot.id);
              return (
                <FileUploadCard
                  key={plan.slot.id}
                  slot={def}
                  files={files}
                  onUpload={(file) => addFile(plan.slot.id, file)}
                  onRemove={removeFile}
                />
              );
            })}
          </section>
        ))}

        <p className="text-xs text-[color:var(--biz-muted)]">
          CV 電子版於上方上載；面簽列印本請於「面簽準備」標示已準備。文件收齊不代表開戶獲批。
        </p>
      </div>
    </ApplyWizardShell>
  );
}
