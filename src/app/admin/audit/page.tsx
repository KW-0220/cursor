"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AuditedExtractPanel,
  BankCashflowBriefPanel,
  BrExtractPanel,
  IdentityExtractPanel,
  assessmentLabel,
} from "@/components/app/document-extract-panels";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/field";
import {
  Card,
  EmptyState,
  SectionHeader,
  StateBanner,
} from "@/components/ui/layout";
import type { ApplicationAiAnalysis } from "@/lib/ai-application-decision";
import {
  clientAppStatusLabel,
  clientAppStatusTone,
  normalizeClientAppStatus,
} from "@/lib/application-status";
import { toAuditedExtract } from "@/lib/audited-report-extract";
import {
  mergeBankStatementExtracts,
  toBankStatementExtract,
} from "@/lib/bank-statement-extract";
import { toBrExtract } from "@/lib/br-extract";
import { toIdentityExtract } from "@/lib/identity-extract";
import { cn, formatDateTime, formatHKD } from "@/lib/utils";

type AppRow = {
  id: string;
  loanType: "secured" | "unsecured" | null;
  amount: number;
  purpose: string;
  status: string;
  failureReason?: string | null;
  companyNameZh?: string | null;
  applicantNameZh?: string | null;
  email?: string | null;
  aiAnalysis?: ApplicationAiAnalysis | null;
  updatedAt: string;
  createdAt: string;
};

type ArchiveListItem = {
  id: string;
  title: string;
  fileName: string | null;
  docKind: string;
  companyName: string | null;
  summary: string | null;
  overall: string | null;
  notes: string | null;
  archivedBy: string | null;
  archivedAt: string;
};

type ArchivePayload = Record<string, unknown> & {
  docKind?: string;
  extractHint?: string | null;
  bankExtract?: unknown;
  brExtract?: unknown;
  auditedExtract?: unknown;
  identityExtract?: unknown;
  personRole?: string | null;
  fileName?: string;
  analysis?: { summary?: string; overall?: string };
};

function overallLabel(o: string | null | undefined) {
  if (o === "adequate") return "尚可";
  if (o === "tight") return "偏緊";
  if (o === "weak") return "偏弱";
  return "未知";
}

function money(n: number | null | undefined) {
  if (n == null || !Number.isFinite(n)) return "—";
  return formatHKD(n);
}

function ArchiveResultBody({ payload }: { payload: ArchivePayload }) {
  const kind = String(payload.docKind || "");
  const hint =
    typeof payload.extractHint === "string" ? payload.extractHint : null;

  if (kind === "br" && payload.brExtract) {
    return (
      <div className="space-y-2">
        {hint && (
          <StateBanner tone="info" title="抽取提示" description={hint} />
        )}
        <BrExtractPanel br={toBrExtract(payload.brExtract as never)} />
      </div>
    );
  }
  if (kind === "audited" && payload.auditedExtract) {
    return (
      <div className="space-y-2">
        {hint && (
          <StateBanner tone="info" title="抽取提示" description={hint} />
        )}
        <AuditedExtractPanel a={toAuditedExtract(payload.auditedExtract)} />
      </div>
    );
  }
  if (kind === "bank" && payload.bankExtract) {
    const brief = mergeBankStatementExtracts([
      toBankStatementExtract(payload.bankExtract),
    ]);
    return (
      <div className="space-y-2">
        {hint && (
          <StateBanner tone="info" title="抽取提示" description={hint} />
        )}
        <BankCashflowBriefPanel brief={brief} />
      </div>
    );
  }
  if (kind === "identity" && payload.identityExtract) {
    return (
      <div className="space-y-2">
        {hint && (
          <StateBanner tone="info" title="抽取提示" description={hint} />
        )}
        <IdentityExtractPanel
          identity={toIdentityExtract(payload.identityExtract)}
          personRole={
            typeof payload.personRole === "string" ? payload.personRole : null
          }
        />
      </div>
    );
  }

  return (
    <StateBanner
      tone="warning"
      title="未有結構化抽取結果"
      description={
        typeof payload.analysis?.summary === "string"
          ? payload.analysis.summary
          : "此歸檔未含 BR／銀行／Audited／身份證明結構化結果。"
      }
    />
  );
}

function ApplicationAiCard({
  app,
  open,
  onToggle,
}: {
  app: AppRow;
  open: boolean;
  onToggle: () => void;
}) {
  const status = normalizeClientAppStatus(app.status);
  const ai = app.aiAnalysis;
  const rejectReason =
    status === "rejected"
      ? app.failureReason || ai?.decisionReason || null
      : null;

  return (
    <li className="rounded-xl border border-border bg-surface-1">
      <button
        type="button"
        className="flex w-full flex-wrap items-start justify-between gap-2 px-3 py-3 text-left"
        onClick={onToggle}
      >
        <div className="min-w-0">
          <p className="font-mono text-xs text-text-muted">{app.id}</p>
          <p className="mt-0.5 font-medium text-navy-900">
            {app.companyNameZh || app.applicantNameZh || app.email || "—"}
          </p>
          <p className="mt-0.5 text-xs text-text-secondary">
            {formatHKD(app.amount)} · {app.purpose}
            {ai?.analyzedAt
              ? ` · 分析於 ${formatDateTime(ai.analyzedAt)}`
              : ""}
          </p>
        </div>
        <div className="text-right">
          <span
            className={cn(
              "inline-flex rounded-full px-2.5 py-1 text-xs font-medium",
              clientAppStatusTone(status),
            )}
          >
            {clientAppStatusLabel(status)}
          </span>
          <p className="mt-1 text-[11px] text-text-muted">
            {open ? "收起" : "展開 AI 結果"}
          </p>
        </div>
      </button>

      {open && (
        <div className="space-y-3 border-t border-border px-3 py-3">
          {!ai ? (
            <p className="text-sm text-text-muted">
              此申請尚未附帶 AI 分析。
            </p>
          ) : (
            <>
              <StateBanner
                tone={
                  status === "approved"
                    ? "success"
                    : status === "rejected"
                      ? "error"
                      : "warning"
                }
                title={
                  status === "approved"
                    ? "AI 建議：批核"
                    : status === "rejected"
                      ? "AI 建議：拒絕"
                      : "AI 建議：繼續審批／覆核"
                }
                description={ai.summary}
              />
              {rejectReason && (
                <p className="text-xs text-danger-600">
                  拒絕原因：{rejectReason}
                </p>
              )}

              <div className="grid gap-3 md:grid-cols-3">
                <div className="rounded-lg bg-surface-2 px-3 py-2">
                  <p className="text-xs font-semibold text-navy-900">
                    銀行月結
                  </p>
                  <p className="mt-1 text-xs text-text-secondary">
                    {ai.bank.analyzed
                      ? `已分析 ${ai.bank.monthsAnalyzed} 個月 · 還款能力 ${overallLabel(ai.bank.overall)}`
                      : "未分析"}
                  </p>
                  {ai.bank.narrative && (
                    <p className="mt-1 text-xs text-text-muted">
                      {ai.bank.narrative}
                    </p>
                  )}
                  <dl className="mt-2 space-y-1 text-xs">
                    <div className="flex justify-between gap-2">
                      <dt className="text-text-muted">月均營運進帳</dt>
                      <dd className="tabular">
                        {money(ai.bank.monthlyAvgOperating)}
                      </dd>
                    </div>
                    <div className="flex justify-between gap-2">
                      <dt className="text-text-muted">六個月淨現金流</dt>
                      <dd className="tabular">{money(ai.bank.sixMonthNet)}</dd>
                    </div>
                    <div className="flex justify-between gap-2">
                      <dt className="text-text-muted">六個月平均日結</dt>
                      <dd className="tabular">
                        {money(ai.bank.sixMonthAvgDaily)}
                      </dd>
                    </div>
                  </dl>
                </div>

                <div className="rounded-lg bg-surface-2 px-3 py-2">
                  <p className="text-xs font-semibold text-navy-900">
                    商業登記證
                  </p>
                  {ai.businessRegistration.analyzed ? (
                    <dl className="mt-2 space-y-1 text-xs">
                      {(
                        [
                          ["中文名", ai.businessRegistration.companyNameZh],
                          ["英文名", ai.businessRegistration.companyNameEn],
                          ["BR 號碼", ai.businessRegistration.brNumber],
                          ["業務性質", ai.businessRegistration.businessNature],
                          ["地址", ai.businessRegistration.businessAddress],
                          ["生效", ai.businessRegistration.effectiveDate],
                          ["屆滿", ai.businessRegistration.expiryDate],
                        ] as [string, string | null][]
                      ).map(([label, value]) => (
                        <div key={label} className="flex justify-between gap-2">
                          <dt className="shrink-0 text-text-muted">{label}</dt>
                          <dd className="text-right text-navy-900">
                            {value?.trim() || "—"}
                          </dd>
                        </div>
                      ))}
                    </dl>
                  ) : (
                    <p className="mt-1 text-xs text-text-muted">
                      {ai.businessRegistration.error || "未分析"}
                    </p>
                  )}
                </div>

                <div className="rounded-lg bg-surface-2 px-3 py-2">
                  <p className="text-xs font-semibold text-navy-900">
                    經審計報表
                  </p>
                  {ai.auditedAccounts.analyzed ? (
                    <>
                      <dl className="mt-2 space-y-1 text-xs">
                        {(
                          [
                            ["公司", ai.auditedAccounts.companyName],
                            ["年結", ai.auditedAccounts.yearEndDate],
                            ["核數師", ai.auditedAccounts.auditorName],
                            ["意見", ai.auditedAccounts.auditOpinionType],
                          ] as [string, string | null][]
                        ).map(([label, value]) => (
                          <div
                            key={label}
                            className="flex justify-between gap-2"
                          >
                            <dt className="shrink-0 text-text-muted">
                              {label}
                            </dt>
                            <dd className="text-right text-navy-900">
                              {value?.trim() || "—"}
                            </dd>
                          </div>
                        ))}
                      </dl>
                      {ai.auditedAccounts.years.length > 0 && (
                        <ul className="mt-2 space-y-1 border-t border-border/60 pt-2 text-xs">
                          {ai.auditedAccounts.years.map((y, i) => (
                            <li key={`${y.financialYear}-${i}`}>
                              <span className="font-medium text-navy-900">
                                {y.financialYear || `年度${i + 1}`}
                              </span>
                              <span className="text-text-muted">
                                {" "}
                                · 營業額 {money(y.revenue)} · 淨利{" "}
                                {money(y.netProfit)}
                              </span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </>
                  ) : (
                    <p className="mt-1 text-xs text-text-muted">
                      {ai.auditedAccounts.error || "未分析"}
                    </p>
                  )}
                </div>
              </div>

              {ai.suitability && (
                <div className="rounded-lg border border-border/70 px-3 py-2 text-xs">
                  <p className="font-semibold text-navy-900">
                    初步適合度：{ai.suitability.status}
                  </p>
                  <p className="mt-1 text-text-secondary">
                    {ai.suitability.message}
                  </p>
                </div>
              )}

              <p className="text-[11px] text-text-muted">
                文件檢查：銀行{" "}
                {ai.documentChecks.bankOk ? "通過" : "未通過"}
                {ai.documentChecks.bankFailCount
                  ? `（失敗 ${ai.documentChecks.bankFailCount}）`
                  : ""}{" "}
                · BR {ai.documentChecks.brOk ? "通過" : "未通過"} · Audited{" "}
                {ai.documentChecks.auditedOk ? "通過" : "未通過"}
                {ai.documentChecks.auditedFailCount
                  ? `（失敗 ${ai.documentChecks.auditedFailCount}）`
                  : ""}
              </p>
            </>
          )}
          <Link
            href="/admin/customers"
            className="inline-block text-xs font-medium text-teal-700 hover:underline"
          >
            在客戶登記查看詳情 →
          </Link>
        </div>
      )}
    </li>
  );
}

export default function AuditPage() {
  const [tab, setTab] = useState<"applications" | "archive">("archive");
  const [apps, setApps] = useState<AppRow[]>([]);
  const [archives, setArchives] = useState<ArchiveListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [expandedApp, setExpandedApp] = useState<string | null>(null);
  const [expandedArchive, setExpandedArchive] = useState<string | null>(null);
  const [archiveDetail, setArchiveDetail] = useState<ArchivePayload | null>(
    null,
  );
  const [archiveDetailLoading, setArchiveDetailLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [appsRes, archiveRes] = await Promise.all([
        fetch("/api/applications", { cache: "no-store" }),
        fetch("/api/admin/analysis-archive", { cache: "no-store" }),
      ]);
      const appsData = await appsRes.json();
      const archiveData = await archiveRes.json();
      if (!appsRes.ok) {
        throw new Error(appsData.error || "載入申請失敗");
      }
      setApps(appsData.applications ?? []);
      if (archiveRes.ok) {
        setArchives(archiveData.items ?? []);
      } else {
        // archive 可能未登入／權限；唔阻申請 AI 結果
        setArchives([]);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "載入失敗");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const appsWithAi = useMemo(() => {
    const list = apps.filter((a) => a.aiAnalysis);
    const s = q.trim().toLowerCase();
    if (!s) return list;
    return list.filter((a) =>
      [
        a.id,
        a.companyNameZh,
        a.applicantNameZh,
        a.email,
        a.purpose,
        a.aiAnalysis?.summary,
        a.status,
      ]
        .join(" ")
        .toLowerCase()
        .includes(s),
    );
  }, [apps, q]);

  const filteredArchives = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return archives;
    return archives.filter((a) =>
      [a.title, a.fileName, a.companyName, a.summary, a.docKind, a.id]
        .join(" ")
        .toLowerCase()
        .includes(s),
    );
  }, [archives, q]);

  async function openArchive(id: string) {
    if (expandedArchive === id) {
      setExpandedArchive(null);
      setArchiveDetail(null);
      return;
    }
    setExpandedArchive(id);
    setArchiveDetail(null);
    setArchiveDetailLoading(true);
    try {
      const res = await fetch(
        `/api/admin/analysis-archive?id=${encodeURIComponent(id)}`,
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || data.error || "讀取失敗");
      setArchiveDetail((data.item?.payload ?? null) as ArchivePayload | null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "讀取歸檔失敗");
    } finally {
      setArchiveDetailLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-navy-900">審計紀錄</h1>
          <p className="mt-1 text-sm text-text-secondary">
            AI 文件分析完成後會自動歸檔至此 · 亦可查看申請決策快照
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => void load()}>
          重新整理
        </Button>
      </div>

      {error && (
        <StateBanner tone="error" title="錯誤" description={error} />
      )}

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setTab("archive")}
          className={cn(
            "rounded-full px-3 py-1.5 text-xs font-medium",
            tab === "archive"
              ? "bg-teal-100 text-teal-700"
              : "bg-surface-2 text-text-secondary",
          )}
        >
          文件分析歸檔（{archives.length}）
        </button>
        <button
          type="button"
          onClick={() => setTab("applications")}
          className={cn(
            "rounded-full px-3 py-1.5 text-xs font-medium",
            tab === "applications"
              ? "bg-teal-100 text-teal-700"
              : "bg-surface-2 text-text-secondary",
          )}
        >
          申請 AI 分析（{apps.filter((a) => a.aiAnalysis).length}）
        </button>
      </div>

      <Card className="space-y-3">
        <SectionHeader
          title={tab === "archive" ? "AI 文件分析歸檔" : "申請 AI 分析結果"}
          subtitle={
            tab === "archive"
              ? "後台「AI 文件分析」完成後自動寫入；點展開查看完整抽取結果"
              : "客戶提交申請時寫入的 AI 決策／BR／銀行／Audited 快照"
          }
        />
        <Input
          placeholder="搜尋申請編號／公司／摘要…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />

        {loading ? (
          <p className="text-sm text-text-muted">載入中…</p>
        ) : tab === "archive" ? (
          filteredArchives.length === 0 ? (
            <EmptyState
              title="暫無文件分析歸檔"
              description="請到「AI 文件分析」上載並執行分析；完成後會自動出現在此（無需再按歸檔）。"
            />
          ) : (
            <ul className="space-y-3">
              {filteredArchives.map((a) => {
                const open = expandedArchive === a.id;
                return (
                  <li
                    key={a.id}
                    className="rounded-xl border border-border bg-surface-1"
                  >
                    <button
                      type="button"
                      className="flex w-full flex-wrap items-start justify-between gap-2 px-3 py-3 text-left"
                      onClick={() => void openArchive(a.id)}
                    >
                      <div className="min-w-0">
                        <p className="font-medium text-navy-900">{a.title}</p>
                        <p className="mt-0.5 text-xs text-text-secondary">
                          {a.docKind} · {a.companyName || "—"}
                          {a.overall
                            ? ` · ${assessmentLabel(a.overall)}`
                            : ""}
                        </p>
                        {a.summary && (
                          <p className="mt-1 line-clamp-2 text-xs text-text-muted">
                            {a.summary}
                          </p>
                        )}
                      </div>
                      <div className="text-right text-[11px] text-text-muted">
                        <p>{formatDateTime(a.archivedAt)}</p>
                        <p>{a.archivedBy || "—"}</p>
                        <p className="mt-1">{open ? "收起" : "展開結果"}</p>
                      </div>
                    </button>
                    {open && (
                      <div className="border-t border-border px-3 py-3">
                        {archiveDetailLoading ? (
                          <p className="text-sm text-text-muted">載入詳情…</p>
                        ) : archiveDetail ? (
                          <ArchiveResultBody payload={archiveDetail} />
                        ) : (
                          <p className="text-sm text-text-muted">
                            未能載入歸檔詳情。
                          </p>
                        )}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )
        ) : appsWithAi.length === 0 ? (
            <EmptyState
              title="暫無申請 AI 分析結果"
              description={
                apps.length === 0
                  ? "尚未有申請案件。"
                  : "現有申請未附帶 AI 分析快照；客戶完成文件分析並提交後會出現在此。後台文件分析結果請看「文件分析歸檔」。"
              }
            />
          ) : (
            <ul className="space-y-3">
              {appsWithAi.map((app) => (
                <ApplicationAiCard
                  key={app.id}
                  app={app}
                  open={expandedApp === app.id}
                  onToggle={() =>
                    setExpandedApp((prev) =>
                      prev === app.id ? null : app.id,
                    )
                  }
                />
              ))}
            </ul>
          )}
      </Card>

      <SectionHeader
        title="相關入口"
        subtitle="AI 文件分析 · 客戶登記 · 案件總覽"
      />
      <div className="flex flex-wrap gap-2 text-sm">
        <Link
          href="/admin/ai-analyze"
          className="rounded-full bg-surface-2 px-3 py-1.5 text-teal-700 hover:bg-teal-100"
        >
          AI 文件分析
        </Link>
        <Link
          href="/admin/customers"
          className="rounded-full bg-surface-2 px-3 py-1.5 text-teal-700 hover:bg-teal-100"
        >
          客戶登記資料庫
        </Link>
        <Link
          href="/admin"
          className="rounded-full bg-surface-2 px-3 py-1.5 text-teal-700 hover:bg-teal-100"
        >
          案件總覽
        </Link>
      </div>
    </div>
  );
}
