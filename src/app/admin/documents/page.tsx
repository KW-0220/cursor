"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  Download,
  Eye,
  FolderOpen,
  RefreshCw,
  Search,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/field";
import {
  Card,
  Disclaimer,
  EmptyState,
  SectionHeader,
  StateBanner,
} from "@/components/ui/layout";
import {
  clientAppStatusLabel,
  clientAppStatusTone,
  normalizeClientAppStatus,
} from "@/lib/application-status";
import { cn, formatDateTime, formatHKD } from "@/lib/utils";

type DocRow = {
  id: string;
  kind: string;
  kindLabel: string;
  slot: string;
  fileName: string;
  mimeType: string;
  size: number;
  customerId: string | null;
  applicationId: string;
  createdAt: string;
  downloadUrl: string;
  previewUrl: string;
  canPreview: boolean;
  source: "registry" | "application";
};

type AppGroup = {
  applicationId: string;
  companyNameZh: string | null;
  applicantNameZh: string | null;
  email: string | null;
  customerId: string | null;
  status: string | null;
  amount: number | null;
  purpose: string | null;
  updatedAt: string | null;
  documentCount: number;
  documents: DocRow[];
};

function formatSize(n: number) {
  if (!Number.isFinite(n) || n <= 0) return "—";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

function isImage(mime: string, name: string) {
  return (
    mime.toLowerCase().startsWith("image/") ||
    /\.(png|jpe?g|gif|webp|bmp)$/i.test(name)
  );
}

function isPdf(mime: string, name: string) {
  return (
    mime.toLowerCase() === "application/pdf" ||
    name.toLowerCase().endsWith(".pdf")
  );
}

export default function AdminDocumentsPage() {
  const [groups, setGroups] = useState<AppGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [preview, setPreview] = useState<DocRow | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/documents?grouped=1", {
        cache: "no-store",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || data.error || "載入失敗");
      const list = (data.groups ?? []) as AppGroup[];
      setGroups(list);
      setExpanded((prev) => {
        if (prev && list.some((g) => g.applicationId === prev)) return prev;
        return list.length === 1 ? list[0]!.applicationId : prev;
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "載入失敗");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  async function openPreview(doc: DocRow) {
    setPreview(doc);
    setPreviewError(null);
    setPreviewLoading(true);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
    try {
      const res = await fetch(doc.previewUrl, { cache: "no-store" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(
          data.message || data.error || `無法預覽（HTTP ${res.status}）`,
        );
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      setPreviewUrl(url);
    } catch (e) {
      setPreviewError(e instanceof Error ? e.message : "預覽失敗");
    } finally {
      setPreviewLoading(false);
    }
  }

  function closePreview() {
    setPreview(null);
    setPreviewError(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
  }

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return groups;
    return groups
      .map((g) => {
        const appHit = [
          g.applicationId,
          g.companyNameZh,
          g.applicantNameZh,
          g.email,
          g.customerId,
          g.purpose,
          g.status,
        ]
          .join(" ")
          .toLowerCase()
          .includes(s);
        const docs = appHit
          ? g.documents
          : g.documents.filter((d) =>
              [d.fileName, d.kindLabel, d.slot, d.id, d.kind]
                .join(" ")
                .toLowerCase()
                .includes(s),
            );
        if (!appHit && docs.length === 0) return null;
        return { ...g, documents: docs, documentCount: docs.length };
      })
      .filter(Boolean) as AppGroup[];
  }, [groups, q]);

  const totalDocs = filtered.reduce((n, g) => n + g.documentCount, 0);

  return (
    <main className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-navy-900">文件管理</h1>
          <p className="mt-1 text-sm text-text-secondary">
            按申請編號分類 · 完整預覽與下載已收集文件
          </p>
        </div>
        <Button variant="outline" onClick={() => void load()} disabled={loading}>
          <RefreshCw className="mr-1.5 size-4" />
          重新整理
        </Button>
      </div>

      {error && (
        <StateBanner tone="error" title="無法載入" description={error} />
      )}

      <Card className="flex flex-wrap items-center gap-3">
        <div className="flex min-w-[240px] flex-1 items-center gap-2 rounded-xl border border-border bg-surface-1 px-3">
          <Search className="size-4 text-text-muted" />
          <Input
            className="border-0 bg-transparent px-0 shadow-none focus:ring-0"
            placeholder="搜尋申請編號／公司／檔名／文件類型…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        <p className="text-sm text-text-secondary">
          {filtered.length} 宗申請 · {totalDocs} 份文件
          {loading ? " · 載入中…" : ""}
        </p>
      </Card>

      <SectionHeader
        title="按申請編號"
        subtitle="展開可預覽 PDF／圖片，或下載完整檔案"
      />

      {filtered.length === 0 && !loading ? (
        <EmptyState
          title="尚未有已收集文件"
          description="客戶提交申請並上載文件後，會按申請編號出現在此。"
        />
      ) : (
        <div className="space-y-3">
          {filtered.map((g) => {
            const open = expanded === g.applicationId;
            const status = g.status
              ? normalizeClientAppStatus(g.status)
              : null;
            return (
              <Card key={g.applicationId} className="space-y-0 overflow-hidden p-0">
                <button
                  type="button"
                  className="flex w-full flex-wrap items-start justify-between gap-3 px-4 py-3 text-left hover:bg-surface-2/50"
                  onClick={() =>
                    setExpanded((prev) =>
                      prev === g.applicationId ? null : g.applicationId,
                    )
                  }
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <FolderOpen className="size-4 text-teal-600" />
                      <p className="font-mono text-sm font-semibold text-navy-900">
                        {g.applicationId}
                      </p>
                      {status && (
                        <span
                          className={cn(
                            "rounded-full px-2 py-0.5 text-[11px] font-medium",
                            clientAppStatusTone(status),
                          )}
                        >
                          {clientAppStatusLabel(status)}
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-sm text-text-secondary">
                      {g.companyNameZh || "—"}
                      {g.applicantNameZh ? ` · ${g.applicantNameZh}` : ""}
                      {g.email ? ` · ${g.email}` : ""}
                    </p>
                    <p className="mt-0.5 text-xs text-text-muted">
                      {g.amount != null ? formatHKD(g.amount) : "—"}
                      {g.purpose ? ` · ${g.purpose}` : ""}
                      {g.updatedAt
                        ? ` · 更新 ${formatDateTime(g.updatedAt)}`
                        : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-text-muted">
                    <span className="rounded-full bg-teal-100 px-2.5 py-1 font-medium text-teal-800">
                      {g.documentCount} 份
                    </span>
                    {open ? (
                      <ChevronUp className="size-4" />
                    ) : (
                      <ChevronDown className="size-4" />
                    )}
                  </div>
                </button>

                {open && (
                  <div className="border-t border-border px-4 py-3">
                    {g.documents.length === 0 ? (
                      <p className="text-sm text-text-muted">此申請尚無文件。</p>
                    ) : (
                      <ul className="divide-y divide-border rounded-xl border border-border bg-surface-1">
                        {g.documents.map((d) => (
                          <li
                            key={`${d.source}:${d.id}`}
                            className="flex flex-wrap items-center justify-between gap-3 px-3 py-2.5"
                          >
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-navy-900">
                                {d.kindLabel}
                                <span className="ml-2 text-xs font-normal text-text-muted">
                                  {d.slot}
                                </span>
                              </p>
                              <p className="truncate text-xs text-text-secondary">
                                {d.fileName} · {formatSize(d.size)} ·{" "}
                                {d.mimeType || "—"}
                                {d.source === "application"
                                  ? " · 申請內嵌"
                                  : ""}
                              </p>
                              <p className="text-[11px] text-text-muted">
                                {d.id}
                                {d.createdAt
                                  ? ` · ${formatDateTime(d.createdAt)}`
                                  : ""}
                              </p>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {d.canPreview && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => void openPreview(d)}
                                >
                                  <Eye className="mr-1 size-3.5" />
                                  預覽
                                </Button>
                              )}
                              <a href={d.downloadUrl} download={d.fileName}>
                                <Button size="sm">
                                  <Download className="mr-1 size-3.5" />
                                  下載
                                </Button>
                              </a>
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {preview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy-950/60 p-4 backdrop-blur-sm">
          <div className="flex max-h-[90dvh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-surface-1 shadow-xl">
            <div className="flex items-start justify-between gap-3 border-b border-border px-4 py-3">
              <div className="min-w-0">
                <p className="truncate font-medium text-navy-900">
                  {preview.fileName}
                </p>
                <p className="text-xs text-text-muted">
                  {preview.kindLabel} · {preview.applicationId}
                </p>
              </div>
              <div className="flex shrink-0 gap-2">
                <a href={preview.downloadUrl} download={preview.fileName}>
                  <Button size="sm" variant="outline">
                    <Download className="mr-1 size-3.5" />
                    下載
                  </Button>
                </a>
                <Button size="sm" variant="outline" onClick={closePreview}>
                  <X className="size-4" />
                </Button>
              </div>
            </div>
            <div className="min-h-0 flex-1 overflow-auto bg-surface-2 p-3">
              {previewLoading && (
                <p className="p-8 text-center text-sm text-text-muted">
                  載入預覽…
                </p>
              )}
              {previewError && (
                <StateBanner
                  tone="error"
                  title="無法預覽"
                  description={previewError}
                />
              )}
              {!previewLoading && !previewError && previewUrl && (
                <>
                  {isPdf(preview.mimeType, preview.fileName) ? (
                    <iframe
                      title={preview.fileName}
                      src={previewUrl}
                      className="h-[70dvh] w-full rounded-lg border border-border bg-white"
                    />
                  ) : isImage(preview.mimeType, preview.fileName) ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={previewUrl}
                      alt={preview.fileName}
                      className="mx-auto max-h-[70dvh] max-w-full rounded-lg object-contain"
                    />
                  ) : (
                    <iframe
                      title={preview.fileName}
                      src={previewUrl}
                      className="h-[70dvh] w-full rounded-lg border border-border bg-white"
                    />
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      <Disclaimer>
        文件按申請編號歸類；預覽支援 PDF／圖片，其他類型請直接下載完整檔案。
      </Disclaimer>
    </main>
  );
}
