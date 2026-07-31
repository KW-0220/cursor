"use client";

import type { BankCashflowBrief } from "@/lib/bank-statement-extract";
import {
  formatHkd,
  type BankSystemCheck,
} from "@/lib/bank-statement-extract";
import type { BrExtract } from "@/lib/br-extract";
import type { AuditedReportExtract } from "@/lib/audited-report-extract";
import {
  boolLabel,
  buildAuditedComparisonRows,
  buildAuditedCreditMetrics,
  type AuditedCreditMetrics,
} from "@/lib/audited-report-extract";
import type { IdentityExtract } from "@/lib/identity-extract";
import { StateBanner } from "@/components/ui/layout";
import { cn, formatHKD } from "@/lib/utils";

function fmtAmt(n: number | null | undefined) {
  if (n == null || Number.isNaN(n)) return "—";
  return formatHKD(n);
}

function checkTone(status: string) {
  if (status === "pass") return "text-emerald-700";
  if (status === "fail" || status === "red") return "text-red-700";
  if (status === "amber") return "text-amber-700";
  return "text-text-muted";
}

function checkLabel(status: string) {
  if (status === "pass") return "通過";
  if (status === "fail") return "不通過";
  if (status === "amber") return "黃燈／跟進";
  return "未定";
}

export function AuditedExtractPanel({
  a,
  monthlyDebtPayments,
  gearingThreshold,
  showCreditMetrics = true,
}: {
  a: AuditedReportExtract;
  monthlyDebtPayments?: number | null;
  gearingThreshold?: number;
  showCreditMetrics?: boolean;
}) {
  const rows = buildAuditedComparisonRows(a);
  const metrics = showCreditMetrics
    ? buildAuditedCreditMetrics(a, {
        monthlyDebtPayments: monthlyDebtPayments ?? null,
        gearingThreshold,
      })
    : null;
  const missingPl = !rows.some(
    (r) =>
      r.revenue != null || r.profitBeforeTax != null || r.netProfit != null,
  );
  return (
    <div className="space-y-4 text-sm">
      {missingPl && (
        <StateBanner
          tone="warning"
          title="損益表數字未抽出"
          description="已讀到公司／核數師，但營業額／除稅前溢利／淨利潤仍空。請確認 PDF 含 Statement of Profit or Loss／損益表，或只上載該幾頁後撳「重新上載及分析」。"
        />
      )}
      <div>
        <p className="mb-2 text-xs font-semibold text-navy-900">
          4.1 公司及報告基本資料
        </p>
        <dl className="space-y-2">
          {(
            [
              ["公司名稱", a.company_name],
              ["財政年度結束日期", a.year_end_date],
              ["報告貨幣", a.reporting_currency],
              ["核數師名稱", a.auditor_name],
              ["核數意見類型", a.audit_opinion_type],
              ["是否有保留意見", boolLabel(a.has_qualified_opinion)],
              [
                "持續經營重大不確定性",
                boolLabel(a.going_concern_uncertainty),
              ],
              ["完整財務報表附註", boolLabel(a.has_full_notes)],
            ] as [string, string | null][]
          ).map(([label, value]) => (
            <div
              key={label}
              className="flex flex-col gap-0.5 sm:flex-row sm:justify-between sm:gap-3"
            >
              <dt className="shrink-0 text-text-secondary">{label}</dt>
              <dd className="font-medium text-navy-900 sm:text-right">
                {value?.trim() ? value : "—"}
              </dd>
            </div>
          ))}
        </dl>
      </div>

      <div>
        <p className="mb-2 text-xs font-semibold text-navy-900">
          4.2 營業額及盈利 · 三年比較
        </p>
        {rows.length === 0 ? (
          <p className="text-text-muted">尚未抽出年度數字。</p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="w-full min-w-[480px] text-left text-xs">
              <thead className="bg-surface-2 text-text-muted">
                <tr>
                  <th className="px-3 py-2 font-medium">財政年度</th>
                  <th className="px-3 py-2 font-medium">營業額</th>
                  <th className="px-3 py-2 font-medium">除稅前溢利</th>
                  <th className="px-3 py-2 font-medium">淨利潤</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr
                    key={`${r.financialYear}-${i}`}
                    className="border-t border-border/70"
                  >
                    <td className="px-3 py-2 font-medium text-navy-900">
                      {r.financialYear || `年度${i + 1}`}
                    </td>
                    <td className="px-3 py-2 tabular">{fmtAmt(r.revenue)}</td>
                    <td className="px-3 py-2 tabular">
                      {fmtAmt(r.profitBeforeTax)}
                    </td>
                    <td className="px-3 py-2 tabular">{fmtAmt(r.netProfit)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {metrics && <AuditedCreditMetricsBlock metrics={metrics} rows={rows} />}
    </div>
  );
}

function AuditedCreditMetricsBlock({
  metrics,
  rows,
}: {
  metrics: AuditedCreditMetrics;
  rows: ReturnType<typeof buildAuditedComparisonRows>;
}) {
  const c = metrics.ebitdaComponents;
  const bs = metrics.balanceSheet;
  return (
    <>
      <div>
        <p className="mb-2 text-xs font-semibold text-navy-900">4.3 EBITDA</p>
        <dl className="space-y-1.5 text-sm">
          <div className="flex justify-between gap-2">
            <dt className="text-text-secondary">EBITDA 結果（政策）</dt>
            <dd className="tabular font-medium">
              {fmtAmt(metrics.latestEbitdaPolicy)}
            </dd>
          </div>
          <div className="flex justify-between gap-2">
            <dt className="text-text-secondary">除稅前溢利</dt>
            <dd className="tabular">{fmtAmt(c.profitBeforeTax)}</dd>
          </div>
          <div className="flex justify-between gap-2">
            <dt className="text-text-secondary">融資成本</dt>
            <dd className="tabular">{fmtAmt(c.financeCosts)}</dd>
          </div>
          <div className="flex justify-between gap-2">
            <dt className="text-text-secondary">折舊</dt>
            <dd className="tabular">{fmtAmt(c.depreciation)}</dd>
          </div>
          <div className="flex justify-between gap-2">
            <dt className="text-text-secondary">攤銷</dt>
            <dd className="tabular">{fmtAmt(c.amortisation)}</dd>
          </div>
          <div className="flex justify-between gap-2">
            <dt className="text-text-secondary">報告直接披露</dt>
            <dd className="tabular">{fmtAmt(c.disclosed)}</dd>
          </div>
          <div className="flex justify-between gap-2">
            <dt className="text-text-secondary">原始文件頁碼</dt>
            <dd>{c.sourcePages?.trim() || "—"}</dd>
          </div>
          <div className="flex justify-between gap-2">
            <dt className="text-text-secondary">AI 信心度</dt>
            <dd>
              {c.confidence != null
                ? `${Math.round(c.confidence * 100)}%`
                : "—"}
            </dd>
          </div>
          <div className="flex justify-between gap-2">
            <dt className="text-text-secondary">是否經人工修改</dt>
            <dd>{c.humanModified ? "是" : "否"}</dd>
          </div>
        </dl>
        <p className="mt-2 text-xs text-text-muted">
          公式：除稅前溢利 ＋ 融資成本 ＋ 折舊 ＋ 攤銷（有披露則優先披露值）
        </p>
        {rows.some((r) => r.ebitda != null) && (
          <p className="mt-1 text-xs text-text-muted">
            參考（Net Profit＋Interest＋Tax＋D＋A）：
            {rows
              .map(
                (r) =>
                  `${r.financialYear}: ${fmtAmt(r.ebitda)}`,
              )
              .join(" · ")}
          </p>
        )}
      </div>

      <div>
        <p className="mb-2 text-xs font-semibold text-navy-900">
          4.4 資產負債資料
        </p>
        <dl className="space-y-1.5 text-sm">
          {(
            [
              ["Total Assets", bs.totalAssets],
              ["Current Assets", bs.currentAssets],
              ["Cash and Bank", bs.cashAndBank],
              ["Total Liabilities", bs.totalLiabilities],
              ["Current Liabilities", bs.currentLiabilities],
              ["Borrowings", bs.borrowings],
              ["Shareholders’ Equity", bs.shareholdersEquity],
              ["Intangible Assets", bs.intangibleAssets],
              ["Goodwill", bs.goodwill],
            ] as [string, number | null][]
          ).map(([label, value]) => (
            <div key={label} className="flex justify-between gap-2">
              <dt className="text-text-secondary">{label}</dt>
              <dd className="tabular font-medium">{fmtAmt(value)}</dd>
            </div>
          ))}
          <div className="flex justify-between gap-2">
            <dt className="text-text-secondary">來源頁碼</dt>
            <dd>{bs.sourcePages?.trim() || "—"}</dd>
          </div>
        </dl>
      </div>

      <div>
        <p className="mb-2 text-xs font-semibold text-navy-900">
          4.5 Gearing Ratio
        </p>
        <dl className="space-y-1.5 text-sm">
          <div className="flex justify-between gap-2">
            <dt className="text-text-secondary">總負債</dt>
            <dd className="tabular">{fmtAmt(bs.totalLiabilities)}</dd>
          </div>
          <div className="flex justify-between gap-2">
            <dt className="text-text-secondary">股東權益</dt>
            <dd className="tabular">{fmtAmt(bs.shareholdersEquity)}</dd>
          </div>
          <div className="flex justify-between gap-2">
            <dt className="text-text-secondary">無形資產</dt>
            <dd className="tabular">{fmtAmt(bs.intangibleAssets)}</dd>
          </div>
          <div className="flex justify-between gap-2">
            <dt className="text-text-secondary">商譽</dt>
            <dd className="tabular">{fmtAmt(bs.goodwill)}</dd>
          </div>
          <div className="flex justify-between gap-2">
            <dt className="text-text-secondary">有形淨資產</dt>
            <dd className="tabular font-medium">
              {fmtAmt(metrics.tangibleNetWorth)}
            </dd>
          </div>
          <div className="flex justify-between gap-2">
            <dt className="text-text-secondary">Gearing Ratio</dt>
            <dd className="tabular font-medium">
              {metrics.gearing == null
                ? "—"
                : Number.isFinite(metrics.gearing)
                  ? metrics.gearing.toFixed(2)
                  : "∞"}
            </dd>
          </div>
          <div className="flex justify-between gap-2">
            <dt className="text-text-secondary">政策門檻</dt>
            <dd>&lt; {metrics.gearingThreshold}</dd>
          </div>
          <div className="flex justify-between gap-2">
            <dt className="text-text-secondary">初步狀態</dt>
            <dd className={cn("font-medium", checkTone(metrics.gearingStatus))}>
              {checkLabel(metrics.gearingStatus)}
            </dd>
          </div>
        </dl>
      </div>

      <div>
        <p className="mb-2 text-xs font-semibold text-navy-900">4.6 DSCR</p>
        <dl className="space-y-1.5 text-sm">
          <div className="flex justify-between gap-2">
            <dt className="text-text-secondary">EBITDA（政策）</dt>
            <dd className="tabular">{fmtAmt(metrics.latestEbitdaPolicy)}</dd>
          </div>
          <div className="flex justify-between gap-2">
            <dt className="text-text-secondary">一年總債務支出</dt>
            <dd className="tabular">{fmtAmt(metrics.annualDebtService)}</dd>
          </div>
          <div className="flex justify-between gap-2">
            <dt className="text-text-secondary">DSCR</dt>
            <dd className="tabular font-medium">
              {metrics.dscr != null ? `${metrics.dscr.toFixed(2)}x` : "—"}
            </dd>
          </div>
          <div className="flex justify-between gap-2">
            <dt className="text-text-secondary">狀態</dt>
            <dd className={cn("font-medium", checkTone(metrics.dscrStatus))}>
              {checkLabel(metrics.dscrStatus)}
            </dd>
          </div>
        </dl>
        <p className="mt-2 text-xs text-text-secondary">{metrics.dscrNote}</p>
      </div>

      <div>
        <p className="mb-2 text-xs font-semibold text-navy-900">
          4.7 三年營業額穩定性
        </p>
        {metrics.insufficientYears && (
          <StateBanner
            tone="warning"
            title="不足三年資料"
            description="目前抽出少於三個財政年度，穩定性判斷僅供參考。"
          />
        )}
        {metrics.revenueYoY.length === 0 ? (
          <p className="text-text-muted">尚無足夠年度比較營業額。</p>
        ) : (
          <ul className="space-y-1.5 text-sm">
            {metrics.revenueYoY.map((y) => (
              <li
                key={`${y.from}-${y.to}`}
                className="flex flex-wrap justify-between gap-2"
              >
                <span>
                  {y.from} → {y.to}
                </span>
                <span className="tabular">
                  {y.changePct == null
                    ? "—"
                    : `${(y.changePct * 100).toFixed(1)}%`}
                  {y.prev != null && y.curr != null
                    ? `（${fmtAmt(y.prev)} → ${fmtAmt(y.curr)}）`
                    : ""}
                </span>
              </li>
            ))}
          </ul>
        )}
        {metrics.consecutiveDecline && (
          <p className="mt-2 text-xs font-medium text-amber-800">
            偵測到連續下降趨勢，需政策覆核。
          </p>
        )}
      </div>
    </>
  );
}

export function IdentityExtractPanel({
  identity,
  personRole,
}: {
  identity: IdentityExtract;
  personRole?: string | null;
}) {
  const rows: [string, string | null][] = [
    ["人士角色", personRole ?? null],
    ["證件類型", identity.doc_type],
    ["中文姓名", identity.full_name_zh],
    ["英文姓名", identity.full_name_en],
    ["證件號碼", identity.id_number],
    ["國籍", identity.nationality],
    ["出生日期", identity.date_of_birth],
    ["性別", identity.sex],
    ["簽發日期", identity.issue_date],
    ["屆滿日期", identity.expiry_date],
  ];
  return (
    <dl className="space-y-2 text-sm">
      {rows.map(([label, value]) => (
        <div
          key={label}
          className="flex flex-col gap-0.5 sm:flex-row sm:justify-between sm:gap-3"
        >
          <dt className="shrink-0 text-text-secondary">{label}</dt>
          <dd className="font-medium text-navy-900 sm:text-right">
            {value?.trim() ? value : "—"}
          </dd>
        </div>
      ))}
    </dl>
  );
}

export function BankSystemChecksPanel({
  checks,
}: {
  checks: BankSystemCheck[];
}) {
  return (
    <ul className="space-y-2 text-sm">
      {checks.map((c) => (
        <li
          key={c.id}
          className="rounded-lg border border-border/70 bg-surface-1 px-3 py-2"
        >
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <span className="font-medium text-navy-900">{c.label}</span>
            <span className={cn("text-xs font-semibold", checkTone(c.status))}>
              {checkLabel(c.status)}
            </span>
          </div>
          <p className="mt-1 text-xs text-text-secondary">{c.detail}</p>
        </li>
      ))}
    </ul>
  );
}

export function BrExtractPanel({ br }: { br: BrExtract }) {
  const rows: [string, string | null][] = [
    ["公司中文名稱", br.company_name_zh],
    ["公司英文名稱", br.company_name_en],
    ["商業登記號碼", br.br_number],
    ["業務地址", br.business_address],
    ["業務性質", br.business_nature],
    ["生效日期", br.effective_date],
    ["屆滿日期", br.expiry_date],
  ];
  return (
    <dl className="space-y-2 text-sm">
      {rows.map(([label, value]) => (
        <div
          key={label}
          className="flex flex-col gap-0.5 sm:flex-row sm:justify-between sm:gap-3"
        >
          <dt className="shrink-0 text-text-secondary">{label}</dt>
          <dd className="font-medium text-navy-900 sm:text-right">
            {value?.trim() ? value : "—"}
          </dd>
        </div>
      ))}
    </dl>
  );
}

export function assessmentLabel(a: string | null | undefined) {
  if (a === "adequate") return "尚可";
  if (a === "tight") return "偏緊";
  if (a === "weak") return "偏弱";
  return "未知";
}

export function BankCashflowBriefPanel({ brief }: { brief: BankCashflowBrief }) {
  return (
    <div className="space-y-4">
      <section className="space-y-2">
        <h4 className="text-sm font-semibold text-navy-900">1. 公司現金流</h4>
        <p className="text-xs text-text-secondary">{brief.cashflow.narrative}</p>
        <dl className="grid grid-cols-1 gap-1 text-sm sm:grid-cols-3">
          <div className="flex justify-between gap-2 sm:block">
            <dt className="text-text-muted">六個月總存入</dt>
            <dd className="tabular font-medium">
              {formatHkd(brief.cashflow.sixMonthTotalCredits)}
            </dd>
          </div>
          <div className="flex justify-between gap-2 sm:block">
            <dt className="text-text-muted">六個月總支出</dt>
            <dd className="tabular font-medium">
              {formatHkd(brief.cashflow.sixMonthTotalDebits)}
            </dd>
          </div>
          <div className="flex justify-between gap-2 sm:block">
            <dt className="text-text-muted">六個月淨現金流</dt>
            <dd className="tabular font-medium">
              {formatHkd(brief.cashflow.sixMonthNet)}
            </dd>
          </div>
        </dl>
        <ul className="space-y-1 text-xs text-text-secondary">
          {brief.cashflow.months.map((m) => (
            <li key={m.month} className="flex flex-wrap justify-between gap-2">
              <span>{m.month}</span>
              <span className="tabular">
                存入 {formatHkd(m.totalCredits)} · 淨額{" "}
                {formatHkd(m.netCashflow)}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section className="space-y-2">
        <h4 className="text-sm font-semibold text-navy-900">
          2. 每月及每日戶口結餘
        </h4>
        <dl className="grid grid-cols-1 gap-1 text-sm sm:grid-cols-2">
          <div className="flex justify-between gap-2">
            <dt className="text-text-muted">六個月平均每日結餘</dt>
            <dd className="tabular font-medium">
              {formatHkd(brief.balances.sixMonthAvgDaily)}
            </dd>
          </div>
          <div className="flex justify-between gap-2">
            <dt className="text-text-muted">六個月最低每日結餘</dt>
            <dd className="tabular font-medium">
              {formatHkd(brief.balances.sixMonthMinDaily)}
            </dd>
          </div>
        </dl>
        <ul className="space-y-1 text-xs text-text-secondary">
          {brief.balances.months.map((m) => (
            <li key={m.month} className="flex flex-wrap justify-between gap-2">
              <span>{m.month}</span>
              <span className="tabular">
                開 {formatHkd(m.opening)} / 收 {formatHkd(m.closing)} · ADB{" "}
                {formatHkd(m.averageDaily)} · 最低 {formatHkd(m.minDaily)}
                {m.dailyCount ? ` · ${m.dailyCount} 日` : ""}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section className="space-y-2">
        <h4 className="text-sm font-semibold text-navy-900">3. 營業進帳</h4>
        <dl className="grid grid-cols-1 gap-1 text-sm sm:grid-cols-2">
          <div className="flex justify-between gap-2">
            <dt className="text-text-muted">六個月營業進帳</dt>
            <dd className="tabular font-medium">
              {formatHkd(brief.operatingInflows.sixMonthOperating)}
            </dd>
          </div>
          <div className="flex justify-between gap-2">
            <dt className="text-text-muted">每月平均營業進帳</dt>
            <dd className="tabular font-medium">
              {formatHkd(brief.operatingInflows.monthlyAvgOperating)}
            </dd>
          </div>
        </dl>
        <ul className="space-y-1 text-xs text-text-secondary">
          {brief.operatingInflows.months.map((m) => (
            <li key={m.month} className="flex flex-wrap justify-between gap-2">
              <span>{m.month}</span>
              <span className="tabular">
                營業 {formatHkd(m.operatingCredits)} · 總存入{" "}
                {formatHkd(m.totalCredits)}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section className="space-y-2">
        <h4 className="text-sm font-semibold text-navy-900">
          4. 進帳頻率及來源
        </h4>
        <ul className="space-y-1 text-xs text-text-secondary">
          {brief.inflowPattern.months.map((m) => (
            <li key={m.month} className="flex flex-wrap justify-between gap-2">
              <span>{m.month}</span>
              <span>
                {m.creditCount ?? "—"} 筆 · {m.creditDays ?? "—"} 個進帳日
              </span>
            </li>
          ))}
        </ul>
        {brief.inflowPattern.sources.length > 0 ? (
          <ul className="mt-2 space-y-1 text-sm">
            {brief.inflowPattern.sources.map((s) => (
              <li
                key={s.source}
                className="flex flex-wrap items-baseline justify-between gap-2"
              >
                <span className="font-medium text-navy-900">{s.source}</span>
                <span className="tabular text-xs text-text-secondary">
                  {formatHkd(s.totalHkd)} · {s.sharePct.toFixed(1)}%
                  {s.frequency ? ` · ${s.frequency}` : ""}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-xs text-text-muted">未能分辨主要進帳來源。</p>
        )}
      </section>

      <section className="space-y-2">
        <h4 className="text-sm font-semibold text-navy-900">5. 戶口異常紀錄</h4>
        {brief.anomalies.length === 0 ? (
          <p className="text-xs text-text-muted">
            未見明顯異常紀錄（或文件未列）。
          </p>
        ) : (
          <ul className="space-y-2 text-sm">
            {brief.anomalies.map((a, i) => (
              <li
                key={`${a.date}-${i}`}
                className="rounded-md bg-amber-50 px-3 py-2 text-amber-950"
              >
                <p className="text-xs text-amber-800">
                  {[a.month, a.date, a.kind].filter(Boolean).join(" · ")}
                </p>
                <p className="mt-0.5">{a.description}</p>
                {a.amountHkd != null && (
                  <p className="mt-0.5 tabular text-xs">
                    {formatHkd(a.amountHkd)}
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-2">
        <h4 className="text-sm font-semibold text-navy-900">
          6. 公司基本還款能力
        </h4>
        <p className="text-sm font-medium text-navy-900">
          整體：{assessmentLabel(brief.repaymentCapacity.overall)}
        </p>
        <p className="text-xs text-text-secondary">
          {brief.repaymentCapacity.narrative}
        </p>
        <ul className="space-y-1 text-xs text-text-secondary">
          {brief.repaymentCapacity.assessments.map((a) => (
            <li key={a.month} className="flex flex-wrap justify-between gap-2">
              <span>
                {a.month} · {assessmentLabel(a.assessment)}
              </span>
              <span>{a.notes || "—"}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
