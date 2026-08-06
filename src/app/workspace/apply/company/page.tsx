"use client";

import { ApplyWizardShell } from "@/components/biz/apply-wizard-shell";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { useBizdoc } from "@/lib/bizdoc/client-store";

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
        onChange(
          e.target.value === ""
            ? null
            : e.target.value === "yes",
        )
      }
    >
      <option value="">請選擇</option>
      <option value="yes">是</option>
      <option value="no">否</option>
    </Select>
  );
}

export default function CompanyStepPage() {
  const { app, update, hydrated } = useBizdoc();
  if (!hydrated || !app.id) return null;
  const c = app.company;
  const n = app.accountNeeds;

  return (
    <ApplyWizardShell stepId="company">
      <div className="mx-auto max-w-3xl space-y-8">
        <div>
          <h1 className="font-[family-name:var(--font-biz-display)] text-2xl font-semibold text-[color:var(--biz-forest-900)]">
            公司資料
          </h1>
          <p className="mt-1 text-sm text-[color:var(--biz-muted)]">
            基本資料、業務性質與商業戶口需求。
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="公司中文名稱" required>
            <Input
              value={c.nameZh}
              onChange={(e) =>
                update((p) => ({
                  ...p,
                  company: { ...p.company, nameZh: e.target.value },
                }))
              }
            />
          </Field>
          <Field label="公司英文名稱" required>
            <Input
              value={c.nameEn}
              onChange={(e) =>
                update((p) => ({
                  ...p,
                  company: { ...p.company, nameEn: e.target.value },
                }))
              }
            />
          </Field>
          <Field label="公司註冊編號" required>
            <Input
              value={c.crNumber}
              onChange={(e) =>
                update((p) => ({
                  ...p,
                  company: { ...p.company, crNumber: e.target.value },
                }))
              }
            />
          </Field>
          <Field label="商業登記號碼" required>
            <Input
              value={c.brNumber}
              onChange={(e) =>
                update((p) => ({
                  ...p,
                  company: { ...p.company, brNumber: e.target.value },
                }))
              }
            />
          </Field>
          <Field label="公司成立日期">
            <Input
              type="date"
              value={c.foundedAt}
              onChange={(e) =>
                update((p) => ({
                  ...p,
                  company: { ...p.company, foundedAt: e.target.value },
                }))
              }
            />
          </Field>
          <Field label="公司類型">
            <Input
              value={c.companyType}
              onChange={(e) =>
                update((p) => ({
                  ...p,
                  company: { ...p.company, companyType: e.target.value },
                }))
              }
            />
          </Field>
          <Field label="公司註冊地址" required>
            <Textarea
              value={c.registeredAddress}
              onChange={(e) =>
                update((p) => ({
                  ...p,
                  company: { ...p.company, registeredAddress: e.target.value },
                }))
              }
            />
          </Field>
          <Field label="實際營業地址">
            <Textarea
              value={c.businessAddress}
              onChange={(e) =>
                update((p) => ({
                  ...p,
                  company: { ...p.company, businessAddress: e.target.value },
                }))
              }
            />
          </Field>
          <Field label="公司電話">
            <Input
              value={c.phone}
              onChange={(e) =>
                update((p) => ({
                  ...p,
                  company: { ...p.company, phone: e.target.value },
                }))
              }
            />
          </Field>
          <Field label="公司電郵">
            <Input
              type="email"
              value={c.email}
              onChange={(e) =>
                update((p) => ({
                  ...p,
                  company: { ...p.company, email: e.target.value },
                }))
              }
            />
          </Field>
          <Field label="公司網站">
            <Input
              value={c.website}
              onChange={(e) =>
                update((p) => ({
                  ...p,
                  company: { ...p.company, website: e.target.value },
                }))
              }
            />
          </Field>
          <Field label="業務性質" required>
            <Input
              value={c.nature}
              onChange={(e) =>
                update((p) => ({
                  ...p,
                  company: { ...p.company, nature: e.target.value },
                }))
              }
            />
          </Field>
          <div className="sm:col-span-2">
            <Field label="主要產品或服務">
              <Textarea
                value={c.products}
                onChange={(e) =>
                  update((p) => ({
                    ...p,
                    company: { ...p.company, products: e.target.value },
                  }))
                }
              />
            </Field>
          </div>
          <Field label="主要收入來源">
            <Input
              value={c.incomeSource}
              onChange={(e) =>
                update((p) => ({
                  ...p,
                  company: { ...p.company, incomeSource: e.target.value },
                }))
              }
            />
          </Field>
          <Field label="員工人數">
            <Input
              value={c.employees}
              onChange={(e) =>
                update((p) => ({
                  ...p,
                  company: { ...p.company, employees: e.target.value },
                }))
              }
            />
          </Field>
          <Field label="預計每月營業額（HKD）">
            <Input
              value={c.monthlyTurnover}
              onChange={(e) =>
                update((p) => ({
                  ...p,
                  company: { ...p.company, monthlyTurnover: e.target.value },
                }))
              }
            />
          </Field>
          <Field label="預計每年營業額（HKD）">
            <Input
              value={c.yearlyTurnover}
              onChange={(e) =>
                update((p) => ({
                  ...p,
                  company: { ...p.company, yearlyTurnover: e.target.value },
                }))
              }
            />
          </Field>
          <Field label="是否已有其他商業銀行戶口">
            <BoolSelect
              value={c.hasOtherBankAccount}
              onChange={(v) =>
                update((p) => ({
                  ...p,
                  company: { ...p.company, hasOtherBankAccount: v },
                }))
              }
            />
          </Field>
          <Field label="是否曾申請商業戶口">
            <BoolSelect
              value={c.appliedBefore}
              onChange={(v) =>
                update((p) => ({
                  ...p,
                  company: { ...p.company, appliedBefore: v },
                }))
              }
            />
          </Field>
          <Field label="是否曾被拒絕開戶">
            <BoolSelect
              value={c.rejectedBefore}
              onChange={(v) =>
                update((p) => ({
                  ...p,
                  company: { ...p.company, rejectedBefore: v },
                }))
              }
            />
          </Field>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-[color:var(--biz-ink)]">
            商業戶口需求
          </h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {(
              [
                ["hkd", "港幣戶口"],
                ["cny", "人民幣戶口"],
                ["usd", "美元戶口"],
                ["otherFx", "其他外幣戶口"],
                ["internetBanking", "網上銀行"],
                ["debitCard", "公司提款卡"],
                ["remittance", "國際匯款"],
              ] as const
            ).map(([key, label]) => (
              <label
                key={key}
                className="flex items-center gap-2 rounded-xl border border-[color:var(--biz-border)] px-3 py-2.5 text-sm"
              >
                <input
                  type="checkbox"
                  checked={n[key]}
                  onChange={(e) =>
                    update((p) => ({
                      ...p,
                      accountNeeds: {
                        ...p.accountNeeds,
                        [key]: e.target.checked,
                      },
                    }))
                  }
                />
                {label}
              </label>
            ))}
          </div>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Field label="預計首筆存款">
              <Input
                value={n.firstDeposit}
                onChange={(e) =>
                  update((p) => ({
                    ...p,
                    accountNeeds: {
                      ...p.accountNeeds,
                      firstDeposit: e.target.value,
                    },
                  }))
                }
              />
            </Field>
            <Field label="預計每月交易量">
              <Input
                value={n.monthlyVolume}
                onChange={(e) =>
                  update((p) => ({
                    ...p,
                    accountNeeds: {
                      ...p.accountNeeds,
                      monthlyVolume: e.target.value,
                    },
                  }))
                }
              />
            </Field>
            <Field label="指定銀行（如有）">
              <Input
                value={n.preferredBank}
                onChange={(e) =>
                  update((p) => ({
                    ...p,
                    accountNeeds: {
                      ...p.accountNeeds,
                      preferredBank: e.target.value,
                    },
                  }))
                }
              />
            </Field>
            <Field label="期望完成日期">
              <Input
                type="date"
                value={n.expectedDate}
                onChange={(e) =>
                  update((p) => ({
                    ...p,
                    accountNeeds: {
                      ...p.accountNeeds,
                      expectedDate: e.target.value,
                    },
                  }))
                }
              />
            </Field>
            <div className="sm:col-span-2">
              <Field label="主要開戶用途">
                <Textarea
                  value={n.purpose}
                  onChange={(e) =>
                    update((p) => ({
                      ...p,
                      accountNeeds: {
                        ...p.accountNeeds,
                        purpose: e.target.value,
                      },
                    }))
                  }
                />
              </Field>
            </div>
          </div>
        </div>
      </div>
    </ApplyWizardShell>
  );
}
