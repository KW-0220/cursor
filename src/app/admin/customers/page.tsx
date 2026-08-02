"use client";

import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import {
  Download,
  FileText,
  RefreshCw,
  Search,
  Trash2,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
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
  analysisCount?: number;
  applicationIds?: string[];
  applications?: CustomerApp[];
  analyses?: CustomerAnalysis[];
  latestStatus?: string | null;
  latestAmount?: number | null;
  reportUrl?: string;
};

function formatSize(n: number) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
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

const TABLE_COLS: Array<{ key: string; label: string; sticky?: boolean }> = [
  { key: "id", label: "客戶編號", sticky: true },
  { key: "companyNameZh", label: "公司中文名" },
  { key: "companyNameEn", label: "公司英文名" },
  { key: "brNumber", label: "BR" },
  { key: "crNumber", label: "CR" },
  { key: "applicantNameZh", label: "申請人中文" },
  { key: "applicantNameEn", label: "申請人英文" },
  { key: "idNumber", label: "身分證／護照" },
  { key: "relation", label: "關係" },
  { key: "title", label: "職銜" },
  { key: "email", label: "電郵" },
  { key: "phone", label: "電話" },
  { key: "contactPerson", label: "聯絡人" },
  { key: "foundedAt", label: "成立日期" },
  { key: "companyType", label: "公司類型" },
  { key: "industry", label: "行業" },
  { key: "employees", label: "僱員" },
  { key: "address", label: "地址" },
  { key: "website", label: "網站" },
  { key: "status", label: "最新狀態" },
  { key: "amount", label: "申請金額" },
  { key: "docs", label: "文件" },
  { key: "analyses", label: "分析" },
  { key: "updatedAt", label: "更新" },
  { key: "actions", label: "操作" },
];

export default function AdminCustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [storageNote, setStorageNote] = useState("");
  const [storage, setStorage] = useState("");
  const [durable, setDurable] = useState(false);
  const [wiping, setWiping] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [expandedArchive, setExpandedArchive] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const custRes = await fetch("/api/admin/customers", { cache: "no-store" });
      const data = await custRes.json();
      if (!custRes.ok) throw new Error(data.error || "載入失敗");
      setCustomers((data.customers ?? []) as Customer[]);
      setStorageNote(data.storageNote ?? data.storage ?? "");
      setStorage(data.storage ?? "");
      setDurable(Boolean(data.durable));
    } catch (e) {
      setError(e instanceof Error ? e.message : "載入失敗");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

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
      `確定刪除客戶「${label}」？\n\n會一併刪除關聯申請、文件與登入帳戶。`,
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

  function openReportPdf(c: Customer) {
    const url =
      c.reportUrl ||
      `/api/admin/customers/${encodeURIComponent(c.id)}/report?print=1`;
    window.open(url, "_blank", "noopener,noreferrer");
  }

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return customers;
    return customers.filter((c) =>
      [
        c.id,
        c.applicantNameZh,
        c.applicantNameEn,
        c.companyNameZh,
        c.companyNameEn,
        c.brNumber,
        c.crNumber,
        c.email,
        c.phone,
        c.industry,
        c.address,
        ...(c.applicationIds ?? []),
      ]
        .join(" ")
        .toLowerCase()
        .includes(s),
    );
  }, [customers, q]);

  return (
    <main className="space-y-6 px-4 py-6 lg:px-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-navy-900">客戶登記資料庫</h1>
          <p className="mt-1 text-sm text-text-secondary">
            表格檢視全部登記欄位 · 分析報告 PDF · 上載文件自動歸檔
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
            {wiping ? "清空中…" : "清空資料庫"}
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
            ? `已接持久儲存（${storage}）· 文件／AI 分析按公司名／BR／電郵自動歸戶`
            : "尚未接持久儲存"
        }
        description={storageNote || ""}
      />

      <Card className="flex flex-wrap items-center gap-3">
        <div className="flex min-w-[240px] flex-1 items-center gap-2 rounded-xl border border-border bg-surface-1 px-3">
          <Search className="size-4 text-text-muted" />
          <Input
            className="border-0 bg-transparent px-0 shadow-none focus:ring-0"
            placeholder="搜尋編號／姓名／公司／BR／電郵／行業…"
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
        title="客戶登記表"
        subtitle="橫向捲動可看齊全部欄位；列內可展開文件與分析詳情"
      />

      <div className="overflow-hidden rounded-xl border border-border bg-surface-1">
        <div className="overflow-x-auto">
          <table className="min-w-[2200px] w-full border-collapse text-left text-xs">
            <thead className="bg-surface-2 text-[11px] uppercase tracking-wide text-text-muted">
              <tr>
                {TABLE_COLS.map((col) => (
                  <th
                    key={col.key}
                    className={cn(
                      "whitespace-nowrap border-b border-border px-3 py-2.5 font-semibold",
                      col.sticky &&
                        "sticky left-0 z-10 bg-surface-2 shadow-[1px_0_0_var(--border)]",
                    )}
                  >
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => {
                const open = expanded === c.id;
                const status = c.latestStatus
                  ? normalizeClientAppStatus(c.latestStatus)
                  : null;
                const apps = c.applications ?? [];
                const analyses = c.analyses ?? [];
                const docs = c.documents ?? [];
                return (
                  <Fragment key={c.id}>
                    <tr
                      className="border-b border-border/80 hover:bg-surface-2/60"
                    >
                      <td className="sticky left-0 z-10 bg-surface-1 px-3 py-2 font-mono text-[11px] text-text-muted shadow-[1px_0_0_var(--border)]">
                        {c.id}
                      </td>
                      <td className="px-3 py-2 font-medium text-navy-900">
                        {c.companyNameZh || "—"}
                      </td>
                      <td className="px-3 py-2">{c.companyNameEn || "—"}</td>
                      <td className="px-3 py-2 tabular">{c.brNumber || "—"}</td>
                      <td className="px-3 py-2 tabular">{c.crNumber || "—"}</td>
                      <td className="px-3 py-2">{c.applicantNameZh || "—"}</td>
                      <td className="px-3 py-2">{c.applicantNameEn || "—"}</td>
                      <td className="whitespace-nowrap px-3 py-2 font-mono tabular">
                        {c.idNumber || "—"}
                      </td>
                      <td className="px-3 py-2">{c.relation || "—"}</td>
                      <td className="px-3 py-2">{c.title || "—"}</td>
                      <td className="px-3 py-2">{c.email || "—"}</td>
                      <td className="whitespace-nowrap px-3 py-2 font-mono tabular">
                        {c.phone || "—"}
                      </td>
                      <td className="px-3 py-2">{c.contactPerson || "—"}</td>
                      <td className="px-3 py-2">{c.foundedAt || "—"}</td>
                      <td className="px-3 py-2">{c.companyType || "—"}</td>
                      <td className="px-3 py-2">{c.industry || "—"}</td>
                      <td className="px-3 py-2 tabular">{c.employees ?? "—"}</td>
                      <td className="max-w-[220px] truncate px-3 py-2" title={c.address}>
                        {c.address || "—"}
                      </td>
                      <td className="max-w-[140px] truncate px-3 py-2">
                        {c.website || "—"}
                      </td>
                      <td className="px-3 py-2">
                        {status ? (
                          <span
                            className={cn(
                              "inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium",
                              clientAppStatusTone(status),
                            )}
                          >
                            {clientAppStatusLabel(status)}
                          </span>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="px-3 py-2 tabular">
                        {c.latestAmount != null
                          ? formatHKD(c.latestAmount)
                          : "—"}
                      </td>
                      <td className="px-3 py-2 tabular">
                        {c.documentCount ?? docs.length}
                      </td>
                      <td className="px-3 py-2 tabular">
                        {c.analysisCount ?? analyses.length}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2 text-text-muted">
                        {formatDateTime(c.updatedAt)}
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openReportPdf(c)}
                            title="開啟分析報告並另存 PDF"
                          >
                            <FileText className="mr-1 size-3.5" />
                            報告 PDF
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              setExpanded((prev) =>
                                prev === c.id ? null : c.id,
                              )
                            }
                          >
                            {open ? (
                              <ChevronUp className="mr-1 size-3.5" />
                            ) : (
                              <ChevronDown className="mr-1 size-3.5" />
                            )}
                            詳情
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-red-300 text-red-700 hover:bg-red-50"
                            disabled={deletingId === c.id || wiping}
                            onClick={() => void deleteOne(c)}
                          >
                            <Trash2 className="mr-1 size-3.5" />
                            {deletingId === c.id ? "…" : "刪除"}
                          </Button>
                        </div>
                      </td>
                    </tr>
                    {open && (
                      <tr className="bg-surface-2/40">
                        <td
                          colSpan={TABLE_COLS.length}
                          className="px-4 py-4"
                        >
                          <div className="grid gap-4 lg:grid-cols-2">
                            <div className="space-y-2">
                              <p className="text-xs font-semibold text-navy-900">
                                登記備註／來源
                              </p>
                              <p className="text-sm text-text-secondary">
                                來源：{c.source || "—"} · 備註：{c.notes || "—"}
                              </p>
                              <p className="text-xs font-semibold text-navy-900">
                                申請與批核（{apps.length}）
                              </p>
                              {apps.length === 0 ? (
                                <p className="text-sm text-text-muted">
                                  尚未有申請。
                                </p>
                              ) : (
                                <ul className="space-y-2">
                                  {apps.map((a) => {
                                    const st = normalizeClientAppStatus(
                                      a.status,
                                    );
                                    return (
                                      <li
                                        key={a.id}
                                        className="rounded-lg border border-border bg-surface-1 px-3 py-2"
                                      >
                                        <div className="flex flex-wrap justify-between gap-2">
                                          <span className="font-mono text-[11px] text-text-muted">
                                            {a.id}
                                          </span>
                                          <span
                                            className={cn(
                                              "rounded-full px-2 py-0.5 text-[11px]",
                                              clientAppStatusTone(st),
                                            )}
                                          >
                                            {clientAppStatusLabel(st)}
                                          </span>
                                        </div>
                                        <p className="mt-1 text-sm">
                                          {formatHKD(a.amount)} · {a.purpose}
                                        </p>
                                        {a.aiAnalysis?.summary && (
                                          <p className="mt-1 text-xs text-text-muted">
                                            {a.aiAnalysis.summary}
                                          </p>
                                        )}
                                      </li>
                                    );
                                  })}
                                </ul>
                              )}
                            </div>

                            <div className="space-y-2">
                              <p className="text-xs font-semibold text-navy-900">
                                已收集／自動歸檔文件（{docs.length}）
                              </p>
                              {docs.length === 0 ? (
                                <p className="text-sm text-text-muted">
                                  尚未有文件。申請上載或 AI 分析（公司名／BR
                                  一致）會自動歸檔至此。
                                </p>
                              ) : (
                                <ul className="max-h-64 space-y-1.5 overflow-y-auto">
                                  {docs.map((d) => (
                                    <li
                                      key={`${d.source}:${d.id}`}
                                      className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-surface-1 px-3 py-2"
                                    >
                                      <div className="min-w-0">
                                        <p className="font-medium text-navy-900">
                                          {d.kindLabel}
                                        </p>
                                        <p className="truncate text-[11px] text-text-muted">
                                          {d.fileName}
                                          {d.size > 0
                                            ? ` · ${formatSize(d.size)}`
                                            : ""}
                                          {d.source === "archive"
                                            ? " · AI 歸檔"
                                            : ""}
                                        </p>
                                      </div>
                                      {d.downloadUrl ? (
                                        <a href={d.downloadUrl}>
                                          <Button size="sm" variant="outline">
                                            <Download className="mr-1 size-3.5" />
                                            下載
                                          </Button>
                                        </a>
                                      ) : null}
                                    </li>
                                  ))}
                                </ul>
                              )}

                              <p className="pt-2 text-xs font-semibold text-navy-900">
                                AI 分析歸檔（{analyses.length}）
                              </p>
                              {analyses.length === 0 ? (
                                <p className="text-sm text-text-muted">
                                  尚未有分析歸檔。
                                </p>
                              ) : (
                                <ul className="space-y-2">
                                  {analyses.map((a) => {
                                    const aOpen = expandedArchive === a.id;
                                    return (
                                      <li
                                        key={a.id}
                                        className="rounded-lg border border-border bg-surface-1"
                                      >
                                        <button
                                          type="button"
                                          className="flex w-full items-start justify-between gap-2 px-3 py-2 text-left"
                                          onClick={() =>
                                            setExpandedArchive((prev) =>
                                              prev === a.id ? null : a.id,
                                            )
                                          }
                                        >
                                          <div>
                                            <p className="text-sm font-medium text-navy-900">
                                              {a.title}
                                            </p>
                                            <p className="text-[11px] text-text-muted">
                                              {a.docKind}
                                              {a.overall
                                                ? ` · ${assessmentLabel(a.overall)}`
                                                : ""}
                                            </p>
                                          </div>
                                          <span className="text-[11px] text-text-muted">
                                            {aOpen ? "收起" : "展開"}
                                          </span>
                                        </button>
                                        {aOpen && (
                                          <div className="border-t border-border px-3 py-2">
                                            <ArchiveExtractBody
                                              payload={a.payload || {}}
                                            />
                                          </div>
                                        )}
                                      </li>
                                    );
                                  })}
                                </ul>
                              )}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
              {!loading && filtered.length === 0 && (
                <tr>
                  <td
                    colSpan={TABLE_COLS.length}
                    className="px-4 py-10 text-center text-sm text-text-muted"
                  >
                    未有符合的客戶紀錄
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Disclaimer>
        「報告 PDF」會開啟可列印報告，請用瀏覽器「另存為 PDF」。上載文件與 AI
        分析會按公司名／BR／電郵自動歸檔到對應客戶。
      </Disclaimer>
    </main>
  );
}
