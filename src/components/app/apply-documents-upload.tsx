"use client";

import { useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import {
  Card,
  Disclaimer,
  SectionHeader,
  StateBanner,
} from "@/components/ui/layout";
import type { FinancialExtract } from "@/lib/financial-extract";
import { toStructuredExtractJson } from "@/lib/financial-extract";
import type {
  BankCashflowBrief,
  BankStatementExtract,
} from "@/lib/bank-statement-extract";
import {
  formatHkd,
  mergeBankStatementExtracts,
  toBankStatementExtract,
} from "@/lib/bank-statement-extract";
import type { BrExtract } from "@/lib/br-extract";
import { toBrExtract } from "@/lib/br-extract";
import type { AuditedReportExtract } from "@/lib/audited-report-extract";
import {
  boolLabel,
  buildAuditedComparisonRows,
  mergeAuditedExtracts,
  toAuditedExtract,
} from "@/lib/audited-report-extract";
import { formatHKD } from "@/lib/utils";

export type UploadedMeta = {
  name: string;
  size: number;
  type: string;
  file: File;
};

export type ApplyDocsState = {
  br: UploadedMeta | null;
  /** 最近三年 Audited Report（可 1–3 份） */
  audited: UploadedMeta[];
  identity: UploadedMeta[];
  companyOther: UploadedMeta[];
  bank: Record<string, UploadedMeta | null>;
};

type AnalyzeItemResult = {
  label: string;
  fileName: string;
  ok: boolean;
  message?: string;
  /** 穩定鍵：br | audited:0 | bank:2026-01 */
  slotKey: string;
  extract?: FinancialExtract;
  bankExtract?: BankStatementExtract;
  brExtract?: BrExtract;
  auditedExtract?: AuditedReportExtract;
  model?: string;
  docKind?: string;
  extractHint?: string | null;
  textPreview?: string;
  statementMonth?: string;
  auditedIndex?: number;
};

function AuditedExtractPanel({ a }: { a: AuditedReportExtract }) {
  const rows = buildAuditedComparisonRows(a);
  return (
    <div className="space-y-4 text-sm">
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
                  <tr key={`${r.financialYear}-${i}`} className="border-t border-border/70">
                    <td className="px-3 py-2 font-medium text-navy-900">
                      {r.financialYear || `年度${i + 1}`}
                    </td>
                    <td className="px-3 py-2 tabular">
                      {r.revenue != null ? formatHKD(r.revenue) : "—"}
                    </td>
                    <td className="px-3 py-2 tabular">
                      {r.profitBeforeTax != null
                        ? formatHKD(r.profitBeforeTax)
                        : "—"}
                    </td>
                    <td className="px-3 py-2 tabular">
                      {r.netProfit != null ? formatHKD(r.netProfit) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {rows.some((r) => r.ebitda != null) && (
          <p className="mt-2 text-xs text-text-muted">
            EBITDA（Audited 公式：Net Profit＋Interest＋Tax＋D＋A）：
            {rows
              .map(
                (r) =>
                  `${r.financialYear}: ${
                    r.ebitda != null ? formatHKD(r.ebitda) : "—"
                  }`,
              )
              .join(" · ")}
          </p>
        )}
        <p className="mt-1 text-xs text-text-muted">
          D&amp;A 優先取自現金流量表或財務報表附註；損益表未必單獨列出。
        </p>
      </div>
    </div>
  );
}

function BrExtractPanel({ br }: { br: BrExtract }) {
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
        <div key={label} className="flex flex-col gap-0.5 sm:flex-row sm:justify-between sm:gap-3">
          <dt className="shrink-0 text-text-secondary">{label}</dt>
          <dd className="font-medium text-navy-900 sm:text-right">
            {value?.trim() ? value : "—"}
          </dd>
        </div>
      ))}
    </dl>
  );
}

function assessmentLabel(a: string | null | undefined) {
  if (a === "adequate") return "尚可";
  if (a === "tight") return "偏緊";
  if (a === "weak") return "偏弱";
  return "未知";
}

function BankCashflowBriefPanel({ brief }: { brief: BankCashflowBrief }) {
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
          <p className="text-xs text-text-muted">未見明顯異常紀錄（或文件未列）。</p>
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

export function lastSixBankMonths(now = new Date()): string[] {
  const d = new Date(now.getFullYear(), now.getMonth(), 1);
  d.setMonth(d.getMonth() - 1);
  const months: string[] = [];
  for (let i = 0; i < 6; i++) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    months.unshift(`${y}-${m}`);
    d.setMonth(d.getMonth() - 1);
  }
  return months;
}

export function emptyApplyDocs(months: string[]): ApplyDocsState {
  return {
    br: null,
    audited: [],
    identity: [],
    companyOther: [],
    bank: Object.fromEntries(months.map((m) => [m, null])),
  };
}

export function isApplyDocsComplete(docs: ApplyDocsState, months: string[]) {
  const bankOk = months.every((m) => docs.bank[m] != null);
  return Boolean(
    docs.br && docs.audited.length > 0 && docs.identity.length > 0 && bankOk,
  );
}

export function applyDocsProgress(docs: ApplyDocsState, months: string[]) {
  const bankFilled = months.filter((m) => docs.bank[m]).length;
  const slots = [
    docs.br ? 1 : 0,
    docs.audited.length > 0 ? 1 : 0,
    docs.identity.length > 0 ? 1 : 0,
    bankFilled === 6 ? 1 : 0,
  ];
  return {
    done: slots.reduce((a, b) => a + b, 0),
    total: 4,
    bankFilled,
  };
}

function toMeta(file: File): UploadedMeta {
  return {
    name: file.name,
    size: file.size,
    type: file.type || "application/octet-stream",
    file,
  };
}

function isPdf(file: File) {
  return (
    file.type === "application/pdf" ||
    file.name.toLowerCase().endsWith(".pdf")
  );
}

function formatBytes(n: number) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

function money(n: number | null | undefined) {
  return n == null ? "—" : formatHKD(n);
}

function FileRow({
  file,
  onClear,
}: {
  file: UploadedMeta;
  onClear: () => void;
}) {
  return (
    <div className="mt-2 flex items-center justify-between gap-2 rounded-xl bg-surface-2 px-3 py-2 text-sm">
      <div className="min-w-0">
        <p className="truncate font-medium text-navy-900">{file.name}</p>
        <p className="text-xs text-text-muted">{formatBytes(file.size)}</p>
      </div>
      <button
        type="button"
        className="shrink-0 text-xs text-danger-600"
        onClick={onClear}
      >
        移除
      </button>
    </div>
  );
}

/** 分析失敗後：旁邊一掣選新檔並即時再分析該項 */
function ReuploadAnalyzeButton({
  accept,
  pdfOnly,
  disabled,
  onPick,
}: {
  accept: string;
  pdfOnly?: boolean;
  disabled?: boolean;
  onPick: (file: File) => void | Promise<void>;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [reject, setReject] = useState<string | null>(null);

  return (
    <div className="mt-2 flex flex-wrap items-center gap-2">
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          e.target.value = "";
          if (!f) return;
          if (pdfOnly && !isPdf(f)) {
            setReject("只接受 PDF 檔");
            return;
          }
          setReject(null);
          setBusy(true);
          void Promise.resolve(onPick(f)).finally(() => setBusy(false));
        }}
      />
      <Button
        type="button"
        size="sm"
        variant="outline"
        disabled={disabled || busy}
        onClick={() => inputRef.current?.click()}
      >
        {busy ? "重新分析中…" : "重新上載及分析"}
      </Button>
      {reject && <span className="text-xs text-danger-600">{reject}</span>}
    </div>
  );
}

function SingleUpload({
  label,
  required,
  hint,
  accept,
  value,
  onChange,
  pdfOnly,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  accept: string;
  value: UploadedMeta | null;
  onChange: (f: UploadedMeta | null) => void;
  pdfOnly?: boolean;
}) {
  const [reject, setReject] = useState<string | null>(null);
  return (
    <Card>
      <Field label={label} required={required} hint={hint}>
        <Input
          type="file"
          accept={accept}
          onChange={(e) => {
            const f = e.target.files?.[0];
            e.target.value = "";
            if (!f) return;
            if (pdfOnly && !isPdf(f)) {
              setReject("只接受 PDF 檔");
              return;
            }
            setReject(null);
            onChange(toMeta(f));
          }}
        />
      </Field>
      {reject && <p className="mt-2 text-xs text-danger-600">{reject}</p>}
      {value ? (
        <FileRow file={value} onClear={() => onChange(null)} />
      ) : (
        <p className="mt-2 text-xs text-warning-600">尚未上載</p>
      )}
    </Card>
  );
}

function MultiUpload({
  label,
  required,
  hint,
  accept,
  values,
  onChange,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  accept: string;
  values: UploadedMeta[];
  onChange: (files: UploadedMeta[]) => void;
}) {
  return (
    <Card>
      <Field label={label} required={required} hint={hint}>
        <Input
          type="file"
          accept={accept}
          multiple
          onChange={(e) => {
            const list = Array.from(e.target.files ?? []);
            e.target.value = "";
            if (!list.length) return;
            onChange([...values, ...list.map(toMeta)]);
          }}
        />
      </Field>
      {values.length === 0 ? (
        <p className="mt-2 text-xs text-warning-600">尚未上載</p>
      ) : (
        values.map((f, i) => (
          <FileRow
            key={`${f.name}-${i}-${f.size}`}
            file={f}
            onClear={() => onChange(values.filter((_, idx) => idx !== i))}
          />
        ))
      )}
    </Card>
  );
}

export function ApplyDocumentsUpload({
  months,
  docs,
  onChange,
  loanType = "unsecured",
  amountHkd = 1500000,
  purpose = "營運資金",
  companyName = "",
}: {
  months: string[];
  docs: ApplyDocsState;
  onChange: (next: ApplyDocsState) => void;
  loanType?: string;
  amountHkd?: number;
  purpose?: string;
  companyName?: string;
}) {
  const progress = useMemo(
    () => applyDocsProgress(docs, months),
    [docs, months],
  );
  const complete = isApplyDocsComplete(docs, months);

  const docsRef = useRef(docs);
  docsRef.current = docs;

  const [analyzing, setAnalyzing] = useState(false);
  const [analyzeProgress, setAnalyzeProgress] = useState<string | null>(null);
  const [analyzeError, setAnalyzeError] = useState<string | null>(null);
  const [analyzeResults, setAnalyzeResults] = useState<AnalyzeItemResult[]>(
    [],
  );

  async function analyzeOne(
    label: string,
    meta: UploadedMeta,
    docKind: "br" | "audited" | "bank",
    opts?: {
      statementMonth?: string;
      auditedIndex?: number;
      slotKey: string;
    },
  ): Promise<AnalyzeItemResult> {
    const statementMonth = opts?.statementMonth;
    const slotKey =
      opts?.slotKey ??
      (docKind === "br"
        ? "br"
        : docKind === "audited"
          ? `audited:${opts?.auditedIndex ?? 0}`
          : `bank:${statementMonth ?? "unknown"}`);

    const form = new FormData();
    form.set("file", meta.file);
    form.set("docKind", docKind);
    form.set("loanType", loanType);
    form.set("amountHkd", String(amountHkd));
    form.set("purpose", purpose);
    if (statementMonth) form.set("statementMonth", statementMonth);
    if (companyName.trim()) form.set("companyName", companyName.trim());

    const baseFail = {
      label,
      fileName: meta.name,
      ok: false as const,
      slotKey,
      docKind,
      statementMonth,
      auditedIndex: opts?.auditedIndex,
    };

    try {
      const res = await fetch("/api/analyze-document", {
        method: "POST",
        body: form,
      });
      const data = (await res.json()) as {
        ok?: boolean;
        message?: string;
        error?: string;
        detail?: string;
        extract?: FinancialExtract;
        bankExtract?: BankStatementExtract;
        brExtract?: BrExtract;
        auditedExtract?: AuditedReportExtract;
        model?: string;
        docKind?: string;
        extractHint?: string | null;
        textPreview?: string;
        statementMonth?: string;
      };
      if (!res.ok || !data.ok) {
        const detail =
          typeof data.detail === "string" && data.detail.length < 180
            ? `（${data.detail}）`
            : "";
        return {
          ...baseFail,
          message: `${data.message || data.error || "分析失敗"}${detail}`,
        };
      }
      return {
        label,
        fileName: meta.name,
        ok: true,
        slotKey,
        extract: toStructuredExtractJson(data.extract),
        bankExtract:
          docKind === "bank"
            ? toBankStatementExtract(data.bankExtract, statementMonth)
            : undefined,
        brExtract: docKind === "br" ? toBrExtract(data.brExtract) : undefined,
        auditedExtract:
          docKind === "audited"
            ? toAuditedExtract(data.auditedExtract)
            : undefined,
        model: data.model,
        docKind: data.docKind ?? docKind,
        extractHint: data.extractHint,
        textPreview: data.textPreview,
        statementMonth: data.statementMonth ?? statementMonth,
        auditedIndex: opts?.auditedIndex,
      };
    } catch (e) {
      return {
        ...baseFail,
        message: e instanceof Error ? e.message : "網絡錯誤",
      };
    }
  }

  function upsertResult(next: AnalyzeItemResult) {
    setAnalyzeResults((prev) => {
      const idx = prev.findIndex((r) => r.slotKey === next.slotKey);
      if (idx < 0) return [...prev, next];
      const copy = [...prev];
      copy[idx] = next;
      return copy;
    });
  }

  /** 失敗項：換檔 → 更新 docs → 只重跑該 slot */
  async function reuploadAndAnalyze(params: {
    docKind: "br" | "audited" | "bank";
    file: File;
    statementMonth?: string;
    auditedIndex?: number;
    label: string;
    slotKey: string;
  }) {
    const meta = toMeta(params.file);
    const current = docsRef.current;
    if (params.docKind === "br") {
      onChange({ ...current, br: meta });
    } else if (params.docKind === "bank" && params.statementMonth) {
      onChange({
        ...current,
        bank: { ...current.bank, [params.statementMonth]: meta },
      });
    } else if (
      params.docKind === "audited" &&
      typeof params.auditedIndex === "number"
    ) {
      const audited = [...current.audited];
      audited[params.auditedIndex] = meta;
      onChange({ ...current, audited });
    } else if (params.docKind === "audited") {
      onChange({
        ...current,
        audited: [...current.audited, meta].slice(0, 3),
      });
    }

    setAnalyzing(true);
    setAnalyzeError(null);
    setAnalyzeProgress(`重新分析：${params.label}`);
    try {
      const result = await analyzeOne(params.label, meta, params.docKind, {
        statementMonth: params.statementMonth,
        auditedIndex: params.auditedIndex,
        slotKey: params.slotKey,
      });
      upsertResult(result);
    } finally {
      setAnalyzeProgress(null);
      setAnalyzing(false);
    }
  }

  async function postBatch(
    batchKind: "bank" | "audited",
    parts: Array<{ meta: UploadedMeta; month?: string; index: number }>,
  ): Promise<{
    ok: boolean;
    message?: string;
    taskId?: string;
    items?: AnalyzeItemResult[];
    extractHint?: string | null;
  }> {
    const form = new FormData();
    form.set("batchKind", batchKind);
    form.set("loanType", loanType);
    form.set("amountHkd", String(amountHkd));
    form.set("purpose", purpose);
    if (companyName.trim()) form.set("companyName", companyName.trim());
    parts.forEach((p, i) => {
      form.set(`file${i}`, p.meta.file);
      if (p.month) form.set(`month${i}`, p.month);
    });
    const res = await fetch("/api/analyze-documents-batch", {
      method: "POST",
      body: form,
    });
    const data = (await res.json()) as {
      ok?: boolean;
      message?: string;
      error?: string;
      detail?: string;
      taskId?: string;
      extractHint?: string | null;
      items?: Array<{
        ok: boolean;
        label: string;
        fileName: string;
        slotKey: string;
        docKind?: string;
        statementMonth?: string;
        auditedIndex?: number;
        message?: string;
        bankExtract?: BankStatementExtract;
        auditedExtract?: AuditedReportExtract;
        brExtract?: BrExtract;
        extract?: FinancialExtract;
        extractHint?: string | null;
      }>;
    };
    if (!res.ok || !data.ok) {
      return {
        ok: false,
        message: `${data.message || data.error || "batch 分析失敗"}${
          data.detail && String(data.detail).length < 160
            ? `（${data.detail}）`
            : ""
        }`,
      };
    }
    return {
      ok: true,
      taskId: data.taskId,
      extractHint: data.extractHint,
      items: (data.items || []).map((it) => ({
        label: it.label,
        fileName: it.fileName,
        ok: it.ok,
        message: it.message,
        slotKey: it.slotKey,
        docKind: it.docKind,
        statementMonth: it.statementMonth,
        auditedIndex: it.auditedIndex,
        bankExtract: it.bankExtract
          ? toBankStatementExtract(it.bankExtract, it.statementMonth)
          : undefined,
        auditedExtract: it.auditedExtract
          ? toAuditedExtract(it.auditedExtract)
          : undefined,
        extract: it.extract
          ? toStructuredExtractJson(it.extract)
          : undefined,
        extractHint: it.extractHint ?? data.extractHint,
      })),
    };
  }

  async function runAiAnalyze() {
    if (!complete) {
      setAnalyzeError(
        "請先完成必須文件（BR、Audited Report、身份、6 份銀行月結單 PDF）",
      );
      return;
    }
    setAnalyzing(true);
    setAnalyzeError(null);
    setAnalyzeResults([]);

    const results: AnalyzeItemResult[] = [];
    try {
      // 1) 銀行月結 6 份 → 1 Manus task
      const bankParts = months.flatMap((m, index) => {
        const meta = docs.bank[m];
        return meta ? [{ meta, month: m, index }] : [];
      });
      if (bankParts.length) {
        setAnalyzeProgress(
          `正在分析銀行月結（${bankParts.length} 份 · 同一個 Manus task）…`,
        );
        const bankBatch = await postBatch("bank", bankParts);
        if (!bankBatch.ok || !bankBatch.items?.length) {
          for (const p of bankParts) {
            results.push({
              label: `銀行月結單 ${p.month}`,
              fileName: p.meta.name,
              ok: false,
              message: bankBatch.message || "銀行月結 batch 失敗",
              slotKey: `bank:${p.month}`,
              docKind: "bank",
              statementMonth: p.month,
            });
          }
        } else {
          results.push(...bankBatch.items);
        }
        setAnalyzeResults([...results]);
      }

      // 2) Audited 1–3 份 → 1 Manus task
      if (docs.audited.length) {
        setAnalyzeProgress(
          `正在分析 Audited Report（${docs.audited.length} 份 · 同一個 Manus task）…`,
        );
        const auditedParts = docs.audited.map((meta, index) => ({
          meta,
          index,
        }));
        const auditedBatch = await postBatch("audited", auditedParts);
        if (!auditedBatch.ok || !auditedBatch.items?.length) {
          for (let i = 0; i < docs.audited.length; i++) {
            results.push({
              label: `Audited Report ${i + 1}`,
              fileName: docs.audited[i]!.name,
              ok: false,
              message: auditedBatch.message || "Audited batch 失敗",
              slotKey: `audited:${i}`,
              docKind: "audited",
              auditedIndex: i,
            });
          }
        } else {
          results.push(...auditedBatch.items);
        }
        setAnalyzeResults([...results]);
      }

      // 3) BR → 獨立 1 task
      if (docs.br) {
        setAnalyzeProgress("正在分析商業登記證 BR（獨立 Manus task）…");
        results.push(
          await analyzeOne("商業登記證 BR", docs.br, "br", {
            slotKey: "br",
          }),
        );
        setAnalyzeResults([...results]);
      }

      setAnalyzeProgress(null);
      if (results.length && results.every((r) => !r.ok)) {
        setAnalyzeError("全部文件分析失敗，請檢查檔案後重試或逐項重新上載。");
      }
    } catch (e) {
      setAnalyzeError(e instanceof Error ? e.message : "網絡錯誤");
      setAnalyzeProgress(null);
    } finally {
      setAnalyzing(false);
    }
  }

  return (
    <div className="space-y-4">
      <SectionHeader
        title="上載必須文件"
        subtitle="真實申請 · 全部於本頁提交"
      />
      <StateBanner
        tone="info"
        title="文件清單"
        description="請上載：① 公司及身份文件 ② 最近六個月銀行月結單（必須 6 份 PDF）③ 最近三年 Audited Report ④ 商業登記證 BR。"
      />

      <Card className="bg-surface-2">
        <p className="text-sm font-medium text-navy-900">
          完成進度：{progress.done}／{progress.total} 類
          {complete ? " · 已齊備" : " · 尚欠文件"}
        </p>
        <p className="mt-1 text-xs text-text-muted">
          銀行月結單：{progress.bankFilled}／6 份 PDF
        </p>
      </Card>

      <SectionHeader title="1. 公司及身份文件" />
      <MultiUpload
        label="身份證明文件"
        required
        hint="所有董事、股東及個人擔保人：香港身份證或護照（PDF／JPG／PNG）"
        accept="application/pdf,.pdf,image/jpeg,.jpg,.jpeg,image/png,.png"
        values={docs.identity}
        onChange={(identity) => onChange({ ...docs, identity })}
      />
      <MultiUpload
        label="其他公司文件（選填）"
        hint="例如授權書、公司章程副本"
        accept="application/pdf,.pdf,image/jpeg,.jpg,.jpeg,image/png,.png"
        values={docs.companyOther}
        onChange={(companyOther) => onChange({ ...docs, companyOther })}
      />

      <SectionHeader title="2. 六個月銀行月結單" subtitle="必須 6 份 PDF" />
      <StateBanner
        tone="warning"
        title="只接受 PDF"
        description="六個連續月份、同一主要銀行戶口、完整交易頁。不接受 JPG、PNG、截圖或 Excel。"
      />
      <div className="space-y-3">
        {months.map((m) => (
          <Card key={m}>
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-semibold text-navy-900">{m}</p>
              <span
                className={`text-xs ${docs.bank[m] ? "text-teal-700" : "text-warning-600"}`}
              >
                {docs.bank[m] ? "已上載" : "尚未上載"}
              </span>
            </div>
            <Field label="上載 PDF" required>
              <Input
                type="file"
                accept="application/pdf,.pdf"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  e.target.value = "";
                  if (!f) return;
                  if (!isPdf(f)) return;
                  onChange({
                    ...docs,
                    bank: { ...docs.bank, [m]: toMeta(f) },
                  });
                }}
              />
            </Field>
            {docs.bank[m] && (
              <FileRow
                file={docs.bank[m]!}
                onClear={() =>
                  onChange({
                    ...docs,
                    bank: { ...docs.bank, [m]: null },
                  })
                }
              />
            )}
          </Card>
        ))}
      </div>
      {progress.bankFilled < 6 && (
        <p className="text-xs text-warning-600">
          尚欠 {6 - progress.bankFilled} 份銀行月結單 PDF，齊 6 份後才可繼續。
        </p>
      )}

      <SectionHeader
        title="3. Audited Report"
        subtitle="最近三年 · 可上載 1–3 份 PDF"
      />
      <MultiUpload
        label="最近三年 Audited Report／核數師報告"
        required
        hint="請上載最近三個財政年度的 Audited Report（PDF 為佳；可一次多份）。系統會抽取公司／核數意見及三年營業額、除稅前溢利、淨利潤比較。"
        accept="application/pdf,.pdf,image/jpeg,.jpg,.jpeg,image/png,.png"
        values={docs.audited}
        onChange={(audited) =>
          onChange({ ...docs, audited: audited.slice(0, 3) })
        }
      />

      <SectionHeader title="4. 商業登記證 BR" />
      <SingleUpload
        label="商業登記證 BR"
        required
        hint="最新有效副本；公司名稱及商業登記號碼須清晰。掃描 PDF 可自動 Vision；最穩係上 JPG／PNG 成張證。"
        accept="application/pdf,.pdf,image/jpeg,.jpg,.jpeg,image/png,.png"
        value={docs.br}
        onChange={(br) => onChange({ ...docs, br })}
      />

      {!complete && (
        <StateBanner
          tone="warning"
          title="文件未齊"
          description="請完成 BR、Audited Report、至少一份身份證明，以及 6 份銀行月結單 PDF。"
        />
      )}

      <Card className="space-y-3">
        <SectionHeader
          title="AI 文件分析"
          subtitle="銀行月結 6 份＝1 task · Audited 1–3 份＝1 task · BR＝獨立 1 task"
        />
        <StateBanner
          tone="info"
          title="Manus 批次分析"
          description="銀行月結：現金流六大項（同一個 task）。Audited Report：公司／核數師／三年比較（同一個 task）。BR：中英文名／登記號碼／地址／性質／日期（獨立 task）。"
        />
        <Button
          fullWidth
          size="lg"
          type="button"
          disabled={analyzing || !complete}
          onClick={() => void runAiAnalyze()}
        >
          {analyzing ? "正在分析……" : "立即AI分析"}
        </Button>
        {!complete && (
          <p className="text-xs text-text-muted">
            齊備必須文件後即可執行 AI 分析。
          </p>
        )}
        {analyzeProgress && (
          <StateBanner
            tone="info"
            title="分析進行中"
            description={analyzeProgress}
          />
        )}
        {analyzeError && (
          <StateBanner
            tone="error"
            title="無法完成分析"
            description={analyzeError}
          />
        )}
        {analyzeResults.length > 0 && (
          <div className="space-y-3">
            {(() => {
              const bankResults = analyzeResults.filter(
                (r) => r.docKind === "bank",
              );
              const bankOk = bankResults.filter(
                (r) => r.ok && r.bankExtract,
              );
              const bankFail = bankResults.filter((r) => !r.ok);
              const brief =
                bankOk.length > 0
                  ? mergeBankStatementExtracts(
                      bankOk.map((r) => r.bankExtract!),
                    )
                  : null;
              const brResult = analyzeResults.find(
                (r) => r.docKind === "br" && r.ok && r.brExtract,
              );
              const brFail = analyzeResults.find(
                (r) => r.docKind === "br" && !r.ok,
              );
              const auditedResults = analyzeResults.filter(
                (r) => r.docKind === "audited",
              );
              const auditedOk = auditedResults.filter(
                (r) => r.ok && r.auditedExtract,
              );
              const auditedFail = auditedResults.filter((r) => !r.ok);
              const auditedMerged =
                auditedOk.length > 0
                  ? mergeAuditedExtracts(
                      auditedOk.map((r) => r.auditedExtract!),
                    )
                  : null;

              return (
                <>
                  <Card>
                    <SectionHeader
                      title="商業登記證（BR）"
                      subtitle="中／英文名 · 登記號碼 · 地址 · 性質 · 生效／屆滿"
                    />
                    {brFail && (
                      <div className="mb-3">
                        <StateBanner
                          tone="error"
                          title="BR 分析失敗"
                          description={
                            brFail.message || "請重試或改上清晰 JPG"
                          }
                        />
                        <ReuploadAnalyzeButton
                          accept="application/pdf,.pdf,image/jpeg,.jpg,.jpeg,image/png,.png"
                          disabled={analyzing}
                          onPick={(file) =>
                            reuploadAndAnalyze({
                              docKind: "br",
                              file,
                              label: "商業登記證 BR",
                              slotKey: brFail.slotKey || "br",
                            })
                          }
                        />
                      </div>
                    )}
                    {brResult?.brExtract ? (
                      <>
                        {brResult.extractHint && (
                          <p className="mb-3 rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-900">
                            {brResult.extractHint}
                          </p>
                        )}
                        <BrExtractPanel br={brResult.brExtract} />
                      </>
                    ) : (
                      !brFail && (
                        <p className="text-sm text-text-muted">尚未取得 BR 資料。</p>
                      )
                    )}
                  </Card>
                  <Card>
                    <SectionHeader
                      title="Audited Report"
                      subtitle="4.1 報告基本資料 · 4.2 三年營業額／除稅前溢利／淨利潤"
                    />
                    {auditedFail.length > 0 && (
                      <div className="mb-3 space-y-3">
                        {auditedFail.map((fail) => (
                          <div key={fail.slotKey || fail.label}>
                            <StateBanner
                              tone="error"
                              title={`${fail.label} 分析失敗`}
                              description={
                                fail.message ||
                                "請上完整核數師報告／損益表 PDF"
                              }
                            />
                            <ReuploadAnalyzeButton
                              accept="application/pdf,.pdf,image/jpeg,.jpg,.jpeg,image/png,.png"
                              disabled={analyzing}
                              onPick={(file) =>
                                reuploadAndAnalyze({
                                  docKind: "audited",
                                  file,
                                  label: fail.label,
                                  slotKey: fail.slotKey,
                                  auditedIndex: fail.auditedIndex,
                                })
                              }
                            />
                          </div>
                        ))}
                      </div>
                    )}
                    {auditedMerged ? (
                      <>
                        {auditedOk[0]?.extractHint && (
                          <p className="mb-3 rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-900">
                            {auditedOk[0].extractHint}
                          </p>
                        )}
                        <AuditedExtractPanel a={auditedMerged} />
                      </>
                    ) : (
                      auditedFail.length === 0 && (
                        <p className="text-sm text-text-muted">
                          尚未取得 Audited Report 資料。
                        </p>
                      )
                    )}
                  </Card>
                  <Card>
                    <SectionHeader
                      title="六個月銀行現金流預審"
                      subtitle={
                        bankResults.length
                          ? `成功 ${bankOk.length}／${bankResults.length} 份月結`
                          : "尚未分析銀行月結"
                      }
                    />
                    {bankFail.length > 0 && (
                      <div className="mb-3 space-y-3">
                        <StateBanner
                          tone="error"
                          title={`${bankFail.length} 份月結分析失敗`}
                          description="可喺各失敗項旁邊重新上載及分析。"
                        />
                        {bankFail.map((fail) => (
                          <div
                            key={fail.slotKey || fail.label}
                            className="rounded-xl border border-danger-600/20 bg-danger-100/30 px-3 py-2"
                          >
                            <p className="text-sm font-medium text-navy-900">
                              {fail.label}
                            </p>
                            <p className="mt-0.5 text-xs text-danger-600">
                              {fail.message || "失敗"}
                            </p>
                            <ReuploadAnalyzeButton
                              accept="application/pdf,.pdf"
                              pdfOnly
                              disabled={analyzing || !fail.statementMonth}
                              onPick={(file) =>
                                reuploadAndAnalyze({
                                  docKind: "bank",
                                  file,
                                  label: fail.label,
                                  slotKey: fail.slotKey,
                                  statementMonth: fail.statementMonth,
                                })
                              }
                            />
                          </div>
                        ))}
                      </div>
                    )}
                    {brief ? (
                      <BankCashflowBriefPanel brief={brief} />
                    ) : (
                      <p className="text-sm text-danger-600">
                        未取得銀行現金流資料。請查看各月結單錯誤訊息後重試。
                      </p>
                    )}
                  </Card>
                </>
              );
            })()}

            {analyzeResults.map((r) => (
              <Card key={r.slotKey || `${r.label}-${r.fileName}`} className="bg-surface-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-xs text-text-muted">{r.label}</p>
                    <p className="mt-0.5 truncate text-sm font-semibold text-navy-900">
                      {r.fileName}
                    </p>
                  </div>
                  {!r.ok && (
                    <span className="shrink-0 rounded-full bg-danger-100 px-2 py-0.5 text-[10px] font-medium text-danger-600">
                      讀取失敗
                    </span>
                  )}
                </div>
                {!r.ok ? (
                  <div className="mt-2">
                    <p className="text-sm text-danger-600">
                      {r.message || "失敗"}
                    </p>
                    {(r.docKind === "br" ||
                      r.docKind === "audited" ||
                      r.docKind === "bank") && (
                      <ReuploadAnalyzeButton
                        accept={
                          r.docKind === "bank"
                            ? "application/pdf,.pdf"
                            : "application/pdf,.pdf,image/jpeg,.jpg,.jpeg,image/png,.png"
                        }
                        pdfOnly={r.docKind === "bank"}
                        disabled={analyzing}
                        onPick={(file) =>
                          reuploadAndAnalyze({
                            docKind: r.docKind as "br" | "audited" | "bank",
                            file,
                            label: r.label,
                            slotKey: r.slotKey,
                            statementMonth: r.statementMonth,
                            auditedIndex: r.auditedIndex,
                          })
                        }
                      />
                    )}
                  </div>
                ) : r.brExtract ? (
                  <div className="mt-3 space-y-2">
                    {r.extractHint && (
                      <p className="rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-900">
                        {r.extractHint}
                      </p>
                    )}
                    <BrExtractPanel br={r.brExtract} />
                  </div>
                ) : r.auditedExtract ? (
                  <div className="mt-3 space-y-2">
                    {r.extractHint && (
                      <p className="rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-900">
                        {r.extractHint}
                      </p>
                    )}
                    <AuditedExtractPanel a={r.auditedExtract} />
                  </div>
                ) : r.bankExtract ? (
                  <div className="mt-3 space-y-2 text-sm">
                    {r.extractHint && (
                      <p className="rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-900">
                        {r.extractHint}
                      </p>
                    )}
                    <dl className="space-y-1">
                      <div className="flex justify-between gap-2">
                        <dt className="text-text-secondary">月份／銀行</dt>
                        <dd>
                          {r.bankExtract.month ?? "—"} ·{" "}
                          {r.bankExtract.bank_name ?? "—"}
                        </dd>
                      </div>
                      <div className="flex justify-between gap-2">
                        <dt className="text-text-secondary">開／收結餘</dt>
                        <dd className="tabular">
                          {formatHkd(r.bankExtract.opening_balance)} /{" "}
                          {formatHkd(r.bankExtract.closing_balance)}
                        </dd>
                      </div>
                      <div className="flex justify-between gap-2">
                        <dt className="text-text-secondary">存入／營業進帳</dt>
                        <dd className="tabular">
                          {formatHkd(r.bankExtract.total_credits)} /{" "}
                          {formatHkd(r.bankExtract.operating_credits)}
                        </dd>
                      </div>
                      <div className="flex justify-between gap-2">
                        <dt className="text-text-secondary">淨現金流</dt>
                        <dd className="tabular">
                          {formatHkd(r.bankExtract.net_cashflow)}
                        </dd>
                      </div>
                      <div className="flex justify-between gap-2">
                        <dt className="text-text-secondary">異常／還款能力</dt>
                        <dd>
                          {r.bankExtract.anomalies?.length ?? 0} 項 ·{" "}
                          {assessmentLabel(
                            r.bankExtract.repayment_capacity?.assessment
                              ? String(
                                  r.bankExtract.repayment_capacity.assessment,
                                )
                              : null,
                          )}
                        </dd>
                      </div>
                    </dl>
                    {r.bankExtract.cashflow_summary && (
                      <p className="text-xs text-text-secondary">
                        {r.bankExtract.cashflow_summary}
                      </p>
                    )}
                  </div>
                ) : r.extract ? (
                  <div className="mt-3 space-y-3">
                    {r.extractHint && (
                      <p className="rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-900">
                        {r.extractHint}
                      </p>
                    )}
                    <dl className="space-y-2 text-sm">
                      <div className="flex justify-between gap-2">
                        <dt className="text-text-secondary">公司名稱</dt>
                        <dd className="font-medium text-navy-900">
                          {r.extract.company_name ?? "—"}
                        </dd>
                      </div>
                      <div className="flex justify-between gap-2">
                        <dt className="text-text-secondary">營業額</dt>
                        <dd className="tabular font-medium">
                          {money(r.extract.revenue)}
                        </dd>
                      </div>
                    </dl>
                  </div>
                ) : (
                  <p className="mt-2 text-sm text-text-secondary">已完成讀取</p>
                )}
              </Card>
            ))}
            <Disclaimer>
              AI
              結果只供初步參考，不作貸款批核或利率承諾；最終由合作機構決定。銀行淨現金流／ADB
              等衍生指標由系統公式重算（唔用 AI 估數）；缺欄＝文件未見，唔等於讀取失敗。
            </Disclaimer>
          </div>
        )}
      </Card>

      <Disclaimer>
        上載檔案僅用於本申請之初步文件檢查及配對。本頁不顯示最終批核結果或保證利率。
      </Disclaimer>
    </div>
  );
}

/** 摘要用：列出已上載檔名 */
export function summarizeApplyDocs(docs: ApplyDocsState, months: string[]) {
  const bankNames = months
    .map((m) => docs.bank[m]?.name)
    .filter(Boolean) as string[];
  return {
    br: docs.br?.name ?? null,
    audited: docs.audited.map((f) => f.name),
    identity: docs.identity.map((f) => f.name),
    companyOther: docs.companyOther.map((f) => f.name),
    bankCount: bankNames.length,
    bankNames,
  };
}
