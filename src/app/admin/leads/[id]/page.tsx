"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  Disclaimer,
  SectionHeader,
  StateBanner,
} from "@/components/ui/layout";
import { PolicyStatusBadge } from "@/components/ui/policy";
import { TrafficLight } from "@/components/ui/status";
import { getDemoPrescreen } from "@/lib/prescreen-mock";
import { formatHKD } from "@/lib/utils";

export default function AdminLeadPrescreenPage() {
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
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs text-text-muted">SLF-2026-00482</p>
          <h1 className="mt-1 text-2xl font-bold text-navy-900">
            Lead 轉介／預審條件
          </h1>
          <p className="mt-1 text-sm text-text-secondary">
            AI 財務助理 + 文件分析引擎 · 不直接決定批核
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {(
            [
              ["ok", "可轉介"],
              ["expired", "BR 過期"],
              ["missing", "文件缺失"],
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
      </div>

      <StateBanner
        tone="info"
        title="角色定位"
        description="AI 負責：資料收集 → 文件分析 → 資格預審條件核對。正式批核、利率及放款由顧問／合作機構決定。"
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          ["公司", "智創科技有限公司"],
          [
            "平均每月營業額",
            result.avgMonthlyTurnoverHkd != null
              ? formatHKD(Math.round(result.avgMonthlyTurnoverHkd))
              : "—",
          ],
          ["月結單月數", String(result.monthsCovered)],
          [
            "Lead 建議",
            result.readyForLeadReferral ? "可轉介顧問" : "暫緩轉介",
          ],
        ].map(([k, v]) => (
          <Card key={k} className="py-3">
            <p className="text-xs text-text-muted">{k}</p>
            <p className="mt-1 tabular text-sm font-semibold text-navy-900">{v}</p>
          </Card>
        ))}
      </div>

      <TrafficLight
        result={result.overall}
        label="預審整體狀態"
        detail={result.leadNote}
        suggestion="可接受 AI 預審結果、要求補件，或直接轉交 Senior Reviewer。"
      />

      <SectionHeader title="預審條件逐項" />
      <div className="space-y-3">
        {result.checks.map((c) => (
          <Card key={c.id}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-semibold text-navy-900">{c.name}</p>
                <p className="mt-1 text-xs text-text-muted">{c.requirement}</p>
              </div>
              <PolicyStatusBadge status={c.status} />
            </div>
            <p className="mt-2 text-sm">{c.detail}</p>
            <p className="mt-1 text-xs text-teal-600">{c.suggestion}</p>
            <p className="mt-2 text-[11px] text-text-muted">來源：{c.dataSource}</p>
          </Card>
        ))}
      </div>

      <Card>
        <SectionHeader title="顧問操作" />
        <div className="flex flex-wrap gap-2">
          <Button disabled={!result.readyForLeadReferral}>確認 Lead 轉介</Button>
          <Button variant="outline">要求補件</Button>
          <Button variant="secondary">轉交人工覆核</Button>
          <Link href="/admin/policy/SLF-2026-00482">
            <Button variant="ghost">打開十項政策核對</Button>
          </Link>
        </div>
      </Card>

      <Disclaimer>{result.disclaimer}</Disclaimer>
    </div>
  );
}
