"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { MobileShell } from "@/components/app/mobile-shell";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/field";
import {
  Card,
  Disclaimer,
  PageHeader,
  SectionHeader,
  StateBanner,
} from "@/components/ui/layout";
import type { DeclaredDebt, DebtFacilityType } from "@/lib/policy";
import { formatHKD } from "@/lib/utils";

const TYPES: DebtFacilityType[] = [
  "項目貸款",
  "定期貸款",
  "循環融資",
  "透支",
  "按揭貸款",
  "貿易融資",
  "信用卡／商業卡",
  "其他",
];

function emptyDebt(): DeclaredDebt {
  return {
    id: crypto.randomUUID(),
    lender: "",
    type: "定期貸款",
    facilityHkd: undefined,
    outstandingHkd: 0,
    monthlyPaymentHkd: 0,
  };
}

export default function DebtsPage() {
  const [debts, setDebts] = useState<DeclaredDebt[]>([emptyDebt()]);
  const [noDebt, setNoDebt] = useState(false);
  const [unknown, setUnknown] = useState(false);

  const totals = useMemo(() => {
    if (noDebt) return { monthly: 0, annual: 0 };
    if (unknown || debts.some((d) => d.monthlyPaymentHkd == null)) {
      return { monthly: null as number | null, annual: null as number | null };
    }
    const monthly = debts.reduce((s, d) => s + (d.monthlyPaymentHkd ?? 0), 0);
    return { monthly, annual: monthly * 12 };
  }, [debts, noDebt, unknown]);

  return (
    <MobileShell>
      <PageHeader
        title="現有銀行借貸及每月供款"
        subtitle="N01｜DSCR 債務申報"
        backHref="/apply"
      />
      <main className="space-y-4 px-4 py-5 pb-28">
        <StateBanner
          tone="info"
          title="請填寫公司目前所有銀行或金融機構貸款"
          description="系統會根據每月供款，自動計算未來十二個月的債務支出。本階段 DSCR 以已申報現有債務供款計算。"
        />

        <label className="flex items-center gap-2 rounded-2xl border border-border bg-surface-1 p-3 text-sm">
          <input
            type="checkbox"
            checked={noDebt}
            onChange={(e) => {
              setNoDebt(e.target.checked);
              if (e.target.checked) setUnknown(false);
            }}
          />
          我沒有現有銀行貸款
        </label>

        <label className="flex items-center gap-2 rounded-2xl border border-border bg-surface-1 p-3 text-sm">
          <input
            type="checkbox"
            checked={unknown}
            disabled={noDebt}
            onChange={(e) => setUnknown(e.target.checked)}
          />
          我不清楚每月供款金額
        </label>

        {unknown && (
          <Card className="bg-warning-100/50">
            <p className="text-sm font-semibold text-warning-600">N03｜不清楚供款</p>
            <p className="mt-2 text-sm text-text-secondary">
              仍可提交申請。系統會抽取 EBITDA；若 EBITDA
              為正數將顯示黃燈，並建立顧問跟進任務。不可在債務資料不完整時顯示綠燈。
            </p>
          </Card>
        )}

        {!noDebt &&
          debts.map((debt, idx) => (
            <Card key={debt.id} className="space-y-3">
              <SectionHeader
                title={`貸款 #${idx + 1}`}
                action={
                  debts.length > 1 ? (
                    <button
                      className="text-xs text-danger-600"
                      onClick={() =>
                        setDebts((list) => list.filter((d) => d.id !== debt.id))
                      }
                    >
                      刪除此項
                    </button>
                  ) : null
                }
              />
              <Field label="貸款銀行／金融機構名稱" required>
                <Input
                  value={debt.lender}
                  onChange={(e) =>
                    setDebts((list) =>
                      list.map((d) =>
                        d.id === debt.id ? { ...d, lender: e.target.value } : d,
                      ),
                    )
                  }
                  placeholder="例如：香港某銀行"
                />
              </Field>
              <Field label="貸款類型" required>
                <Select
                  value={debt.type}
                  onChange={(e) =>
                    setDebts((list) =>
                      list.map((d) =>
                        d.id === debt.id
                          ? { ...d, type: e.target.value as DebtFacilityType }
                          : d,
                      ),
                    )
                  }
                >
                  {TYPES.map((t) => (
                    <option key={t}>{t}</option>
                  ))}
                </Select>
              </Field>
              <Field label="核批總貸款額" hint="建議必填">
                <Input
                  type="number"
                  className="tabular"
                  value={debt.facilityHkd ?? ""}
                  onChange={(e) =>
                    setDebts((list) =>
                      list.map((d) =>
                        d.id === debt.id
                          ? {
                              ...d,
                              facilityHkd: e.target.value
                                ? Number(e.target.value)
                                : undefined,
                            }
                          : d,
                      ),
                    )
                  }
                />
              </Field>
              <Field label="目前未償還貸款餘額" required>
                <Input
                  type="number"
                  className="tabular"
                  value={debt.outstandingHkd}
                  onChange={(e) =>
                    setDebts((list) =>
                      list.map((d) =>
                        d.id === debt.id
                          ? { ...d, outstandingHkd: Number(e.target.value) }
                          : d,
                      ),
                    )
                  }
                />
              </Field>
              <Field label="每月供款額" required={!unknown}>
                <Input
                  type="number"
                  className="tabular"
                  disabled={unknown}
                  value={unknown ? "" : (debt.monthlyPaymentHkd ?? "")}
                  onChange={(e) =>
                    setDebts((list) =>
                      list.map((d) =>
                        d.id === debt.id
                          ? {
                              ...d,
                              monthlyPaymentHkd: e.target.value
                                ? Number(e.target.value)
                                : null,
                            }
                          : d,
                      ),
                    )
                  }
                />
              </Field>
              <p className="text-xs text-text-muted">
                年度總供款額（系統計算）：{" "}
                {unknown || debt.monthlyPaymentHkd == null
                  ? "—"
                  : formatHKD(debt.monthlyPaymentHkd * 12)}
              </p>
            </Card>
          ))}

        {!noDebt && (
          <Button
            variant="outline"
            fullWidth
            onClick={() => setDebts((list) => [...list, emptyDebt()])}
          >
            ＋ 新增另一項貸款
          </Button>
        )}

        <Card className="bg-surface-2">
          <p className="text-xs text-text-muted">合計（系統計算）</p>
          <p className="mt-1 tabular text-sm">
            每月總供款：
            {totals.monthly == null ? "待補齊" : formatHKD(totals.monthly)}
          </p>
          <p className="tabular text-sm font-semibold text-navy-900">
            一年總債務支出：
            {totals.annual == null ? "待補齊" : formatHKD(totals.annual)}
          </p>
        </Card>

        <Disclaimer>
          標籤：客戶聲明（債務明細）＋ 系統計算（年度供款）。提交後會與 AI
          提取之 EBITDA 合併計算 DSCR。
        </Disclaimer>
      </main>

      <div className="fixed inset-x-0 bottom-0 mx-auto max-w-[430px] border-t border-border bg-surface-1 p-4">
        <Link href="/apply/declarations">
          <Button fullWidth size="lg">
            儲存並繼續
          </Button>
        </Link>
      </div>
    </MobileShell>
  );
}
