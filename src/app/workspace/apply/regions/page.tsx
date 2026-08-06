"use client";

import { ApplyWizardShell } from "@/components/biz/apply-wizard-shell";
import { Field, Input, Select } from "@/components/ui/field";
import { useBizdoc } from "@/lib/bizdoc/client-store";

const COUNTRY_OPTIONS = [
  "香港",
  "中國內地",
  "澳門",
  "台灣",
  "新加坡",
  "美國",
  "英國",
  "加拿大",
  "日本",
  "韓國",
  "澳洲",
  "歐盟",
  "其他",
];

function MultiCountry({
  label,
  values,
  onChange,
}: {
  label: string;
  values: string[];
  onChange: (v: string[]) => void;
}) {
  return (
    <fieldset>
      <legend className="mb-2 text-sm font-medium">{label}</legend>
      <div className="flex flex-wrap gap-2">
        {COUNTRY_OPTIONS.map((c) => {
          const on = values.includes(c);
          return (
            <button
              key={c}
              type="button"
              onClick={() =>
                onChange(on ? values.filter((x) => x !== c) : [...values, c])
              }
              className={
                on
                  ? "rounded-lg bg-[color:var(--biz-forest-800)] px-3 py-1.5 text-xs text-white"
                  : "rounded-lg border border-[color:var(--biz-border)] bg-[color:var(--biz-surface)] px-3 py-1.5 text-xs text-[color:var(--biz-muted)]"
              }
            >
              {c}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

function BoolSelect({
  value,
  onChange,
}: {
  value: boolean | null;
  onChange: (v: boolean | null) => void;
}) {
  return (
    <Select
      value={value === null ? "" : value ? "yes" : "no"}
      onChange={(e) =>
        onChange(e.target.value === "" ? null : e.target.value === "yes")
      }
    >
      <option value="">請選擇</option>
      <option value="yes">是</option>
      <option value="no">否</option>
    </Select>
  );
}

export default function RegionsStepPage() {
  const { app, update, hydrated } = useBizdoc();
  if (!hydrated || !app.id) return null;
  const r = app.businessRegion;

  return (
    <ApplyWizardShell stepId="regions">
      <div className="mx-auto max-w-3xl space-y-8">
        <div>
          <h1 className="font-[family-name:var(--font-biz-display)] text-2xl font-semibold text-[color:var(--biz-forest-900)]">
            業務地區及交易資料
          </h1>
          <p className="mt-1 text-sm text-[color:var(--biz-muted)]">
            國家／地區支援多選；此為表格資料，非文件上載。
          </p>
        </div>

        <div className="space-y-6 rounded-2xl border border-[color:var(--biz-border)] bg-[color:var(--biz-surface)] p-5">
          <MultiCountry
            label="主要營運國家或地區"
            values={r.operatingCountries}
            onChange={(v) =>
              update((p) => ({
                ...p,
                businessRegion: { ...p.businessRegion, operatingCountries: v },
              }))
            }
          />
          <MultiCountry
            label="客戶主要所在地"
            values={r.customerCountries}
            onChange={(v) =>
              update((p) => ({
                ...p,
                businessRegion: { ...p.businessRegion, customerCountries: v },
              }))
            }
          />
          <MultiCountry
            label="供應商主要所在地"
            values={r.supplierCountries}
            onChange={(v) =>
              update((p) => ({
                ...p,
                businessRegion: { ...p.businessRegion, supplierCountries: v },
              }))
            }
          />
          <MultiCountry
            label="收款國家或地區"
            values={r.receiveCountries}
            onChange={(v) =>
              update((p) => ({
                ...p,
                businessRegion: { ...p.businessRegion, receiveCountries: v },
              }))
            }
          />
          <MultiCountry
            label="付款國家或地區"
            values={r.payCountries}
            onChange={(v) =>
              update((p) => ({
                ...p,
                businessRegion: { ...p.businessRegion, payCountries: v },
              }))
            }
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="是否涉及跨境交易">
            <BoolSelect
              value={r.crossBorder}
              onChange={(v) =>
                update((p) => ({
                  ...p,
                  businessRegion: { ...p.businessRegion, crossBorder: v },
                }))
              }
            />
          </Field>
          <Field label="主要交易貨幣（逗號分隔）">
            <Input
              value={r.mainCurrencies.join(", ")}
              onChange={(e) =>
                update((p) => ({
                  ...p,
                  businessRegion: {
                    ...p.businessRegion,
                    mainCurrencies: e.target.value
                      .split(",")
                      .map((x) => x.trim())
                      .filter(Boolean),
                  },
                }))
              }
            />
          </Field>
          <Field label="預計每月收款次數">
            <Input
              value={r.monthlyReceiveCount}
              onChange={(e) =>
                update((p) => ({
                  ...p,
                  businessRegion: {
                    ...p.businessRegion,
                    monthlyReceiveCount: e.target.value,
                  },
                }))
              }
            />
          </Field>
          <Field label="預計每月付款次數">
            <Input
              value={r.monthlyPayCount}
              onChange={(e) =>
                update((p) => ({
                  ...p,
                  businessRegion: {
                    ...p.businessRegion,
                    monthlyPayCount: e.target.value,
                  },
                }))
              }
            />
          </Field>
          <Field label="預計每月入帳金額" required>
            <Input
              value={r.monthlyReceiveAmount}
              onChange={(e) =>
                update((p) => ({
                  ...p,
                  businessRegion: {
                    ...p.businessRegion,
                    monthlyReceiveAmount: e.target.value,
                  },
                }))
              }
            />
          </Field>
          <Field label="預計每月付款金額">
            <Input
              value={r.monthlyPayAmount}
              onChange={(e) =>
                update((p) => ({
                  ...p,
                  businessRegion: {
                    ...p.businessRegion,
                    monthlyPayAmount: e.target.value,
                  },
                }))
              }
            />
          </Field>
          <Field label="單筆最高預計交易金額">
            <Input
              value={r.maxSingleAmount}
              onChange={(e) =>
                update((p) => ({
                  ...p,
                  businessRegion: {
                    ...p.businessRegion,
                    maxSingleAmount: e.target.value,
                  },
                }))
              }
            />
          </Field>
          <Field label="是否涉及現金交易">
            <BoolSelect
              value={r.cashTransactions}
              onChange={(v) =>
                update((p) => ({
                  ...p,
                  businessRegion: {
                    ...p.businessRegion,
                    cashTransactions: v,
                  },
                }))
              }
            />
          </Field>
          <Field label="是否涉及網上銷售">
            <BoolSelect
              value={r.onlineSales}
              onChange={(v) =>
                update((p) => ({
                  ...p,
                  businessRegion: { ...p.businessRegion, onlineSales: v },
                }))
              }
            />
          </Field>
          <Field label="是否涉及第三方支付平台">
            <BoolSelect
              value={r.thirdPartyPayment}
              onChange={(v) =>
                update((p) => ({
                  ...p,
                  businessRegion: {
                    ...p.businessRegion,
                    thirdPartyPayment: v,
                  },
                }))
              }
            />
          </Field>
        </div>
      </div>
    </ApplyWizardShell>
  );
}
