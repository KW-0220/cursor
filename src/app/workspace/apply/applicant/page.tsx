"use client";

import { ApplyWizardShell } from "@/components/biz/apply-wizard-shell";
import { Field, Input, Select } from "@/components/ui/field";
import { useBizdoc } from "@/lib/bizdoc/client-store";

export default function ApplicantStepPage() {
  const { app, update, hydrated } = useBizdoc();
  if (!hydrated || !app.id) return null;
  const a = app.applicant;

  return (
    <ApplyWizardShell stepId="applicant">
      <div className="mx-auto max-w-3xl space-y-6">
        <div>
          <h1 className="font-[family-name:var(--font-biz-display)] text-2xl font-semibold text-[color:var(--biz-forest-900)]">
            申請人資料
          </h1>
          <p className="mt-1 text-sm text-[color:var(--biz-muted)]">
            主要聯絡人資料；WhatsApp 號碼用於申請進度通知。
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="申請人姓名" required>
            <Input
              value={a.name}
              onChange={(e) =>
                update((p) => ({
                  ...p,
                  applicant: { ...p.applicant, name: e.target.value },
                }))
              }
            />
          </Field>
          <Field label="與公司的關係" required>
            <Select
              value={a.relation}
              onChange={(e) =>
                update((p) => ({
                  ...p,
                  applicant: { ...p.applicant, relation: e.target.value },
                }))
              }
            >
              <option value="">請選擇</option>
              <option value="董事">董事</option>
              <option value="股東">股東</option>
              <option value="獲授權代表">獲授權代表</option>
              <option value="行政人員">行政人員</option>
              <option value="其他">其他</option>
            </Select>
          </Field>
          <Field label="電郵" required>
            <Input
              type="email"
              value={a.email}
              onChange={(e) =>
                update((p) => ({
                  ...p,
                  applicant: { ...p.applicant, email: e.target.value },
                }))
              }
            />
          </Field>
          <Field label="電話" required>
            <Input
              value={a.phone}
              onChange={(e) =>
                update((p) => ({
                  ...p,
                  applicant: { ...p.applicant, phone: e.target.value },
                }))
              }
            />
          </Field>
          <Field
            label="WhatsApp 電話號碼"
            required
            hint="請含國碼，例如 +85291234567"
          >
            <Input
              value={a.whatsapp}
              onChange={(e) =>
                update((p) => ({
                  ...p,
                  applicant: { ...p.applicant, whatsapp: e.target.value },
                }))
              }
            />
          </Field>
          <Field label="最佳聯絡時間">
            <Input
              value={a.bestContactTime}
              onChange={(e) =>
                update((p) => ({
                  ...p,
                  applicant: {
                    ...p.applicant,
                    bestContactTime: e.target.value,
                  },
                }))
              }
            />
          </Field>
          <Field label="首選語言">
            <Select
              value={a.preferredLanguage}
              onChange={(e) =>
                update((p) => ({
                  ...p,
                  applicant: {
                    ...p.applicant,
                    preferredLanguage: e.target.value as "zh-Hant" | "en",
                  },
                }))
              }
            >
              <option value="zh-Hant">繁體中文</option>
              <option value="en">English</option>
            </Select>
          </Field>
        </div>

        <label className="flex items-start gap-3 rounded-xl border border-[color:var(--biz-border)] bg-[color:var(--biz-surface)] p-4 text-sm">
          <input
            type="checkbox"
            className="mt-1"
            checked={a.authorized}
            onChange={(e) =>
              update((p) => ({
                ...p,
                applicant: { ...p.applicant, authorized: e.target.checked },
              }))
            }
          />
          <span>本人獲公司授權提交本申請所需資料及文件。</span>
        </label>
      </div>
    </ApplyWizardShell>
  );
}
