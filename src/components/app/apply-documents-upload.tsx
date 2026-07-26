"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import {
  Card,
  Disclaimer,
  SectionHeader,
  StateBanner,
} from "@/components/ui/layout";
import type { FinancialExtract } from "@/lib/financial-extract";
import {
  formatStructuredExtractJson,
  mergeFinancialExtracts,
  toStructuredExtractJson,
} from "@/lib/financial-extract";
import type {
  BankCashflowBrief,
  BankStatementExtract,
} from "@/lib/bank-statement-extract";
import {
  formatHkd,
  mergeBankStatementExtracts,
  toBankStatementExtract,
} from "@/lib/bank-statement-extract";
import { formatHKD } from "@/lib/utils";

export type UploadedMeta = {
  name: string;
  size: number;
  type: string;
  file: File;
};

export type ApplyDocsState = {
  br: UploadedMeta | null;
  nar1: UploadedMeta | null;
  identity: UploadedMeta[];
  companyOther: UploadedMeta[];
  bank: Record<string, UploadedMeta | null>;
};

type AnalyzeItemResult = {
  label: string;
  fileName: string;
  ok: boolean;
  message?: string;
  extract?: FinancialExtract;
  bankExtract?: BankStatementExtract;
  model?: string;
  docKind?: string;
  extractHint?: string | null;
  textPreview?: string;
  statementMonth?: string;
};

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
    nar1: null,
    identity: [],
    companyOther: [],
    bank: Object.fromEntries(months.map((m) => [m, null])),
  };
}

export function isApplyDocsComplete(docs: ApplyDocsState, months: string[]) {
  const bankOk = months.every((m) => docs.bank[m] != null);
  return Boolean(docs.br && docs.nar1 && docs.identity.length > 0 && bankOk);
}

export function applyDocsProgress(docs: ApplyDocsState, months: string[]) {
  const bankFilled = months.filter((m) => docs.bank[m]).length;
  const slots = [
    docs.br ? 1 : 0,
    docs.nar1 ? 1 : 0,
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

function StructuredJsonBlock({
  title,
  extract,
}: {
  title?: string;
  extract: FinancialExtract;
}) {
  const json = formatStructuredExtractJson(extract);
  return (
    <div className="space-y-2">
      {title && (
        <p className="text-xs font-medium text-text-muted">{title}</p>
      )}
      <pre className="overflow-x-auto rounded-xl bg-navy-900 p-3 text-xs leading-relaxed text-teal-100">
        {json}
      </pre>
      <button
        type="button"
        className="text-xs text-teal-700 underline"
        onClick={() => void navigator.clipboard?.writeText(json)}
      >
        複製 JSON
      </button>
    </div>
  );
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

  const [analyzing, setAnalyzing] = useState(false);
  const [analyzeProgress, setAnalyzeProgress] = useState<string | null>(null);
  const [analyzeError, setAnalyzeError] = useState<string | null>(null);
  const [analyzeResults, setAnalyzeResults] = useState<AnalyzeItemResult[]>(
    [],
  );

  async function analyzeOne(
    label: string,
    meta: UploadedMeta,
    docKind: "br" | "nar1" | "bank",
    statementMonth?: string,
  ): Promise<AnalyzeItemResult> {
    const form = new FormData();
    form.set("file", meta.file);
    form.set("docKind", docKind);
    form.set("loanType", loanType);
    form.set("amountHkd", String(amountHkd));
    form.set("purpose", purpose);
    if (statementMonth) form.set("statementMonth", statementMonth);
    if (companyName.trim()) form.set("companyName", companyName.trim());

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
        label,
        fileName: meta.name,
        ok: false,
        message: `${data.message || data.error || "分析失敗"}${detail}`,
      };
    }
    return {
      label,
      fileName: meta.name,
      ok: true,
      extract: toStructuredExtractJson(data.extract),
      bankExtract:
        docKind === "bank"
          ? toBankStatementExtract(data.bankExtract, statementMonth)
          : undefined,
      model: data.model,
      docKind: data.docKind,
      extractHint: data.extractHint,
      textPreview: data.textPreview,
      statementMonth: data.statementMonth ?? statementMonth,
    };
  }

  async function runAiAnalyze() {
    if (!complete) {
      setAnalyzeError("請先完成必須文件（BR、NAR1、身份、6 份銀行月結單 PDF）");
      return;
    }
    setAnalyzing(true);
    setAnalyzeError(null);
    setAnalyzeResults([]);

    // 銀行月結先抽（現金流六大項），BR／NAR1 補公司名
    const bankQueue = months.flatMap((m) => {
      const meta = docs.bank[m];
      return meta
        ? [
            {
              label: `銀行月結單 ${m}`,
              meta,
              docKind: "bank" as const,
              statementMonth: m,
            },
          ]
        : [];
    });
    const otherQueue: {
      label: string;
      meta: UploadedMeta;
      docKind: "br" | "nar1";
      statementMonth?: undefined;
    }[] = [];
    if (docs.nar1) {
      otherQueue.push({ label: "NAR1", meta: docs.nar1, docKind: "nar1" });
    }
    if (docs.br) {
      otherQueue.push({
        label: "商業登記證 BR",
        meta: docs.br,
        docKind: "br",
      });
    }
    const queue = [...bankQueue, ...otherQueue];

    const results: AnalyzeItemResult[] = [];
    try {
      for (let i = 0; i < queue.length; i++) {
        const item = queue[i];
        setAnalyzeProgress(
          `正在分析（${i + 1}／${queue.length}）：${item.label}`,
        );
        results.push(
          await analyzeOne(
            item.label,
            item.meta,
            item.docKind,
            item.statementMonth,
          ),
        );
        setAnalyzeResults([...results]);
      }
      setAnalyzeProgress(null);
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
        description="請上載：① 公司及身份文件 ② 最近六個月銀行月結單（必須 6 份 PDF）③ NAR1 ④ 商業登記證 BR。"
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

      <SectionHeader title="3. NAR1" />
      <SingleUpload
        label="最近期公司註冊處周年申報表 NAR1"
        required
        hint="最近期已提交完整頁面。掃描 PDF 會自動轉頁面影像辨識；若失敗請改上清晰 JPG／PNG。"
        accept="application/pdf,.pdf,image/jpeg,.jpg,.jpeg,image/png,.png"
        value={docs.nar1}
        onChange={(nar1) => onChange({ ...docs, nar1 })}
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
          description="請完成 BR、NAR1、至少一份身份證明，以及 6 份銀行月結單 PDF。"
        />
      )}

      <Card className="space-y-3">
        <SectionHeader
          title="AI 文件分析"
          subtitle="讀取已上載檔案 · 抽取資料／預審，不直接批核"
        />
        <StateBanner
          tone="info"
          title="銀行月結會讀取"
          description="公司現金流、每月／每日戶口結餘、營業進帳、進帳頻率及來源、戶口異常、基本還款能力。BR／NAR1 主要補公司名。"
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
              const merged = mergeFinancialExtracts(
                analyzeResults.filter((r) => r.ok).map((r) => r.extract),
              );
              return (
                <>
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
                      <StateBanner
                        tone="error"
                        title={`${bankFail.length} 份月結分析失敗`}
                        description={bankFail
                          .map((r) => `${r.label}：${r.message || "失敗"}`)
                          .join("；")
                          .slice(0, 400)}
                      />
                    )}
                    {brief ? (
                      <BankCashflowBriefPanel brief={brief} />
                    ) : (
                      <p className="text-sm text-danger-600">
                        未取得銀行現金流資料。下面「company_name／revenue」舊
                        JSON 唔代表月結已讀——請睇各月結單錯誤訊息後重試。
                      </p>
                    )}
                  </Card>
                  <details className="rounded-lg border border-border/60 bg-surface-2 p-3">
                    <summary className="cursor-pointer text-sm font-medium text-navy-900">
                      兼容欄位 JSON（BR／舊格式，非月結主結果）
                    </summary>
                    <p className="mt-2 text-xs text-text-muted">
                      呢個區塊會顯示 company_name／revenue
                      等舊欄位；月結主結果係上面六大項。
                    </p>
                    <div className="mt-2">
                      <StructuredJsonBlock extract={merged} />
                    </div>
                  </details>
                </>
              );
            })()}

            {analyzeResults.map((r) => (
              <Card key={`${r.label}-${r.fileName}`} className="bg-surface-2">
                <p className="text-xs text-text-muted">{r.label}</p>
                <p className="mt-0.5 text-sm font-semibold text-navy-900">
                  {r.fileName}
                </p>
                {!r.ok ? (
                  <p className="mt-2 text-sm text-danger-600">
                    {r.message || "失敗"}
                  </p>
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
                    {r.model && (
                      <p className="pt-1 text-xs text-text-muted">
                        model：{r.model} · bank
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
                    <StructuredJsonBlock
                      title="結構化輸出"
                      extract={r.extract}
                    />
                    <dl className="space-y-2 text-sm">
                      <div className="flex justify-between gap-2">
                        <dt className="text-text-secondary">company_name</dt>
                        <dd className="font-medium text-navy-900">
                          {r.extract.company_name ?? "null"}
                        </dd>
                      </div>
                      <div className="flex justify-between gap-2">
                        <dt className="text-text-secondary">revenue</dt>
                        <dd className="tabular font-medium">
                          {money(r.extract.revenue)}
                        </dd>
                      </div>
                      {r.model && (
                        <p className="pt-1 text-xs text-text-muted">
                          model：{r.model}
                          {r.docKind ? ` · kind：${r.docKind}` : ""}
                        </p>
                      )}
                    </dl>
                  </div>
                ) : (
                  <p className="mt-2 text-sm text-text-secondary">已完成讀取</p>
                )}
              </Card>
            ))}
            <Disclaimer>
              AI
              結果只供初步參考，不作貸款批核或利率承諾；最終由合作機構決定。銀行六大項由
              6 份月結合併；缺欄＝文件未見，唔等於讀取失敗。
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
    nar1: docs.nar1?.name ?? null,
    identity: docs.identity.map((f) => f.name),
    companyOther: docs.companyOther.map((f) => f.name),
    bankCount: bankNames.length,
    bankNames,
  };
}
