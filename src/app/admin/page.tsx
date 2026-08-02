"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { FileText, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/field";
import { Card, EmptyState, SectionHeader } from "@/components/ui/layout";
import {
  ADMIN_APP_STATUS_LABEL,
  CLIENT_APP_STATUSES,
  clientAppStatusTone,
  normalizeClientAppStatus,
  type ClientAppStatus,
} from "@/lib/application-status";
import { cn, formatDateTime, formatHKD } from "@/lib/utils";

type AdminApp = {
  id: string;
  loanType: "secured" | "unsecured" | null;
  amount: number;
  purpose: string;
  status: string;
  failureReason?: string | null;
  docsPct?: number;
  bankCount?: number;
  customerId?: string | null;
  applicantNameZh?: string | null;
  companyNameZh?: string | null;
  email?: string | null;
  documents?: Array<{ id: string; fileName: string; kind: string }>;
  aiAnalysis?: {
    summary?: string;
    decision?: string;
    decisionReason?: string | null;
    analyzedAt?: string;
    bank?: { overall?: string; narrative?: string };
  } | null;
  updatedAt: string;
  createdAt: string;
};

function aiOverallLabel(o?: string) {
  if (o === "adequate") return "尚可";
  if (o === "tight") return "偏緊";
  if (o === "weak") return "偏弱";
  return null;
}

export default function AdminDashboardPage() {
  const [apps, setApps] = useState<AdminApp[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState("全部");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [clearing, setClearing] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/applications", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "載入失敗");
      setApps(data.applications ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "載入失敗");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    return apps.filter((app) => {
      const status = normalizeClientAppStatus(app.status);
      if (filter === "有抵押") return app.loanType === "secured";
      if (filter === "無抵押") return app.loanType === "unsecured";
      if (filter === "需要補件") return (app.docsPct ?? 0) < 100;
      if (filter === "審批中") return status === "under_review";
      if (filter === "已批核") return status === "approved";
      if (filter === "拒絕") return status === "rejected";
      return true;
    });
  }, [apps, filter]);

  const kpis = useMemo(() => {
    const under = apps.filter(
      (a) => normalizeClientAppStatus(a.status) === "under_review",
    ).length;
    const approved = apps.filter(
      (a) => normalizeClientAppStatus(a.status) === "approved",
    ).length;
    const rejected = apps.filter(
      (a) => normalizeClientAppStatus(a.status) === "rejected",
    ).length;
    const needDocs = apps.filter((a) => (a.docsPct ?? 0) < 100).length;
    return [
      { label: "新申請", value: String(apps.length) },
      { label: "審批中", value: String(under) },
      { label: "需要補件", value: String(needDocs) },
      { label: "待人工審核", value: String(under) },
      { label: "已批核", value: String(approved) },
      { label: "拒絕", value: String(rejected) },
      { label: "平均處理時間", value: "—" },
    ];
  }, [apps]);

  async function updateStatus(app: AdminApp, next: ClientAppStatus) {
    const current = normalizeClientAppStatus(app.status);
    if (current === next) return;

    let failureReason: string | null = app.failureReason ?? null;
    if (next === "rejected") {
      const reason = window.prompt(
        `拒絕案件 ${app.id} 的原因（客戶端會顯示）：`,
        failureReason || app.aiAnalysis?.decisionReason || "",
      );
      if (reason === null) return; // 取消
      failureReason = reason.trim() || "後台拒絕（未填寫原因）";
    } else {
      const ok = window.confirm(
        `將案件 ${app.id} 狀態改為「${ADMIN_APP_STATUS_LABEL[next]}」？`,
      );
      if (!ok) return;
      failureReason = null;
    }

    setUpdatingId(app.id);
    setError(null);
    try {
      const res = await fetch("/api/admin/applications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: app.id,
          status: next,
          failureReason,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.message || data.error || "更新狀態失敗");
      }
      const updated = data.application as AdminApp | undefined;
      setApps((prev) =>
        prev.map((a) =>
          a.id === app.id
            ? {
                ...a,
                status: updated?.status ?? next,
                failureReason:
                  updated?.failureReason ??
                  (next === "rejected" ? failureReason : null),
                updatedAt: updated?.updatedAt ?? new Date().toISOString(),
              }
            : a,
        ),
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "更新狀態失敗");
    } finally {
      setUpdatingId(null);
    }
  }

  async function deleteOne(app: AdminApp) {
    const ok = window.confirm(
      `確定刪除案件 ${app.id}？\n關聯上載文件會一併刪除（客戶登記資料保留）。`,
    );
    if (!ok) return;
    setDeletingId(app.id);
    setError(null);
    try {
      const res = await fetch("/api/admin/applications", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: app.id }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.message || data.error || "刪除失敗");
      }
      setApps((prev) => prev.filter((a) => a.id !== app.id));
    } catch (e) {
      setError(e instanceof Error ? e.message : "刪除失敗");
    } finally {
      setDeletingId(null);
    }
  }

  async function clearAll() {
    if (apps.length === 0) return;
    const ok = window.confirm(
      `確定清空全部 ${apps.length} 宗案件？\n所有關聯文件會刪除（客戶登記資料保留）。此操作不可復原。`,
    );
    if (!ok) return;
    setClearing(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/applications", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ all: true }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.message || data.error || "清空失敗");
      }
      setApps([]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "清空失敗");
    } finally {
      setClearing(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-navy-900">案件總覽</h1>
          <p className="mt-1 text-sm text-text-secondary">
            即時同步客戶提交申請 · 目前狀態可選：審批中／已批核／拒絕
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => void load()}>
            重新整理
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => void clearAll()}
            disabled={clearing || loading || apps.length === 0}
            className="border-red-300 text-red-700 hover:bg-red-50"
          >
            <Trash2 className="mr-1 size-3.5" />
            {clearing ? "清空中…" : "清空全部案件"}
          </Button>
          <p className="rounded-full bg-teal-100 px-3 py-1 text-xs font-semibold text-teal-800">
            案件 {apps.length} · live
          </p>
        </div>
      </div>

      {error && (
        <p className="rounded-xl bg-danger-100 px-3 py-2 text-sm text-danger-600">
          {error}
        </p>
      )}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-7">
        {kpis.map((kpi) => (
          <Card key={kpi.label} className="py-3">
            <p className="text-xs text-text-muted">{kpi.label}</p>
            <p className="mt-1 text-2xl font-semibold tabular text-navy-900">
              {loading ? "…" : kpi.value}
            </p>
          </Card>
        ))}
      </div>

      <Card>
        <SectionHeader
          title="篩選器"
          subtitle="貸款類型 · 文件狀態 · 申請狀態"
        />
        <div className="flex flex-wrap gap-2">
          {[
            "全部",
            "有抵押",
            "無抵押",
            "需要補件",
            "審批中",
            "已批核",
            "拒絕",
          ].map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={cn(
                "rounded-full px-3 py-1.5 text-xs font-medium transition",
                filter === f
                  ? "bg-teal-100 text-teal-600"
                  : "bg-surface-2 text-text-secondary hover:bg-teal-100 hover:text-teal-600",
              )}
            >
              {f}
            </button>
          ))}
        </div>
      </Card>

      <Card className="overflow-x-auto p-0">
        <table className="w-full min-w-[1200px] text-left text-sm">
          <thead className="border-b border-border bg-surface-2/80 text-xs text-text-muted">
            <tr>
              {[
                "申請編號",
                "公司／申請人",
                "貸款類型",
                "申請金額",
                "用途",
                "文件",
                "AI 分析報告",
                "目前狀態",
                "最後更新",
                "操作",
              ].map((h) => (
                <th key={h} className="px-4 py-3 font-medium">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((app) => {
              const status = normalizeClientAppStatus(app.status);
              const docCount = app.documents?.length ?? 0;
              const hasAi = Boolean(app.aiAnalysis);
              const bankLabel = aiOverallLabel(app.aiAnalysis?.bank?.overall);
              const reportUrl = `/api/admin/applications/${encodeURIComponent(app.id)}/report?print=1`;
              return (
                <tr
                  key={app.id}
                  className="border-b border-border last:border-0 hover:bg-surface-2/50"
                >
                  <td className="px-4 py-3">
                    <Link
                      href={
                        app.customerId
                          ? `/admin/customers#${app.customerId}`
                          : `/admin/customers`
                      }
                      className="font-medium text-teal-600 hover:underline"
                    >
                      {app.id}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-navy-900">
                      {app.companyNameZh || "—"}
                    </p>
                    <p className="text-xs text-text-muted">
                      {app.applicantNameZh || app.email || "—"}
                    </p>
                  </td>
                  <td className="px-4 py-3">
                    {app.loanType === "secured"
                      ? "有抵押"
                      : app.loanType === "unsecured"
                        ? "無抵押"
                        : "—"}
                  </td>
                  <td className="px-4 py-3 tabular">
                    {formatHKD(app.amount)}
                  </td>
                  <td className="max-w-[160px] truncate px-4 py-3 text-text-secondary">
                    {app.purpose}
                  </td>
                  <td className="px-4 py-3 text-xs text-text-secondary">
                    {app.docsPct ?? 0}%
                    {docCount > 0 ? ` · ${docCount} 份` : ""}
                    {typeof app.bankCount === "number"
                      ? ` · 月結 ${app.bankCount}/6`
                      : ""}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex min-w-[180px] flex-col gap-1.5">
                      {hasAi ? (
                        <>
                          <p className="text-xs font-medium text-navy-900">
                            {app.aiAnalysis?.decision === "approved"
                              ? "AI：批核"
                              : app.aiAnalysis?.decision === "rejected"
                                ? "AI：拒絕"
                                : "AI：審批中"}
                            {bankLabel ? ` · 還款${bankLabel}` : ""}
                          </p>
                          {app.aiAnalysis?.summary && (
                            <p className="line-clamp-2 max-w-[240px] text-[11px] text-text-secondary">
                              {app.aiAnalysis.summary}
                            </p>
                          )}
                          <a
                            href={reportUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <Button size="sm" variant="outline">
                              <FileText className="mr-1 size-3.5" />
                              下載報告
                            </Button>
                          </a>
                        </>
                      ) : (
                        <>
                          <p className="text-[11px] text-text-muted">
                            尚未有 AI 分析
                          </p>
                          <a
                            href={reportUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <Button size="sm" variant="outline">
                              <FileText className="mr-1 size-3.5" />
                              下載報告
                            </Button>
                          </a>
                        </>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex min-w-[140px] flex-col gap-1.5">
                      <Select
                        className={cn(
                          "h-9 text-xs font-medium",
                          clientAppStatusTone(status),
                        )}
                        value={status}
                        disabled={
                          updatingId === app.id ||
                          deletingId === app.id ||
                          clearing
                        }
                        onChange={(e) =>
                          void updateStatus(
                            app,
                            e.target.value as ClientAppStatus,
                          )
                        }
                        aria-label={`案件 ${app.id} 目前狀態`}
                      >
                        {CLIENT_APP_STATUSES.map((s) => (
                          <option key={s} value={s}>
                            {ADMIN_APP_STATUS_LABEL[s]}
                          </option>
                        ))}
                      </Select>
                      {updatingId === app.id && (
                        <span className="text-[11px] text-text-muted">
                          更新中…
                        </span>
                      )}
                      {status === "rejected" &&
                        (app.failureReason ||
                          app.aiAnalysis?.decisionReason) && (
                          <p className="max-w-[220px] text-[11px] text-danger-600">
                            {app.failureReason ||
                              app.aiAnalysis?.decisionReason}
                          </p>
                        )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs text-text-secondary">
                    {formatDateTime(app.updatedAt)}
                  </td>
                  <td className="px-4 py-3">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="border-red-300 text-red-700 hover:bg-red-50"
                      disabled={
                        deletingId === app.id ||
                        clearing ||
                        updatingId === app.id
                      }
                      onClick={() => void deleteOne(app)}
                    >
                      <Trash2 className="mr-1 size-3.5" />
                      {deletingId === app.id ? "刪除中…" : "刪除"}
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {!loading && filtered.length === 0 && (
          <div className="p-4">
            <EmptyState
              title={apps.length === 0 ? "暫無案件（0）" : "無符合篩選的案件"}
              description={
                apps.length === 0
                  ? "客戶完成申請後會出現在此列表。"
                  : "試試其他篩選條件。"
              }
            />
          </div>
        )}
      </Card>
    </div>
  );
}
