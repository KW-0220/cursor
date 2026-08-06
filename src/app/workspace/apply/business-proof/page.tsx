"use client";

import { ApplyWizardShell } from "@/components/biz/apply-wizard-shell";
import { FileUploadCard } from "@/components/biz/file-upload-card";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { getDocSlot } from "@/lib/bizdoc/documents";
import { addMockUpload } from "@/lib/bizdoc/store";
import { useBizdoc } from "@/lib/bizdoc/client-store";
import type { TradingStatus } from "@/lib/bizdoc/types";

export default function BusinessProofStepPage() {
  const { app, update, hydrated } = useBizdoc();
  if (!hydrated || !app.id) return null;
  const operating = app.tradingStatus === "operating" || !app.tradingStatus;
  const alt =
    app.tradingStatus === "not_started" || app.tradingStatus === "preparing";

  return (
    <ApplyWizardShell stepId="business-proof">
      <div className="mx-auto max-w-3xl space-y-6">
        <div>
          <h1 className="font-[family-name:var(--font-biz-display)] text-2xl font-semibold text-[color:var(--biz-forest-900)]">
            業務證明
          </h1>
          <p className="mt-1 text-sm text-[color:var(--biz-muted)]">
            兩套業務證明；新成立公司可改交替代證明。
          </p>
        </div>

        <Field label="營業狀態">
          <Select
            value={app.tradingStatus ?? ""}
            onChange={(e) =>
              update((p) => ({
                ...p,
                tradingStatus: (e.target.value ||
                  null) as TradingStatus | null,
              }))
            }
          >
            <option value="">請選擇</option>
            <option value="operating">公司已開始營業</option>
            <option value="preparing">公司正準備開始營業</option>
            <option value="not_started">公司尚未開始營業</option>
          </Select>
        </Field>

        {operating && (
          <>
            {(["businessSet1", "businessSet2"] as const).map((key, i) => {
              const meta = app[key];
              const slot = getDocSlot(
                i === 0 ? "business_set_1" : "business_set_2",
              );
              return (
                <div key={key} className="space-y-4">
                  <h2 className="text-lg font-semibold">
                    業務證明第{i === 0 ? "一" : "二"}套
                  </h2>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Field label="文件類型">
                      <Input
                        value={meta.docType}
                        onChange={(e) =>
                          update((p) => ({
                            ...p,
                            [key]: { ...p[key], docType: e.target.value },
                          }))
                        }
                      />
                    </Field>
                    <Field label="交易對象名稱" required>
                      <Input
                        value={meta.counterparty}
                        onChange={(e) =>
                          update((p) => ({
                            ...p,
                            [key]: {
                              ...p[key],
                              counterparty: e.target.value,
                            },
                          }))
                        }
                      />
                    </Field>
                    <Field label="交易日期">
                      <Input
                        type="date"
                        value={meta.tradeDate}
                        onChange={(e) =>
                          update((p) => ({
                            ...p,
                            [key]: { ...p[key], tradeDate: e.target.value },
                          }))
                        }
                      />
                    </Field>
                    <Field label="交易金額">
                      <Input
                        value={meta.amount}
                        onChange={(e) =>
                          update((p) => ({
                            ...p,
                            [key]: { ...p[key], amount: e.target.value },
                          }))
                        }
                      />
                    </Field>
                    <Field label="交易貨幣">
                      <Input
                        value={meta.currency}
                        onChange={(e) =>
                          update((p) => ({
                            ...p,
                            [key]: { ...p[key], currency: e.target.value },
                          }))
                        }
                      />
                    </Field>
                    <div className="sm:col-span-2">
                      <Field label="交易內容簡述">
                        <Textarea
                          value={meta.description}
                          onChange={(e) =>
                            update((p) => ({
                              ...p,
                              [key]: {
                                ...p[key],
                                description: e.target.value,
                              },
                            }))
                          }
                        />
                      </Field>
                    </div>
                  </div>
                  <FileUploadCard
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
                  />
                </div>
              );
            })}
          </>
        )}

        {alt && (
          <FileUploadCard
            slot={getDocSlot("business_alt")}
            files={app.files.filter((f) => f.slotId === "business_alt")}
            onUpload={(file) => {
              const next = addMockUpload(app, "business_alt", {
                name: file.name,
                size: file.size,
                type: file.type,
              });
              update(() => next);
            }}
          />
        )}
      </div>
    </ApplyWizardShell>
  );
}
