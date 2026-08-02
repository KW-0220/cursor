"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { MobileShell } from "@/components/app/mobile-shell";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import {
  Card,
  Disclaimer,
  PageHeader,
  SectionHeader,
  StateBanner,
} from "@/components/ui/layout";
import { computeAvgMonthlyTurnover, type BankStatementMonth } from "@/lib/prescreen";
import { formatHKD } from "@/lib/utils";

export default function StatementsPage() {
  const [months, setMonths] = useState<BankStatementMonth[]>([
    { month: "2026-01", totalCreditsHkd: 1390000 },
    { month: "2026-02", totalCreditsHkd: 1460000 },
    { month: "2026-03", totalCreditsHkd: 1500000 },
  ]);

  const calc = useMemo(() => computeAvgMonthlyTurnover(months), [months]);

  return (
    <MobileShell>
      <PageHeader
        title="銀行月結單 · 平均營業額"
        subtitle="加總所有入賬 ÷ 月數"
        backHref="/apply/company-docs"
      />
      <main className="space-y-4 px-4 py-5 pb-28">
        <StateBanner
          tone="info"
          title="AI 文件分析引擎"
          description="上載月結單後，系統會加總該月所有入賬金額，再計算公司平均每月營業額，供預審及 Lead 轉介參考——不作最終批核。"
        />

        <SectionHeader
          title="每月入賬（可來自 AI 提取後確認）"
          action={
            <Button
              size="sm"
              variant="outline"
              onClick={() =>
                setMonths((list) => [
                  ...list,
                  {
                    month: `2026-0${Math.min(9, list.length + 1)}`,
                    totalCreditsHkd: 0,
                  },
                ])
              }
            >
              ＋ 月份
            </Button>
          }
        />

        {months.map((m, i) => (
          <Card key={m.month + i} className="space-y-3">
            <Field label="結單月份">
              <Input
                value={m.month}
                onChange={(e) =>
                  setMonths((list) =>
                    list.map((row, idx) =>
                      idx === i ? { ...row, month: e.target.value } : row,
                    ),
                  )
                }
              />
            </Field>
            <Field label="該月所有入賬加總（HKD）" required>
              <Input
                type="number"
                className="tabular"
                value={m.totalCreditsHkd}
                onChange={(e) =>
                  setMonths((list) =>
                    list.map((row, idx) =>
                      idx === i
                        ? { ...row, totalCreditsHkd: Number(e.target.value) }
                        : row,
                    ),
                  )
                }
              />
            </Field>
            <Button size="sm" variant="ghost">
              由 AI 從月結單重新提取
            </Button>
          </Card>
        ))}

        <Card className="bg-surface-2">
          <p className="text-xs text-text-muted">系統計算</p>
          <p className="mt-1 text-sm">
            月份數：{calc.monthsCovered}
          </p>
          <p className="text-sm">
            入賬合計：
            {calc.totalCreditsHkd != null
              ? formatHKD(calc.totalCreditsHkd)
              : "—"}
          </p>
          <p className="mt-1 text-lg font-semibold tabular text-navy-900">
            平均每月營業額：
            {calc.avgMonthlyTurnoverHkd != null
              ? formatHKD(Math.round(calc.avgMonthlyTurnoverHkd))
              : "—"}
          </p>
        </Card>

        <Disclaimer>
          平均每月營業額＝各月結單入賬加總 ÷ 月數。結果標籤為「系統計算」，供顧問預審，非正式批核。
        </Disclaimer>
      </main>
      <div className="client-sticky-bar">
        <Link href="/apply/prescreen">
          <Button fullWidth size="lg">
            查看預審條件／Lead 轉介準備
          </Button>
        </Link>
      </div>
    </MobileShell>
  );
}
