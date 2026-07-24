"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { MobileShell } from "@/components/app/mobile-shell";
import { Button } from "@/components/ui/button";
import {
  Card,
  Disclaimer,
  PageHeader,
  SectionHeader,
  StateBanner,
} from "@/components/ui/layout";
import { getDemoCrossCheck } from "@/lib/bank-cashflow-mock";

const CELL_LABEL = {
  match: "核對",
  mismatch: "差異",
  missing: "缺",
  na: "—",
} as const;

function cellClass(v: keyof typeof CELL_LABEL) {
  if (v === "match") return "text-teal-700";
  if (v === "mismatch") return "text-danger-600 font-semibold";
  if (v === "missing") return "text-warning-600";
  return "text-text-muted";
}

export default function CrossCheckPage() {
  const [conflict, setConflict] = useState(false);
  const result = useMemo(() => getDemoCrossCheck(conflict), [conflict]);

  return (
    <MobileShell>
      <PageHeader
        title="公司資料交叉核對"
        subtitle="BR · NAR1 · 銀行結單 · 身份文件"
        backHref="/apply/documents"
      />
      <main className="space-y-4 px-4 py-5 pb-28">
        <div className="flex gap-2">
          <button
            onClick={() => setConflict(false)}
            className={`rounded-full px-3 py-1.5 text-xs ${!conflict ? "bg-navy-900 text-white" : "bg-surface-2"}`}
          >
            一致
          </button>
          <button
            onClick={() => setConflict(true)}
            className={`rounded-full px-3 py-1.5 text-xs ${conflict ? "bg-navy-900 text-white" : "bg-surface-2"}`}
          >
            有差異
          </button>
        </div>

        <StateBanner
          tone={
            result.hasConflict
              ? "error"
              : result.overall === "amber"
                ? "warning"
                : "success"
          }
          title={result.hasConflict ? "資料存在差異" : "核對結果"}
          description={result.clientMessage}
        />

        <SectionHeader title="資料核對表" />
        <Card className="overflow-x-auto p-2">
          <table className="w-full min-w-[320px] text-left text-xs">
            <thead>
              <tr className="text-text-muted">
                <th className="p-2 font-medium">資料</th>
                <th className="p-2 font-medium">BR</th>
                <th className="p-2 font-medium">NAR1</th>
                <th className="p-2 font-medium">銀行</th>
                <th className="p-2 font-medium">身份</th>
              </tr>
            </thead>
            <tbody>
              {result.cells.map((c) => (
                <tr key={c.field} className="border-t border-border/60">
                  <td className="p-2 text-navy-900">{c.label}</td>
                  <td className={`p-2 ${cellClass(c.br)}`}>
                    {CELL_LABEL[c.br]}
                  </td>
                  <td className={`p-2 ${cellClass(c.nar1)}`}>
                    {CELL_LABEL[c.nar1]}
                  </td>
                  <td className={`p-2 ${cellClass(c.bank)}`}>
                    {CELL_LABEL[c.bank]}
                  </td>
                  <td className={`p-2 ${cellClass(c.id)}`}>
                    {CELL_LABEL[c.id]}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>

        <p className="text-xs text-text-secondary">
          如資料不同，不能由 AI 自行選擇哪一份為正確，必須由客戶確認或貸款顧問覆核。
        </p>

        <div className="flex flex-col gap-2">
          <Link href="/apply/cashflow">
            <Button fullWidth disabled={result.hasConflict}>
              確認資料並分析銀行現金流
            </Button>
          </Link>
          <Link href="/app/account">
            <Button fullWidth variant="outline">
              聯絡貸款顧問覆核
            </Button>
          </Link>
        </div>
        <Disclaimer>
          交叉核對屬第一階段初步資格評估，非正式批核。
        </Disclaimer>
      </main>
    </MobileShell>
  );
}
