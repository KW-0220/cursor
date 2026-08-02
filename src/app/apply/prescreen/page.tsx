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
import { PolicyStatusBadge } from "@/components/ui/policy";
import { TrafficLight } from "@/components/ui/status";
import { getDemoPrescreen } from "@/lib/prescreen-mock";
import { formatHKD } from "@/lib/utils";

export default function PrescreenPage() {
  const [scenario, setScenario] = useState<"ok" | "expired" | "missing">("ok");
  const result = useMemo(
    () =>
      getDemoPrescreen(
        scenario === "expired"
          ? { expiredBr: true }
          : scenario === "missing"
            ? { missingId: true, thinStatements: true }
            : undefined,
      ),
    [scenario],
  );

  return (
    <MobileShell>
      <PageHeader
        title="預審條件／Lead 轉介"
        subtitle="AI 資料收集 → 資格評估（非批核）"
        backHref="/apply/statements"
      />
      <main className="space-y-4 px-4 py-5 pb-28">
        <div className="flex flex-wrap gap-2">
          {(
            [
              ["ok", "齊備"],
              ["expired", "BR 過期"],
              ["missing", "缺證"],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setScenario(key)}
              className={`rounded-full px-3 py-1.5 text-xs font-medium ${
                scenario === key
                  ? "bg-navy-900 text-white"
                  : "bg-surface-2 text-text-secondary"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <TrafficLight
          result={result.overall}
          label={result.readyForLeadReferral ? "可準備 Lead 轉介" : "暫未達預審條件"}
          detail={result.leadNote}
          suggestion="最終批核由貸款顧問及合作機構決定。"
        />

        <Card className="bg-surface-2">
          <p className="text-xs text-text-muted">系統計算｜平均每月營業額</p>
          <p className="mt-1 text-xl font-semibold tabular text-navy-900">
            {result.avgMonthlyTurnoverHkd != null
              ? formatHKD(Math.round(result.avgMonthlyTurnoverHkd))
              : "—"}
          </p>
          <p className="mt-1 text-xs text-text-secondary">
            根據 {result.monthsCovered} 個月結單入賬加總
            {result.totalCreditsHkd != null
              ? `（合計 ${formatHKD(Math.round(result.totalCreditsHkd))}）`
              : ""}
          </p>
        </Card>

        <SectionHeader title="預審檢查清單" />
        {result.checks.map((c) => (
          <Card key={c.id}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-medium text-navy-900">{c.name}</p>
                <p className="mt-1 text-xs text-text-muted">{c.requirement}</p>
              </div>
              <PolicyStatusBadge status={c.status} />
            </div>
            <p className="mt-2 text-sm text-text-secondary">{c.detail}</p>
            <p className="mt-1 text-xs text-teal-600">{c.suggestion}</p>
            <p className="mt-2 text-[11px] text-text-muted">來源：{c.dataSource}</p>
          </Card>
        ))}

        {result.readyForLeadReferral ? (
          <StateBanner
            tone="success"
            title="可交顧問作 Lead 轉介"
            description="文件及預審條件大致齊備。AI 不會直接批貸款。"
          />
        ) : (
          <StateBanner
            tone="warning"
            title="尚有條件未滿足"
            description="請先補齊紅色項目，再交顧問跟進。"
          />
        )}

        <Disclaimer>{result.disclaimer}</Disclaimer>
      </main>
      <div className="client-sticky-bar">
        <Link href="/apply/debts">
          <Button fullWidth size="lg">
            繼續：債務申報及政策聲明
          </Button>
        </Link>
      </div>
    </MobileShell>
  );
}
