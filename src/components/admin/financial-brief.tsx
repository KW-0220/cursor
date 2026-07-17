"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  bankMonths,
  collateral,
  existingDebts,
  financialYears,
  screeningHits,
} from "@/lib/mock-data";
import { formatHKD } from "@/lib/utils";
import { Card, SectionHeader } from "@/components/ui/layout";
import { TrafficLight } from "@/components/ui/status";

const chartData = financialYears.map((y) => ({
  year: y.year,
  營業額: y.revenue / 1_000_000,
  毛利: y.grossProfit / 1_000_000,
  淨利潤: y.netProfit / 1_000_000,
  股東權益: y.equity / 1_000_000,
}));

const cashflowData = bankMonths.map((m) => ({
  month: m.month.slice(5),
  入數: m.totalInflow / 1000,
  平均結餘: m.avgBalance / 1000,
}));

export function FinancialBriefCharts() {
  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <Card>
        <SectionHeader title="財務趨勢" subtitle="單位：百萬港元" />
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#d7dee7" />
              <XAxis dataKey="year" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="營業額" stroke="#12304a" strokeWidth={2} />
              <Line type="monotone" dataKey="毛利" stroke="#14919b" strokeWidth={2} />
              <Line type="monotone" dataKey="淨利潤" stroke="#1f7a4d" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>
      <Card>
        <SectionHeader title="銀行現金流" subtitle="單位：千港元" />
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={cashflowData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#d7dee7" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Legend />
              <Bar dataKey="入數" fill="#14919b" radius={[6, 6, 0, 0]} />
              <Bar dataKey="平均結餘" fill="#12304a" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </div>
  );
}

export function DebtAndCollateralPanels() {
  const totalOutstanding = existingDebts.reduce((s, d) => s + d.outstanding, 0);
  const totalPayment = existingDebts.reduce((s, d) => s + d.monthlyPayment, 0);
  const avgInflow =
    bankMonths.reduce((s, m) => s + m.totalInflow, 0) / bankMonths.length;

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <SectionHeader title="現有債務" />
        <div className="grid grid-cols-2 gap-3 text-sm">
          <Metric label="總貸款餘額" value={formatHKD(totalOutstanding)} />
          <Metric label="每月總供款" value={formatHKD(totalPayment)} />
          <Metric
            label="供款佔平均入數"
            value={`${((totalPayment / avgInflow) * 100).toFixed(0)}%`}
          />
          <Metric label="貸款機構數量" value={String(existingDebts.length)} />
        </div>
        <div className="mt-4 space-y-2">
          {existingDebts.map((d) => (
            <div
              key={d.lender + d.type}
              className="rounded-xl bg-surface-2 px-3 py-2 text-xs"
            >
              <p className="font-medium text-navy-900">
                {d.lender} · {d.type}
              </p>
              <p className="mt-1 tabular text-text-secondary">
                未償還 {formatHKD(d.outstanding)} · 月供 {formatHKD(d.monthlyPayment)} ·{" "}
                {d.rate}%
              </p>
            </div>
          ))}
        </div>
      </Card>
      <Card>
        <SectionHeader title="抵押資產" />
        <div className="grid grid-cols-2 gap-3 text-sm">
          <Metric label="物業類型" value={collateral.type} />
          <Metric label="估計市值" value={formatHKD(collateral.estimatedValue)} />
          <Metric label="現有貸款餘額" value={formatHKD(collateral.outstanding)} />
          <Metric
            label="估計淨值"
            value={formatHKD(collateral.estimatedValue - collateral.outstanding)}
          />
          <Metric
            label="初步按揭成數"
            value={`${((collateral.outstanding / collateral.estimatedValue) * 100).toFixed(0)}%`}
          />
          <Metric label="持有方式" value={collateral.holding} />
        </div>
        <p className="mt-3 text-xs text-text-muted">{collateral.address}</p>
      </Card>
    </div>
  );
}

export function ScreeningPanel() {
  const overall = screeningHits.some((h) => h.status === "red")
    ? "red"
    : screeningHits.some((h) => h.status === "amber")
      ? "amber"
      : "green";

  return (
    <div className="space-y-3">
      <TrafficLight
        result={overall}
        label="整體初篩結果"
        detail="三色燈只供內部參考；前端不應直接顯示必定批核或拒絕。"
        suggestion="請同時查看觸發原因及建議下一步，不可只用顏色表達。"
      />
      {screeningHits.map((hit) => (
        <TrafficLight
          key={hit.rule}
          result={hit.status}
          label={hit.rule}
          detail={hit.detail}
          suggestion={hit.suggestion}
        />
      ))}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-surface-2 p-3">
      <p className="text-xs text-text-muted">{label}</p>
      <p className="mt-1 font-semibold tabular text-navy-900">{value}</p>
    </div>
  );
}
