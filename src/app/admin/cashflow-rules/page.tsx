"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import {
  Card,
  Disclaimer,
  SectionHeader,
  StateBanner,
} from "@/components/ui/layout";
import {
  DEFAULT_CASHFLOW_RULES,
  type CashflowRuleSet,
} from "@/lib/cashflow-rules";

export default function CashflowRulesAdminPage() {
  const [rules, setRules] = useState<CashflowRuleSet>(DEFAULT_CASHFLOW_RULES);
  const [saved, setSaved] = useState(false);

  async function save() {
    await fetch("/api/cashflow/rules", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        rules: {
          ...rules,
          updatedBy: "李美欣",
          updateReason: rules.updateReason || "政策調整",
        },
      }),
    });
    setSaved(true);
  }

  return (
    <main className="space-y-6 px-4 py-6 lg:px-8">
      <div>
        <h1 className="text-2xl font-semibold text-navy-900">
          銀行現金流審批規則
        </h1>
        <p className="mt-1 text-sm text-text-secondary">
          綠／黃／紅門檻由後台配置，不可寫死於客戶端 UI。適用第一階段初步資格評估。
        </p>
      </div>

      {saved && (
        <StateBanner
          tone="success"
          title="已儲存（stub）"
          description="正式環境應寫入規則庫並留下修改人／生效日期／原因。"
        />
      )}

      <Card className="space-y-4">
        <SectionHeader title="規則元資料" />
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="規則名稱">
            <Input
              value={rules.name}
              onChange={(e) => setRules({ ...rules, name: e.target.value })}
            />
          </Field>
          <Field label="適用產品">
            <Input
              value={rules.product}
              onChange={(e) => setRules({ ...rules, product: e.target.value })}
            />
          </Field>
          <Field label="生效日期">
            <Input
              type="date"
              value={rules.effectiveFrom}
              onChange={(e) =>
                setRules({ ...rules, effectiveFrom: e.target.value })
              }
            />
          </Field>
          <Field label="修改原因">
            <Input
              value={rules.updateReason}
              onChange={(e) =>
                setRules({ ...rules, updateReason: e.target.value })
              }
            />
          </Field>
        </div>
      </Card>

      <Card className="space-y-4">
        <SectionHeader
          title="金額／次數門檻"
          subtitle="綠＝達標；黃＝介乎；紅＝低於黃或超出容許次數"
        />
        {(
          [
            [
              "最低每日平均餘額（綠／黃）",
              "minAverageDailyBalanceHkd",
            ],
            ["最低每月進帳（綠／黃）", "minMonthlyCreditsHkd"],
            ["最低每月進帳次數（綠／黃）", "minMonthlyCreditCount"],
            [
              "最大單一來源集中度 %（綠＝可接受上限概念：低於綠為佳）",
              "maxSingleSourceConcentrationPct",
            ],
          ] as const
        ).map(([label, key]) => (
          <div key={key} className="grid grid-cols-2 gap-3">
            <Field label={`${label} · 綠`}>
              <Input
                type="number"
                className="tabular"
                value={rules[key].green}
                onChange={(e) =>
                  setRules({
                    ...rules,
                    [key]: { ...rules[key], green: Number(e.target.value) },
                  })
                }
              />
            </Field>
            <Field label="黃">
              <Input
                type="number"
                className="tabular"
                value={rules[key].amber}
                onChange={(e) =>
                  setRules({
                    ...rules,
                    [key]: { ...rules[key], amber: Number(e.target.value) },
                  })
                }
              />
            </Field>
          </div>
        ))}

        {(
          [
            ["退票容許（綠／紅上限）", "maxBouncedCheques"],
            ["Autopay 失敗容許", "maxAutopayFailures"],
            ["超額透支事件容許", "maxExcessOverdraftEvents"],
          ] as const
        ).map(([label, key]) => (
          <div key={key} className="grid grid-cols-2 gap-3">
            <Field label={`${label} · 綠≤`}>
              <Input
                type="number"
                className="tabular"
                value={rules[key].green}
                onChange={(e) =>
                  setRules({
                    ...rules,
                    [key]: { ...rules[key], green: Number(e.target.value) },
                  })
                }
              />
            </Field>
            <Field label="紅>">
              <Input
                type="number"
                className="tabular"
                value={rules[key].red}
                onChange={(e) =>
                  setRules({
                    ...rules,
                    [key]: { ...rules[key], red: Number(e.target.value) },
                  })
                }
              />
            </Field>
          </div>
        ))}
      </Card>

      <Button onClick={() => void save()}>儲存規則</Button>
      <Disclaimer>
        第一階段輸出初步綠／黃／紅燈；EBITDA、Gearing、DSCR
        等屬第二階段正式信貸審批，需 Audited Report 等補件。
      </Disclaimer>
    </main>
  );
}
