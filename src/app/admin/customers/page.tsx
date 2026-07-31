"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Download, FileText, RefreshCw, Search, Trash2 } from "lucide-react";
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
  Disclaimer,
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

type CustomerDoc = {
  id: string;
  kind: string;
  kindLabel: string;
  slot: string;
  fileName: string;
  mimeType: string;
  size: number;
  applicationId: string;
  createdAt: string;
  downloadUrl: string;
  source?: "registry" | "application" | "archive";
  archiveId?: string;
  summary?: string | null;
  overall?: string | null;
  payload?: Record<string, unknown>;
};

type CustomerApp = {
  id: string;
  status: string;
  failureReason?: string | null;
  amount: number;
  purpose: string;
  loanType: "secured" | "unsecured" | null;
  aiAnalysis?: ApplicationAiAnalysis | null;
  updatedAt: string;
  createdAt: string;
};

type CustomerAnalysis = {
  id: string;
  title: string;
  fileName: string | null;
  docKind: string;
  companyName: string | null;
  summary: string | null;
  overall: string | null;
  archivedAt: string;
  archivedBy: string | null;
  payload: Record<string, unknown>;
};

type Customer = {
  id: string;
  applicantNameZh: string;
  applicantNameEn: string;
  idNumber: string;
  phone: string;
  email: string;
  title: string;
  relation: string;
  companyNameZh: string;
  companyNameEn: string;
  brNumber: string;
  crNumber: string;
  foundedAt: string;
  companyType: string;
  industry: string;
  address: string;
  employees: number;
  website?: string | null;
  contactPerson: string;
  source?: string;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
  documents?: CustomerDoc[];
  documentCount?: number;
  applicationIds?: string[];
  applications?: CustomerApp[];
  analyses?: CustomerAnalysis[];
};

function maskId(v: string) {
  if (v.length < 5) return v;
  return `${v.slice(0, 1)}***${v.slice(-3)}`;
}

function formatSize(n: number) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

function overallLabel(o?: string | null) {
  if (o === "adequate") return "尚可";
  if (o === "tight") return "偏緊";
  if (o === "weak") return "偏弱";
  return "未知";
}

function formatMoney(n: number | null | undefined) {
  if (n == null || !Number.isFinite(n)) return "—";
  return formatHKD(n);
}

function AiAnalysisBlock({ app }: { app: CustomerApp }) {
  const status = normalizeClientAppStatus(app.status);
  const ai = app.aiAnalysis;
  const rejectReason =
    status === "rejected"
      ? app.failureReason || ai?.decisionReason || "未有提供原因"
      : null;

  return (
    <div className="space-y-3 rounded-xl border border-border bg-surface-1 p-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="font-mono text-xs text-text-muted">{app.id}</p>
          <p className="mt-0.5 text-sm font-medium text-navy-900">
            {formatHKD(app.amount)} · {app.purpose}
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
          {rejectReason && (
            <p className="mt-1 max-w-[260px] text-left text-[11px] text-danger-600 sm:text-right">
              拒絕原因：{rejectReason}
            </p>
          )}
        </div>
      </div>

      {!ai ? (
        <p className="text-sm text-text-muted">
          此申請尚未附帶 AI 分析（舊案件或未執行文件分析）。
        </p>
      ) : (
        <div className="space-y-3 text-sm">
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

          <div className="grid gap-3 md:grid-cols-3">
            <div className="rounded-lg bg-surface-2 px-3 py-2">
              <p className="text-xs font-semibold text-navy-900">銀行月結</p>
              <p className="mt-1 text-xs text-text-secondary">
                {ai.bank.analyzed
                  ? `已分析 ${ai.bank.monthsAnalyzed} 個月 · 還款能力 ${overallLabel(ai.bank.overall)}`
                  : "未分析"}
              </p>
              {ai.bank.narrative && (
                <p className="mt-1 text-xs text-text-muted">{ai.bank.narrative}</p>
              )}
              <dl className="mt-2 space-y-1 text-xs">
                <div className="flex justify-between gap-2">
                  <dt className="text-text-muted">月均營運進帳</dt>
                  <dd className="tabular">{formatMoney(ai.bank.monthlyAvgOperating)}</dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-text-muted">六個月淨現金流</dt>
                  <dd className="tabular">{formatMoney(ai.bank.sixMonthNet)}</dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-text-muted">六個月平均日結</dt>
                  <dd className="tabular">{formatMoney(ai.bank.sixMonthAvgDaily)}</dd>
                </div>
              </dl>
            </div>

            <div className="rounded-lg bg-surface-2 px-3 py-2">
              <p className="text-xs font-semibold text-navy-900">商業登記證</p>
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
              <p className="text-xs font-semibold text-navy-900">經審計報表</p>
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
                      <div key={label} className="flex justify-between gap-2">
                        <dt className="shrink-0 text-text-muted">{label}</dt>
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
                            · 營業額 {formatMoney(y.revenue)} · 淨利{" "}
                            {formatMoney(y.netProfit)}
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
              <p className="mt-1 text-text-secondary">{ai.suitability.message}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ArchiveExtractBody({
  payload,
}: {
  payload: Record<string, unknown>;
}) {
  const kind = String(payload.docKind || "");
  if (kind === "br" && payload.brExtract) {
    return <BrExtractPanel br={toBrExtract(payload.brExtract as never)} />;
  }
  if (kind === "audited" && payload.auditedExtract) {
    return <AuditedExtractPanel a={toAuditedExtract(payload.auditedExtract)} />;
  }
  if (kind === "bank" && payload.bankExtract) {
    const brief = mergeBankStatementExtracts([
      toBankStatementExtract(payload.bankExtract),
    ]);
    return <BankCashflowBriefPanel brief={brief} />;
  }
  if (kind === "identity" && payload.identityExtract) {
    return (
      <IdentityExtractPanel
        identity={toIdentityExtract(payload.identityExtract)}
        personRole={
          typeof payload.personRole === "string" ? payload.personRole : null
        }
      />
    );
  }
  return (
    <p className="text-xs text-text-muted">
      {typeof payload.analysis === "object" &&
      payload.analysis &&
      typeof (payload.analysis as { summary?: unknown }).summary === "string"
        ? String((payload.analysis as { summary: string }).summary)
        : "未有結構化抽取結果"}
    </p>
  );
}

function ArchiveAnalysisBlock({
  item,
  open,
  onToggle,
}: {
  item: CustomerAnalysis;
  open: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="rounded-xl border border-border bg-surface-1">
      <button
        type="button"
        className="flex w-full flex-wrap items-start justify-between gap-2 px-3 py-3 text-left"
        onClick={onToggle}
      >
        <div className="min-w-0">
          <p className="font-medium text-navy-900">{item.title}</p>
          <p className="mt-0.5 text-xs text-text-secondary">
            {item.docKind}
            {item.overall ? ` · ${assessmentLabel(item.overall)}` : ""}
            {item.fileName ? ` · ${item.fileName}` : ""}
          </p>
          {item.summary && (
            <p className="mt-1 line-clamp-2 text-xs text-text-muted">
              {item.summary}
            </p>
          )}
        </div>
        <div className="text-right text-[11px] text-text-muted">
          <p>{formatDateTime(item.archivedAt)}</p>
          <p>{open ? "收起抽取" : "展開抽取"}</p>
        </div>
      </button>
      {open && (
        <div className="border-t border-border px-3 py-3">
          <ArchiveExtractBody payload={item.payload || {}} />
        </div>
      )}
    </div>
  );
}

export default function AdminCustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [storageNote, setStorageNote] = useState("");
  const [storage, setStorage] = useState("");
  const [durable, setDurable] = useState(false);
  const [collectFrom, setCollectFrom] = useState("");
  const [wiping, setWiping] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [expandedArchive, setExpandedArchive] = useState<string | null>(null);
  const [orphans, setOrphans] = useState<
    Array<{
      id: string;
      purpose: string;
      documentCount: number;
      documents: Array<{ id: string; kind: string; fileName: string; slot: string }>;
    }>
  >([]);
  const [linkTarget, setLinkTarget] = useState<Record<string, string>>({});
  const [linking, setLinking] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [custRes, orphanRes] = await Promise.all([
        fetch("/api/admin/customers"),
        fetch("/api/admin/link-application"),
      ]);
      const data = await custRes.json();
      if (!custRes.ok) throw new Error(data.error || "載入失敗");
      const list = (data.customers ?? []) as Customer[];
      setCustomers(list);
      setStorageNote(data.storageNote ?? data.storage ?? "");
      setStorage(data.storage ?? "");
      setDurable(Boolean(data.durable));
      setCollectFrom(data.collectFrom ?? "POST /api/customers");
      setExpanded((prev) => {
        if (prev) return prev;
        const hash = window.location.hash.replace(/^#/, "");
        if (hash) return hash;
        return list.length === 1 ? list[0]!.id : null;
      });

      if (orphanRes.ok) {
        const o = await orphanRes.json();
        setOrphans(o.orphans ?? []);
      } else {
        setOrphans([]);
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

  async function linkOrphan(applicationId: string) {
    const customerId = linkTarget[applicationId];
    if (!customerId) {
      setError("請先選擇要歸入的客戶");
      return;
    }
    setLinking(applicationId);
    setError(null);
    try {
      const res = await fetch("/api/admin/link-application", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ applicationId, customerId }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || data.error || "歸戶失敗");
      }
      setExpanded(customerId);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "歸戶失敗");
    } finally {
      setLinking(null);
    }
  }

  async function wipeAll() {
    const ok = window.confirm(
      "確定清空客戶登記資料庫？\n所有申請人帳戶會一併刪除，必須重新註冊。\n（管理員 admin@sme.com 會保留）",
    );
    if (!ok) return;
    setWiping(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/customers?users=1", {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || data.error || "清空失敗");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "清空失敗");
    } finally {
      setWiping(false);
    }
  }

  async function deleteOne(c: Customer) {
    const label = c.companyNameZh || c.applicantNameZh || c.id;
    const ok = window.confirm(
      `確定刪除客戶「${label}」？\n\n會一併刪除：\n· 關聯申請與文件\n· 登入帳戶（${c.email || "—"}）\n\n此操作不可復原。`,
    );
    if (!ok) return;
    setDeletingId(c.id);
    setError(null);
    try {
      const res = await fetch("/api/admin/customers?users=1", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: c.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || data.error || "刪除失敗");
      if (expanded === c.id) setExpanded(null);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "刪除失敗");
    } finally {
      setDeletingId(null);
    }
  }

  const filtered = customers.filter((c) => {
    const s = q.trim().toLowerCase();
    if (!s) return true;
    return [
      c.id,
      c.applicantNameZh,
      c.applicantNameEn,
      c.companyNameZh,
      c.companyNameEn,
      c.brNumber,
      c.email,
      c.phone,
      ...(c.applicationIds ?? []),
    ]
      .join(" ")
      .toLowerCase()
      .includes(s);
  });

  return (
    <main className="space-y-6 px-4 py-6 lg:px-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-navy-900">客戶登記資料庫</h1>
          <p className="mt-1 text-sm text-text-secondary">
            登記資料 · 文件 · AI 分析內容 · 批核／拒絕
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => void load()} disabled={loading}>
            <RefreshCw className="mr-1.5 size-4" />
            重新整理
          </Button>
          <Button
            variant="outline"
            onClick={() => void wipeAll()}
            disabled={wiping || loading}
            className="border-red-300 text-red-700 hover:bg-red-50"
          >
            {wiping ? "清空中…" : "清空資料庫（逼重新註冊）"}
          </Button>
          <a href="/api/admin/customers/export">
            <Button>
              <Download className="mr-1.5 size-4" />
              下載 Excel
            </Button>
          </a>
        </div>
      </div>

      {error && (
        <StateBanner tone="error" title="無法載入" description={error} />
      )}

      <StateBanner
        tone={durable ? "success" : "warning"}
        title={
          durable
            ? `已接持久儲存（${storage}）`
            : "尚未接 MySQL／Redis——前端寫入可能喺 Vercel 唔耐久"
        }
        description={`客戶登記：${collectFrom || "POST /api/customers"}。文件於申請提交時上載至 Storage；AI 分析與批核決定一併寫入申請紀錄。${storageNote || ""}`}
      />

      <Card className="flex flex-wrap items-center gap-3">
        <div className="flex min-w-[240px] flex-1 items-center gap-2 rounded-xl border border-border bg-surface-1 px-3">
          <Search className="size-4 text-text-muted" />
          <Input
            className="border-0 bg-transparent px-0 shadow-none focus:ring-0"
            placeholder="搜尋編號／姓名／公司／BR／電郵／申請編號"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        <p className="text-sm text-text-secondary">
          共 <span className="font-semibold text-navy-900">{filtered.length}</span>{" "}
          筆
          {loading ? " · 載入中…" : ""}
        </p>
      </Card>

      <SectionHeader
        title="登記列表"
        subtitle="展開可查看申請批核、AI 文件分析歸檔與已收集文件（按公司名／BR／電郵自動對應）"
      />

      {orphans.length > 0 && (
        <Card className="space-y-3 border-amber-300/80 bg-amber-50/40">
          <SectionHeader
            title={`未歸戶申請文件（${orphans.length}）`}
            subtitle="補件時未綁定客戶——揀客戶後按「歸入」即可喺下方客戶卡見到文件"
          />
          <div className="space-y-3">
            {orphans.map((o) => (
              <div
                key={o.id}
                className="rounded-xl border border-border bg-surface-1 px-3 py-3"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-mono text-xs text-text-muted">{o.id}</p>
                    <p className="mt-0.5 text-sm text-navy-900">
                      {o.purpose} · 文件 {o.documentCount} 份
                    </p>
                    <ul className="mt-1 text-xs text-text-secondary">
                      {o.documents.slice(0, 5).map((d) => (
                        <li key={d.id}>
                          {d.kind} · {d.fileName}
                        </li>
                      ))}
                      {o.documentCount > 5 && (
                        <li>…仲有 {o.documentCount - 5} 份</li>
                      )}
                    </ul>
                  </div>
                  <div className="flex min-w-[220px] flex-col gap-2">
                    <select
                      className="h-10 rounded-xl border border-border bg-surface-1 px-3 text-sm"
                      value={linkTarget[o.id] ?? ""}
                      onChange={(e) =>
                        setLinkTarget((prev) => ({
                          ...prev,
                          [o.id]: e.target.value,
                        }))
                      }
                    >
                      <option value="">選擇客戶…</option>
                      {customers.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.companyNameZh || c.applicantNameZh}（{c.email}）
                        </option>
                      ))}
                    </select>
                    <Button
                      size="sm"
                      disabled={!linkTarget[o.id] || linking === o.id}
                      onClick={() => void linkOrphan(o.id)}
                    >
                      {linking === o.id ? "歸入中…" : "歸入此客戶"}
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      <div className="space-y-3">
        {filtered.map((c) => {
          const open = expanded === c.id;
          const docs = c.documents ?? [];
          const apps = c.applications ?? [];
          const analyses = c.analyses ?? [];
          const latest = apps[0];
          const latestStatus = latest
            ? normalizeClientAppStatus(latest.status)
            : null;
          return (
            <div key={c.id} id={c.id}>
              <Card className="space-y-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <button
                    type="button"
                    className="min-w-0 flex-1 text-left"
                    onClick={() => setExpanded(open ? null : c.id)}
                  >
                    <p className="font-mono text-xs text-text-muted">{c.id}</p>
                    <p className="mt-1 font-semibold text-navy-900">
                      {c.companyNameZh}
                    </p>
                    <p className="text-sm text-text-secondary">
                      {c.applicantNameZh} · {c.relation} · {maskId(c.idNumber)}
                    </p>
                    <p className="mt-1 text-xs text-text-muted">
                      {c.email} · {c.phone} · BR {c.brNumber}
                    </p>
                  </button>
                  <div className="flex shrink-0 flex-col items-end gap-2">
                    <div className="flex flex-wrap items-center justify-end gap-1.5">
                      {latestStatus && (
                        <span
                          className={cn(
                            "inline-flex rounded-full px-2.5 py-1 text-xs font-medium",
                            clientAppStatusTone(latestStatus),
                          )}
                        >
                          {clientAppStatusLabel(latestStatus)}
                        </span>
                      )}
                      {analyses.length > 0 && (
                        <p className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-900">
                          AI {analyses.length}
                        </p>
                      )}
                      <p className="inline-flex items-center gap-1 rounded-full bg-teal-100 px-2.5 py-1 text-xs font-medium text-teal-800">
                        <FileText className="size-3.5" />
                        文件 {c.documentCount ?? docs.length}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center justify-end gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="border-red-300 text-red-700 hover:bg-red-50"
                        disabled={deletingId === c.id || wiping}
                        onClick={(e) => {
                          e.stopPropagation();
                          void deleteOne(c);
                        }}
                      >
                        <Trash2 className="mr-1 size-3.5" />
                        {deletingId === c.id ? "刪除中…" : "刪除"}
                      </Button>
                      <button
                        type="button"
                        className="text-xs text-text-muted hover:text-navy-900"
                        onClick={() => setExpanded(open ? null : c.id)}
                      >
                        {open ? "收起" : "展開分析／文件"}
                      </button>
                    </div>
                  </div>
                </div>

                {open && (
                  <div className="space-y-4 border-t border-border pt-3">
                    <div>
                      <p className="mb-2 text-xs font-medium text-text-muted">
                        AI 分析與批核
                        {apps.length > 0 ? ` · 申請 ${apps.length}` : ""}
                        {analyses.length > 0
                          ? ` · 文件分析 ${analyses.length}`
                          : ""}
                      </p>
                      {apps.length === 0 && analyses.length === 0 ? (
                        <div className="space-y-2 rounded-xl bg-surface-2 px-3 py-3 text-sm text-text-secondary">
                          <p>尚未有申請決策或文件分析結果。</p>
                          <p className="text-xs text-text-muted">
                            客戶提交申請後會顯示批核結果；或到「AI 文件分析」上載並填公司名稱（須與本客戶公司名一致），結果會自動掛到此處。
                          </p>
                          <Link
                            href="/admin/ai-analyze"
                            className="inline-block text-xs font-medium text-teal-700 hover:underline"
                          >
                            前往 AI 文件分析 →
                          </Link>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {apps.map((app) => (
                            <AiAnalysisBlock key={app.id} app={app} />
                          ))}
                          {analyses.map((a) => (
                            <ArchiveAnalysisBlock
                              key={a.id}
                              item={a}
                              open={expandedArchive === a.id}
                              onToggle={() =>
                                setExpandedArchive((prev) =>
                                  prev === a.id ? null : a.id,
                                )
                              }
                            />
                          ))}
                        </div>
                      )}
                    </div>

                    <div>
                      <p className="mb-2 text-xs font-medium text-text-muted">
                        已收集文件（存放於此）
                        {docs.length > 0 ? ` · ${docs.length} 份` : ""}
                        {(c.applicationIds?.length ?? 0) > 0
                          ? ` · 申請 ${c.applicationIds!.join("、")}`
                          : ""}
                      </p>
                      {docs.length === 0 ? (
                        <div className="space-y-2 rounded-xl bg-surface-2 px-3 py-3 text-sm text-text-secondary">
                          <p>尚未有上載／分析文件歸戶到此客戶。</p>
                          <p className="text-xs text-text-muted">
                            申請提交上載的 PDF，或後台 AI 分析（公司名／BR
                            對得上）會顯示於此。
                          </p>
                        </div>
                      ) : (
                        <ul className="space-y-2">
                          {docs.map((d) => (
                            <li
                              key={`${d.source || "doc"}:${d.id}`}
                              className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-surface-2 px-3 py-2 text-sm"
                            >
                              <div>
                                <p className="font-medium text-navy-900">
                                  {d.kindLabel}
                                  <span className="ml-2 text-xs font-normal text-text-muted">
                                    {d.slot}
                                  </span>
                                </p>
                                <p className="text-xs text-text-secondary">
                                  {d.fileName}
                                  {d.size > 0 ? ` · ${formatSize(d.size)}` : ""}
                                  {d.applicationId
                                    ? ` · ${d.applicationId}`
                                    : ""}
                                  {d.source === "archive" ? " · AI 歸檔" : ""}
                                </p>
                                {d.summary && (
                                  <p className="mt-0.5 line-clamp-2 text-xs text-text-muted">
                                    {d.summary}
                                  </p>
                                )}
                              </div>
                              <div className="flex flex-wrap gap-2">
                                {d.source === "archive" ? (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => {
                                      setExpandedArchive(d.archiveId || d.id);
                                    }}
                                  >
                                    查看分析
                                  </Button>
                                ) : d.downloadUrl ? (
                                  <a href={d.downloadUrl}>
                                    <Button size="sm" variant="outline">
                                      <Download className="mr-1 size-3.5" />
                                      下載
                                    </Button>
                                  </a>
                                ) : null}
                              </div>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                )}
              </Card>
            </div>
          );
        })}
        {!loading && filtered.length === 0 && (
          <Card className="py-10 text-center text-sm text-text-muted">
            未有符合的客戶紀錄
          </Card>
        )}
      </div>

      <Disclaimer>
        {storageNote ||
          "客戶資料及上載文件屬敏感個人資料，下載須按角色權限及審計要求處理。"}
      </Disclaimer>
    </main>
  );
}
