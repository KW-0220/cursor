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
import { TrafficLight } from "@/components/ui/status";
import { getDemoCashflowAnalysis } from "@/lib/bank-cashflow-mock";
import { formatHKD } from "@/lib/utils";

export default function CashflowAnalysisPage() {
  const [scenario, setScenario] = useState<"ok" | "incomplete" | "anomalies">(
    "ok",
  );
  const analysis = useMemo(
    () =>
      getDemoCashflowAnalysis({
        incomplete: scenario === "incomplete",
        withAnomalies: scenario === "anomalies",
      }),
    [scenario],
  );

  return (
    <MobileShell>
      <PageHeader
        title="銀行現金流分析"
        subtitle="每日平均餘額 · 進帳 · 異常｜非正式批核"
        backHref="/apply/documents"
      />
      <main className="space-y-4 px-4 py-5 pb-32">
        <div className="flex flex-wrap gap-2">
          {(
            [
              ["ok", "完整綠燈示範"],
              ["incomplete", "缺月黃燈"],
              ["anomalies", "異常紀錄"],
            ] as const
          ).map(([k, label]) => (
            <button
              key={k}
              onClick={() => setScenario(k)}
              className={`rounded-full px-3 py-1.5 text-xs font-medium ${
                scenario === k
                  ? "bg-navy-900 text-white"
                  : "bg-surface-2 text-text-secondary"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <Card>
          <p className="text-xs text-text-muted">頂部摘要</p>
          <p className="mt-1 font-semibold text-navy-900">
            {analysis.bankName} ···{analysis.accountLast4}
          </p>
          <p className="text-xs text-text-secondary">
            期間 {analysis.periodLabel} · 餘額基準：日終帳面結餘（Ledger）
          </p>
          <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-xs text-text-muted">六個月總進帳</p>
              <p className="font-semibold tabular">
                {formatHKD(Math.round(analysis.sixMonthTotalCreditsHkd))}
              </p>
            </div>
            <div>
              <p className="text-xs text-text-muted">每月平均進帳</p>
              <p className="font-semibold tabular">
                {formatHKD(Math.round(analysis.monthlyAvgCreditsHkd))}
              </p>
            </div>
            <div>
              <p className="text-xs text-text-muted">六個月每日平均餘額</p>
              <p className="font-semibold tabular">
                {analysis.sixMonthAdbHkd != null
                  ? formatHKD(Math.round(analysis.sixMonthAdbHkd))
                  : "—"}
              </p>
            </div>
            <div>
              <p className="text-xs text-text-muted">最低日終結餘</p>
              <p className="font-semibold tabular">
                {analysis.sixMonthMinDailyHkd != null
                  ? formatHKD(Math.round(analysis.sixMonthMinDailyHkd))
                  : "—"}
              </p>
            </div>
          </div>
          <p className="mt-2 text-[11px] text-text-muted">
            進帳來源 {analysis.creditSources.length} · 異常{" "}
            {analysis.anomalies.length} · 分析於{" "}
            {new Date(analysis.analyzedAt).toLocaleString("zh-HK")}
          </p>
        </Card>

        <TrafficLight
          result={analysis.overall}
          label="內部初篩（客戶端不顯示「正式批核／拒絕」）"
          detail={analysis.internalMessage}
          suggestion="最終由貸款顧問及機構決定。"
        />

        <SectionHeader title="每日平均餘額" subtitle="日終帳面結餘" />
        <Card className="overflow-x-auto p-2">
          <table className="w-full min-w-[360px] text-left text-xs">
            <thead>
              <tr className="text-text-muted">
                <th className="p-2">月份</th>
                <th className="p-2">期初</th>
                <th className="p-2">期末</th>
                <th className="p-2">每日平均</th>
                <th className="p-2">最低</th>
              </tr>
            </thead>
            <tbody>
              {analysis.months.map((r) => (
                <tr key={r.month} className="border-t border-border/60">
                  <td className="p-2">{r.month}</td>
                  <td className="p-2 tabular">
                    {r.openingBalanceHkd != null
                      ? formatHKD(r.openingBalanceHkd)
                      : "—"}
                  </td>
                  <td className="p-2 tabular">
                    {r.closingBalanceHkd != null
                      ? formatHKD(r.closingBalanceHkd)
                      : "—"}
                  </td>
                  <td className="p-2 tabular">
                    {r.averageDailyBalanceHkd != null
                      ? formatHKD(Math.round(r.averageDailyBalanceHkd))
                      : "數據不足"}
                  </td>
                  <td className="p-2 tabular">
                    {r.minDailyBalanceHkd != null
                      ? formatHKD(Math.round(r.minDailyBalanceHkd))
                      : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {analysis.sixMonthAdbHkd == null && (
            <p className="mt-2 px-2 text-xs text-warning-600">
              黃燈｜數據不足：未能從現有銀行月結單完整計算每日平均餘額，需要重新上載或人工覆核。
            </p>
          )}
        </Card>

        <SectionHeader title="進帳表現" />
        <Card className="overflow-x-auto p-2">
          <table className="w-full min-w-[320px] text-left text-xs">
            <thead>
              <tr className="text-text-muted">
                <th className="p-2">月份</th>
                <th className="p-2">總進帳</th>
                <th className="p-2">次數</th>
                <th className="p-2">進帳日</th>
                <th className="p-2">平均單筆</th>
              </tr>
            </thead>
            <tbody>
              {analysis.creditRows.map((r) => (
                <tr key={r.month} className="border-t border-border/60">
                  <td className="p-2">{r.month}</td>
                  <td className="p-2 tabular">
                    {formatHKD(Math.round(r.totalCreditsHkd))}
                  </td>
                  <td className="p-2 tabular">{r.creditCount}</td>
                  <td className="p-2 tabular">{r.creditDays}日</td>
                  <td className="p-2 tabular">
                    {r.avgCreditSizeHkd != null
                      ? formatHKD(Math.round(r.avgCreditSizeHkd))
                      : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-3 px-2 text-sm text-text-secondary">
            最近六個月平均每月進帳約{" "}
            {formatHKD(Math.round(analysis.monthlyAvgCreditsHkd))}
            ，進帳頻率整體穩定。綠／黃／紅門檻由後台信貸政策設定，不寫死於 UI。
          </p>
        </Card>

        <SectionHeader title="進帳來源" />
        <Card>
          <ul className="space-y-2 text-sm">
            {analysis.creditSources.slice(0, 5).map((s) => (
              <li
                key={s.source}
                className="flex items-center justify-between gap-2 border-b border-border/50 pb-2 last:border-0"
              >
                <span>{s.source}</span>
                <span className="tabular text-navy-900">
                  {formatHKD(Math.round(s.totalHkd))} · {s.sharePct.toFixed(0)}%
                </span>
              </li>
            ))}
          </ul>
          {analysis.unclassifiedCreditHkd > 0 && (
            <p className="mt-3 text-xs text-warning-600">
              系統未能確認部分進帳是否屬於日常營業收入，已列為「待分類進帳」（
              {formatHKD(Math.round(analysis.unclassifiedCreditHkd))}
              ）。客戶或顧問可重新分類，並留下人工修改紀錄。
            </p>
          )}
        </Card>

        <SectionHeader title="戶口異常" />
        <Card>
          {analysis.anomalies.length === 0 ? (
            <p className="text-sm text-text-secondary">
              未發現退票／Autopay 失敗／超額透支（示範）。
            </p>
          ) : (
            <ul className="space-y-3">
              {analysis.anomalies.map((a) => (
                <li key={a.id} className="text-sm">
                  <p className="font-medium text-navy-900">
                    {a.kind} · {a.date}
                  </p>
                  <p className="text-xs text-text-secondary">{a.description}</p>
                  {a.note && (
                    <p className="text-xs text-warning-600">{a.note}</p>
                  )}
                  <p className="text-[11px] text-text-muted">
                    金額{" "}
                    {a.amountHkd != null
                      ? formatHKD(Math.round(a.amountHkd))
                      : "—"}{" "}
                    · 頁 {a.sourcePage ?? "—"} · 信心{" "}
                    {(a.confidence * 100).toFixed(0)}%
                  </p>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <SectionHeader title="政策規則命中（內部）" />
        <div className="space-y-2">
          {analysis.ruleHits.map((r) => (
            <TrafficLight
              key={r.id}
              result={r.status}
              label={r.name}
              detail={r.detail}
              suggestion="門檻見後台「銀行現金流審批規則」。"
            />
          ))}
        </div>

        <StateBanner
          tone={
            analysis.clientFacing === "pass_review"
              ? "success"
              : analysis.clientFacing === "need_supplement"
                ? "warning"
                : "error"
          }
          title="客戶端初步結果"
          description={analysis.clientMessage}
        />

        <div className="flex flex-col gap-2">
          <Link href="/apply/result">
            <Button fullWidth>查看初步資格評估結果</Button>
          </Link>
          <Link href="/admin/cashflow-rules">
            <Button fullWidth variant="outline">
              （示範）現金流審批規則
            </Button>
          </Link>
        </div>
        <Disclaimer>
          AI 不可自行補數、不可把不明進帳當營業收入、不可把所有負數結餘當超額透支、不可直接正式批核或拒絕。
        </Disclaimer>
      </main>
    </MobileShell>
  );
}
