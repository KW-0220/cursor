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
import { DataSourceTag, PolicyStatusBadge } from "@/components/ui/policy";
import { TrafficLight } from "@/components/ui/status";
import { getDemoPolicyEvaluation } from "@/lib/policy-mock";
import { formatHKD } from "@/lib/utils";
import type { PolicyItemResult } from "@/lib/policy";

export default function AdminPolicyPage() {
  const [scenario, setScenario] = useState<"ok" | "unknown" | "red">("ok");
  const evaluation = useMemo(
    () =>
      getDemoPolicyEvaluation(
        scenario === "unknown"
          ? { unknownDebtPayments: true }
          : scenario === "red"
            ? { redDscr: true }
            : undefined,
      ),
    [scenario],
  );
  const [expanded, setExpanded] = useState<number | null>(2);

  const overallCopy =
    evaluation.overall === "green"
      ? "初步符合貸款政策要求，可進入下一階段審批。"
      : evaluation.overall === "amber"
        ? "部分條件尚待確認，需要補充資料或人工覆核。"
        : "已觸發一項或以上政策限制，需要由授權審批人員決定下一步。";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs text-text-muted">SLF-2026-00482</p>
          <h1 className="mt-1 text-2xl font-bold text-navy-900">
            AI 貸款政策核對結果
          </h1>
          <p className="mt-1 text-sm text-text-secondary">
            N09｜十項標準 · 資料來源可追溯 · 可人工改判
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {(
            [
              ["ok", "流程一：綠燈"],
              ["unknown", "流程二：不清楚供款"],
              ["red", "流程三：指標不符"],
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

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          ["公司", "智創科技有限公司"],
          ["貸款類型", "無抵押"],
          ["申請金額", formatHKD(1500000)],
          ["最新年度營收", formatHKD(16200000)],
          [
            "EBITDA",
            evaluation.ebitda.ebitdaHkd != null
              ? formatHKD(evaluation.ebitda.ebitdaHkd)
              : "—",
          ],
          [
            "一年總債務支出",
            evaluation.annualDebtServiceHkd != null
              ? formatHKD(evaluation.annualDebtServiceHkd)
              : "未完整",
          ],
          [
            "DSCR",
            evaluation.dscr != null ? `${evaluation.dscr.toFixed(2)}x` : "—",
          ],
          ["分析時間", "2026-07-19 15:10"],
        ].map(([k, v]) => (
          <Card key={k} className="py-3">
            <p className="text-xs text-text-muted">{k}</p>
            <p className="mt-1 tabular text-sm font-semibold text-navy-900">{v}</p>
          </Card>
        ))}
      </div>

      <TrafficLight
        result={evaluation.overall}
        label="整體初批狀態"
        detail={overallCopy}
        suggestion="AI 結果不可直接取代授權審批人員決定；可接受／修改／補件。"
      />

      {evaluation.followUpTasks.length > 0 && (
        <StateBanner
          tone="warning"
          title="自動建立跟進任務"
          description={evaluation.followUpTasks.join("；")}
        />
      )}

      <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-3">
          <SectionHeader title="十項審批結果" subtitle="N12" />
          {evaluation.items.map((item) => (
            <PolicyCard
              key={item.id}
              item={item}
              open={expanded === item.id}
              onToggle={() =>
                setExpanded((v) => (v === item.id ? null : item.id))
              }
            />
          ))}
        </div>

        <div className="space-y-4">
          <Card>
            <SectionHeader title="N10｜EBITDA 計算明細" />
            <p className="mb-2 text-xs text-text-muted">{evaluation.ebitda.note}</p>
            <table className="w-full text-sm">
              <tbody>
                {[
                  ["除稅前溢利（EBT）", evaluation.ebitda.profitBeforeTaxHkd],
                  ["加：Interest（融資成本）", evaluation.ebitda.financeCostsHkd],
                  ["加：Tax（稅項）", evaluation.ebitda.taxHkd],
                  ["加：Depreciation（折舊）", evaluation.ebitda.depreciationHkd],
                  ["加：Amortisation（攤銷）", evaluation.ebitda.amortisationHkd],
                  ["計算所得 EBITDA", evaluation.ebitda.ebitdaHkd],
                ].map(([label, val], i) => (
                  <tr
                    key={String(label)}
                    className={i === 5 ? "font-semibold text-navy-900" : ""}
                  >
                    <td className="py-1.5">{label as string}</td>
                    <td className="py-1.5 text-right tabular">
                      {val != null ? formatHKD(val as number) : "未能確認"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="mt-2 text-xs text-text-muted">
              來源頁：{evaluation.ebitda.sourcePages.join("、") || "—"}
            </p>
          </Card>

          <Card>
            <SectionHeader title="N11｜DSCR 計算明細" />
            <div className="space-y-2 text-sm">
              <Row
                label="EBITDA"
                value={
                  evaluation.ebitda.ebitdaHkd != null
                    ? formatHKD(evaluation.ebitda.ebitdaHkd)
                    : "—"
                }
              />
              <Row
                label="Total Debt payments（一年）"
                value={
                  evaluation.annualDebtServiceHkd != null
                    ? formatHKD(evaluation.annualDebtServiceHkd)
                    : "未完整（客戶不清楚供款）"
                }
              />
              <Row
                label="EBITDA > Total Debt payments"
                value={
                  evaluation.ebitdaCoversDebtPayments == null
                    ? "未能判斷"
                    : evaluation.ebitdaCoversDebtPayments
                      ? "通過"
                      : "不通過"
                }
              />
              <Row
                label="DSCR"
                value={
                  evaluation.dscr != null
                    ? `${evaluation.dscr.toFixed(2)}x`
                    : "—"
                }
              />
              <Row label="政策硬規則" value="EBITDA > Total Debt payments" />
            </div>
            <Disclaimer>
              EBITDA＝EBT＋Interest＋Tax＋Depreciation＋Amortisation（系統公式）。
              本階段 Total Debt payments 以客戶已申報現有債務供款年化；新貸預計供款未計入。
            </Disclaimer>
          </Card>

          <Card>
            <SectionHeader title="人工覆核操作" subtitle="N14／N15" />
            <div className="flex flex-wrap gap-2">
              {[
                "接受 AI 結果",
                "修改單項狀態",
                "要求補充債務",
                "要求補交審計",
                "轉人工覆核",
                "記錄最終決定",
              ].map((op) => (
                <Button key={op} size="sm" variant="outline">
                  {op}
                </Button>
              ))}
            </div>
            <p className="mt-3 text-xs text-text-muted">
              改判必須記錄：原因、修改前／後、修改人、時間。
            </p>
          </Card>

          <Link href="/admin/cases/SLF-2026-00482">
            <Button variant="ghost" fullWidth>
              ← 返回財務簡報
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3">
      <span className="text-text-muted">{label}</span>
      <span className="tabular font-medium text-navy-900">{value}</span>
    </div>
  );
}

function PolicyCard({
  item,
  open,
  onToggle,
}: {
  item: PolicyItemResult;
  open: boolean;
  onToggle: () => void;
}) {
  return (
    <Card>
      <button
        type="button"
        className="flex w-full items-start justify-between gap-3 text-left"
        onClick={onToggle}
      >
        <div>
          <p className="text-xs text-text-muted">
            {item.id}｜{item.name}
          </p>
          <p className="mt-1 text-sm font-semibold text-navy-900">
            {item.actual}
          </p>
          <p className="mt-1 text-xs text-text-secondary">{item.policyStandard}</p>
        </div>
        <PolicyStatusBadge status={item.status} />
      </button>

      {open && (
        <div className="mt-4 space-y-3 border-t border-border pt-3">
          <div className="flex flex-wrap gap-1.5">
            {item.dataKinds.map((k) => (
              <DataSourceTag key={k} kind={k} />
            ))}
            <span className="rounded-full bg-surface-2 px-2 py-0.5 text-[11px] text-text-secondary">
              信心度 {item.confidence}
            </span>
          </div>
          <p className="text-sm text-text-primary">{item.riskReason}</p>
          <p className="text-xs text-text-muted">
            資料來源：{item.sources.join(" · ")}
          </p>
          <p className="text-xs text-teal-600">建議行動：{item.suggestedAction}</p>
          {item.details && (
            <div className="grid grid-cols-2 gap-2 text-xs">
              {Object.entries(item.details).map(([k, v]) => (
                <div key={k} className="rounded-lg bg-surface-2 p-2">
                  <p className="text-text-muted">{k}</p>
                  <p className="mt-0.5 tabular font-medium text-navy-900">
                    {typeof v === "number" ? formatHKD(v) : v ?? "—"}
                  </p>
                </div>
              ))}
            </div>
          )}
          <div className="flex flex-wrap gap-2">
            <Button size="sm">接受 AI 結果</Button>
            <Button size="sm" variant="outline">
              修改狀態
            </Button>
            <Button size="sm" variant="secondary">
              要求補充資料
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}
