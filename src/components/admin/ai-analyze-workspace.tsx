"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Archive,
  FileUp,
  Loader2,
  Trash2,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import {
  AuditedExtractPanel,
  BankCashflowBriefPanel,
  BrExtractPanel,
  assessmentLabel,
} from "@/components/app/document-extract-panels";
import { lastSixBankMonths } from "@/components/app/apply-documents-upload";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import {
  Card,
  Disclaimer,
  SectionHeader,
  StateBanner,
} from "@/components/ui/layout";
import type { BankStatementExtract } from "@/lib/bank-statement-extract";
import {
  mergeBankStatementExtracts,
  toBankStatementExtract,
} from "@/lib/bank-statement-extract";
import type { BrExtract } from "@/lib/br-extract";
import { toBrExtract } from "@/lib/br-extract";
import type { AuditedReportExtract } from "@/lib/audited-report-extract";
import {
  mergeAuditedExtracts,
  toAuditedExtract,
} from "@/lib/audited-report-extract";
import { cn, formatDateTime } from "@/lib/utils";

/** 與客戶申請端一致：只允許 BR／銀行月結／審計報告 */
type ClientDocKind = "br" | "bank" | "audited";

type AnalyzePayload = Record<string, unknown> & {
  ok?: boolean;
  error?: string;
  message?: string;
  fileName?: string;
  docKind?: string;
  model?: string;
  extractHint?: string | null;
  bankExtract?: unknown;
  brExtract?: unknown;
  auditedExtract?: unknown;
  analysis?: {
    summary?: string;
    overall?: string;
    companyNameGuess?: string;
  };
  disclaimer?: string;
};

type QueueItem = {
  localId: string;
  fingerprint: string;
  file: File | null;
  pastedText: string;
  label: string;
  docKind: ClientDocKind;
  statementMonth: string | null;
  status: "queued" | "running" | "done" | "error";
  error?: string;
  result?: AnalyzePayload;
  archivedId?: string;
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

const DOC_KINDS: Array<{ value: ClientDocKind; label: string }> = [
  { value: "br", label: "商業登記證 BR" },
  { value: "bank", label: "銀行月結單" },
  { value: "audited", label: "審計報告（Audited）" },
];

function fileFingerprint(file: File) {
  return `file:${file.name.trim().toLowerCase()}|${file.size}|${file.lastModified}`;
}

function pasteFingerprint(text: string) {
  const t = text.trim();
  let h = 2166136261;
  for (let i = 0; i < t.length; i++) {
    h ^= t.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return `paste:${t.length}:${(h >>> 0).toString(16)}`;
}

function ClientResultBody({ result }: { result: AnalyzePayload }) {
  const kind = (result.docKind || "") as string;
  const hint =
    typeof result.extractHint === "string" ? result.extractHint : null;

  if (kind === "br" && result.brExtract) {
    const br = toBrExtract(result.brExtract as Partial<BrExtract>);
    return (
      <div className="space-y-2">
        {hint && (
          <StateBanner tone="info" title="抽取提示" description={hint} />
        )}
        <BrExtractPanel br={br} />
      </div>
    );
  }

  if (kind === "audited" && result.auditedExtract) {
    const a = toAuditedExtract(result.auditedExtract);
    return (
      <div className="space-y-2">
        {hint && (
          <StateBanner tone="info" title="抽取提示" description={hint} />
        )}
        <AuditedExtractPanel a={a} />
      </div>
    );
  }

  if (kind === "bank" && result.bankExtract) {
    const bank = toBankStatementExtract(result.bankExtract);
    const brief = mergeBankStatementExtracts([bank]);
    return (
      <div className="space-y-2">
        {hint && (
          <StateBanner tone="info" title="抽取提示" description={hint} />
        )}
        <BankCashflowBriefPanel brief={brief} />
      </div>
    );
  }

  return (
    <StateBanner
      tone="warning"
      title="未有結構化抽取結果"
      description={
        result.message ||
        "請確認文件類型（BR／銀行月結／審計）與上載檔案相符後重試。"
      }
    />
  );
}

export function AiAnalyzeWorkspace({
  enableArchive = true,
}: {
  /** @deprecated 與客戶端對齊後不再顯示三色燈 */
  showTrafficLight?: boolean;
  enableArchive?: boolean;
}) {
  const months = useMemo(() => lastSixBankMonths(), []);
  const inputRef = useRef<HTMLInputElement>(null);
  const [tab, setTab] = useState<"analyze" | "archive">("analyze");
  const [companyName, setCompanyName] = useState("");
  const [docKind, setDocKind] = useState<ClientDocKind>("br");
  const [bankMonth, setBankMonth] = useState(
    months[months.length - 1] ?? "",
  );
  const [pasteText, setPasteText] = useState("");
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [running, setRunning] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [flash, setFlash] = useState<string | null>(null);

  const [archives, setArchives] = useState<ArchiveListItem[]>([]);
  const [archiveLoading, setArchiveLoading] = useState(false);
  const [archiveDetail, setArchiveDetail] = useState<AnalyzePayload | null>(
    null,
  );
  const [archiveDetailId, setArchiveDetailId] = useState<string | null>(null);
  const [archiveQ, setArchiveQ] = useState("");
  const [archivingId, setArchivingId] = useState<string | null>(null);

  const queuedCount = useMemo(
    () => queue.filter((q) => q.status === "queued").length,
    [queue],
  );
  const doneCount = useMemo(
    () => queue.filter((q) => q.status === "done").length,
    [queue],
  );

  /** 與客戶端相同：合併已完成嘅銀行月結 → 六大項現金流預審 */
  const mergedBankBrief = useMemo(() => {
    const banks: BankStatementExtract[] = [];
    for (const q of queue) {
      if (q.status !== "done" || q.docKind !== "bank" || !q.result?.bankExtract)
        continue;
      banks.push(toBankStatementExtract(q.result.bankExtract));
    }
    if (!banks.length) return null;
    return mergeBankStatementExtracts(banks);
  }, [queue]);

  const mergedAudited = useMemo(() => {
    const list: AuditedReportExtract[] = [];
    for (const q of queue) {
      if (
        q.status !== "done" ||
        q.docKind !== "audited" ||
        !q.result?.auditedExtract
      )
        continue;
      list.push(toAuditedExtract(q.result.auditedExtract));
    }
    if (!list.length) return null;
    return mergeAuditedExtracts(list);
  }, [queue]);

  const loadArchives = useCallback(async () => {
    if (!enableArchive) return;
    setArchiveLoading(true);
    try {
      const res = await fetch("/api/admin/analysis-archive", {
        cache: "no-store",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || data.error || "載入歸檔失敗");
      setArchives(data.items ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "載入歸檔失敗");
    } finally {
      setArchiveLoading(false);
    }
  }, [enableArchive]);

  useEffect(() => {
    if (enableArchive) void loadArchives();
  }, [enableArchive, loadArchives]);

  useEffect(() => {
    if (tab === "archive") void loadArchives();
  }, [tab, loadArchives]);

  function addFiles(list: FileList | File[] | null) {
    const files = Array.from(list ?? []).filter((f) => f.size > 0);
    if (!files.length) return;
    if (docKind === "bank" && !bankMonth) {
      setError("銀行月結單必須選擇月份（與客戶申請端相同）");
      return;
    }

    const existing = new Set(queue.map((q) => q.fingerprint));
    const archivedNames = new Set(
      archives
        .map((a) => a.fileName?.trim().toLowerCase())
        .filter((n): n is string => Boolean(n)),
    );

    const accepted: QueueItem[] = [];
    const dupNames: string[] = [];
    const seenInBatch = new Set<string>();

    for (const file of files) {
      const fp = fileFingerprint(file);
      const nameKey = file.name.trim().toLowerCase();
      if (
        existing.has(fp) ||
        seenInBatch.has(fp) ||
        (nameKey && archivedNames.has(nameKey))
      ) {
        dupNames.push(file.name);
        continue;
      }
      seenInBatch.add(fp);
      accepted.push({
        localId: `Q-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
        fingerprint: fp,
        file,
        pastedText: "",
        label:
          docKind === "bank"
            ? `${file.name}（${bankMonth}）`
            : file.name,
        docKind,
        statementMonth: docKind === "bank" ? bankMonth : null,
        status: "queued",
      });
    }

    if (accepted.length) {
      setQueue((prev) => [...prev, ...accepted]);
      setFlash(
        `已加入 ${accepted.length} 份${
          DOC_KINDS.find((d) => d.value === docKind)?.label || ""
        }` + (dupNames.length ? `；略過重覆 ${dupNames.length}` : ""),
      );
    } else setFlash(null);

    if (dupNames.length) {
      setError(
        `禁止上載重覆文件：${dupNames.slice(0, 5).join("、")}` +
          (dupNames.length > 5 ? ` 等 ${dupNames.length} 個` : ""),
      );
    } else setError(null);

    if (inputRef.current) inputRef.current.value = "";
  }

  function addPasteJob() {
    const text = pasteText.trim();
    if (!text) {
      setError("請先貼上文字");
      return;
    }
    if (docKind === "bank" && !bankMonth) {
      setError("銀行月結單必須選擇月份");
      return;
    }
    const fp = pasteFingerprint(text);
    if (queue.some((q) => q.fingerprint === fp)) {
      setError("禁止上載重覆內容：相同文字已在分析佇列");
      return;
    }
    setQueue((prev) => [
      ...prev,
      {
        localId: `Q-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
        fingerprint: fp,
        file: null,
        pastedText: text,
        label: `貼上文字（${text.length} 字）${
          docKind === "bank" ? ` · ${bankMonth}` : ""
        }`,
        docKind,
        statementMonth: docKind === "bank" ? bankMonth : null,
        status: "queued",
      },
    ]);
    setPasteText("");
    setError(null);
    setFlash("已將貼上文字加入分析佇列");
  }

  function removeQueued(localId: string) {
    setQueue((prev) =>
      prev.filter((q) => !(q.localId === localId && q.status === "queued")),
    );
  }

  function clearDone() {
    setQueue((prev) => prev.filter((q) => q.status !== "done"));
  }

  /** 與客戶端 apply-documents-upload.analyzeOne 相同契約 */
  async function analyzeOne(item: QueueItem): Promise<QueueItem> {
    const form = new FormData();
    if (item.file) form.set("file", item.file);
    if (item.pastedText) form.set("text", item.pastedText);
    form.set("docKind", item.docKind);
    if (item.statementMonth) form.set("statementMonth", item.statementMonth);
    if (companyName.trim()) form.set("companyName", companyName.trim());
    // 客戶端會帶 loan 欄位但 API 唔用；為一致仍可省略

    const res = await fetch("/api/analyze-document", {
      method: "POST",
      body: form,
    });
    const data = (await res.json()) as AnalyzePayload;
    if (!res.ok || !data.ok) {
      return {
        ...item,
        status: "error",
        error: data.message || data.error || `分析失敗 HTTP ${res.status}`,
        result: data,
      };
    }
    return {
      ...item,
      status: "done",
      result: { ...data, docKind: data.docKind || item.docKind },
      label: data.fileName || item.label,
    };
  }

  async function runQueue() {
    if (running) return;
    const pending = queue.filter((q) => q.status === "queued");
    if (!pending.length) {
      setError("佇列沒有待分析項目");
      return;
    }
    setRunning(true);
    setError(null);
    setFlash(null);

    // 銀行多份：優先走客戶端同一 batch API（失敗再逐份）
    const bankPending = pending.filter((q) => q.docKind === "bank" && q.file);
    const otherPending = pending.filter((q) => !(q.docKind === "bank" && q.file));

    if (bankPending.length >= 2) {
      for (const item of bankPending) {
        setQueue((prev) =>
          prev.map((q) =>
            q.localId === item.localId ? { ...q, status: "running" } : q,
          ),
        );
      }
      try {
        const form = new FormData();
        form.set("batchKind", "bank");
        if (companyName.trim()) form.set("companyName", companyName.trim());
        bankPending.forEach((item, i) => {
          form.set(`file${i}`, item.file!);
          form.set(`month${i}`, item.statementMonth || "");
        });
        const res = await fetch("/api/analyze-documents-batch", {
          method: "POST",
          body: form,
        });
        const data = await res.json();
        if (res.ok && data.ok && Array.isArray(data.results)) {
          const byIdx = data.results as Array<{
            ok?: boolean;
            message?: string;
            bankExtract?: unknown;
            fileName?: string;
            extractHint?: string | null;
            model?: string;
            statementMonth?: string;
          }>;
          setQueue((prev) =>
            prev.map((q) => {
              const idx = bankPending.findIndex((b) => b.localId === q.localId);
              if (idx < 0) return q;
              const r = byIdx[idx];
              if (!r?.ok) {
                return {
                  ...q,
                  status: "error" as const,
                  error: r?.message || "批次分析失敗",
                };
              }
              return {
                ...q,
                status: "done" as const,
                label: r.fileName || q.label,
                result: {
                  ok: true,
                  docKind: "bank",
                  fileName: r.fileName,
                  bankExtract: r.bankExtract,
                  extractHint: r.extractHint,
                  model: r.model || data.model,
                },
              };
            }),
          );
        } else {
          // fallback sequential
          for (const item of bankPending) {
            const next = await analyzeOne(item);
            setQueue((prev) =>
              prev.map((q) => (q.localId === item.localId ? next : q)),
            );
          }
        }
      } catch {
        for (const item of bankPending) {
          const next = await analyzeOne(item);
          setQueue((prev) =>
            prev.map((q) => (q.localId === item.localId ? next : q)),
          );
        }
      }
    } else if (bankPending.length === 1) {
      otherPending.unshift(bankPending[0]!);
    }

    for (const item of otherPending) {
      setQueue((prev) =>
        prev.map((q) =>
          q.localId === item.localId ? { ...q, status: "running" } : q,
        ),
      );
      try {
        const next = await analyzeOne(item);
        setQueue((prev) =>
          prev.map((q) => (q.localId === item.localId ? next : q)),
        );
        setExpanded(item.localId);
      } catch (e) {
        setQueue((prev) =>
          prev.map((q) =>
            q.localId === item.localId
              ? {
                  ...q,
                  status: "error",
                  error: e instanceof Error ? e.message : "網絡錯誤",
                }
              : q,
          ),
        );
      }
    }

    setRunning(false);
    setFlash("佇列分析完成（規則與客戶申請端相同：BR／銀行現金流／Audited）。");
  }

  async function archiveItem(item: QueueItem) {
    if (!item.result || !enableArchive) return;
    setArchivingId(item.localId);
    setError(null);
    try {
      const summaryBits: string[] = [];
      if (item.docKind === "bank" && item.result.bankExtract) {
        const brief = mergeBankStatementExtracts([
          toBankStatementExtract(item.result.bankExtract),
        ]);
        summaryBits.push(
          `還款能力：${assessmentLabel(brief.repaymentCapacity.overall)}`,
          brief.repaymentCapacity.narrative,
        );
      }
      if (item.docKind === "br" && item.result.brExtract) {
        const br = toBrExtract(item.result.brExtract as Partial<BrExtract>);
        summaryBits.push(
          [br.company_name_zh, br.br_number].filter(Boolean).join(" · "),
        );
      }
      if (item.docKind === "audited" && item.result.auditedExtract) {
        const a = toAuditedExtract(item.result.auditedExtract);
        summaryBits.push(
          [a.company_name, a.year_end_date, a.auditor_name]
            .filter(Boolean)
            .join(" · "),
        );
      }

      const res = await fetch("/api/admin/analysis-archive", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: item.label,
          fileName: item.result.fileName || item.label,
          docKind: item.docKind,
          companyName: companyName || null,
          summary: summaryBits.filter(Boolean).join("｜") || null,
          overall:
            item.docKind === "bank" && item.result.bankExtract
              ? mergeBankStatementExtracts([
                  toBankStatementExtract(item.result.bankExtract),
                ]).repaymentCapacity.overall
              : null,
          payload: item.result,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || data.error || "歸檔失敗");
      setQueue((prev) =>
        prev.map((q) =>
          q.localId === item.localId
            ? { ...q, archivedId: data.item?.id as string }
            : q,
        ),
      );
      setFlash(`已歸檔：${item.label}`);
      if (tab === "archive") void loadArchives();
    } catch (e) {
      setError(e instanceof Error ? e.message : "歸檔失敗");
    } finally {
      setArchivingId(null);
    }
  }

  async function archiveAllDone() {
    const targets = queue.filter(
      (q) => q.status === "done" && q.result && !q.archivedId,
    );
    for (const item of targets) await archiveItem(item);
  }

  async function openArchive(id: string) {
    setArchiveDetailId(id);
    setArchiveDetail(null);
    try {
      const res = await fetch(
        `/api/admin/analysis-archive?id=${encodeURIComponent(id)}`,
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || data.error || "讀取失敗");
      setArchiveDetail((data.item?.payload ?? null) as AnalyzePayload | null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "讀取失敗");
    }
  }

  async function deleteArchive(id: string) {
    if (!window.confirm("確定刪除此歸檔？")) return;
    const res = await fetch("/api/admin/analysis-archive", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.message || data.error || "刪除失敗");
      return;
    }
    if (archiveDetailId === id) {
      setArchiveDetailId(null);
      setArchiveDetail(null);
    }
    await loadArchives();
  }

  const filteredArchives = archives.filter((a) => {
    const s = archiveQ.trim().toLowerCase();
    if (!s) return true;
    return [a.title, a.fileName, a.companyName, a.summary, a.docKind, a.id]
      .join(" ")
      .toLowerCase()
      .includes(s);
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setTab("analyze")}
          className={cn(
            "rounded-full px-3 py-1.5 text-xs font-medium",
            tab === "analyze"
              ? "bg-teal-100 text-teal-700"
              : "bg-surface-2 text-text-secondary",
          )}
        >
          分析佇列
        </button>
        {enableArchive && (
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
            歸檔庫（{archives.length}）
          </button>
        )}
      </div>

      {error && (
        <StateBanner tone="error" title="錯誤" description={error} />
      )}
      {flash && (
        <StateBanner tone="success" title="提示" description={flash} />
      )}

      {tab === "analyze" && (
        <>
          <Card className="space-y-3">
            <SectionHeader
              title="AI 文件分析（與客戶申請端相同規則）"
              subtitle="文件類型：BR · 銀行月結（含月份）· Audited｜同一套抽取 prompt／合併現金流"
            />
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="文件類型（必選）">
                <Select
                  value={docKind}
                  onChange={(e) => setDocKind(e.target.value as ClientDocKind)}
                >
                  {DOC_KINDS.map((k) => (
                    <option key={k.value} value={k.value}>
                      {k.label}
                    </option>
                  ))}
                </Select>
              </Field>
              {docKind === "bank" && (
                <Field label="月結單月份（與客戶端相同）">
                  <Select
                    value={bankMonth}
                    onChange={(e) => setBankMonth(e.target.value)}
                  >
                    {months.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </Select>
                </Field>
              )}
              <Field label="公司名稱（選填提示）">
                <Input
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="提示 AI 抽取"
                />
              </Field>
            </div>

            <input
              ref={inputRef}
              type="file"
              multiple={docKind !== "br"}
              accept=".pdf,.txt,.md,.csv,.png,.jpg,.jpeg,.webp,.heic,application/pdf,image/*"
              className="hidden"
              onChange={(e) => addFiles(e.target.files)}
            />
            <Button
              type="button"
              variant="outline"
              fullWidth
              onClick={() => inputRef.current?.click()}
            >
              <FileUp className="mr-1.5 size-4" />
              選擇檔案（可多選；禁止重覆）
            </Button>

            <Field label="或貼上文字加入佇列">
              <Textarea
                value={pasteText}
                onChange={(e) => setPasteText(e.target.value)}
                placeholder="貼上結單／報告重點…"
              />
            </Field>
            <Button
              type="button"
              variant="outline"
              onClick={addPasteJob}
              disabled={!pasteText.trim()}
            >
              將文字加入佇列
            </Button>

            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                size="lg"
                disabled={running || queuedCount === 0}
                onClick={() => void runQueue()}
              >
                {running ? (
                  <>
                    <Loader2 className="mr-1.5 size-4 animate-spin" />
                    分析中…
                  </>
                ) : (
                  `開始分析佇列（${queuedCount}）`
                )}
              </Button>
              {enableArchive && doneCount > 0 && (
                <Button
                  type="button"
                  variant="secondary"
                  disabled={running}
                  onClick={() => void archiveAllDone()}
                >
                  <Archive className="mr-1.5 size-4" />
                  全部歸檔
                </Button>
              )}
              {doneCount > 0 && (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={clearDone}
                  disabled={running}
                >
                  清除已完成
                </Button>
              )}
            </div>
            <Disclaimer>
              規則與客戶申請「文件」步驟一致：強制 docKind=br|bank|audited；銀行帶
              statementMonth；多份銀行可走 batch 再合併六大項現金流。唔再用
              auto／三色燈初篩。
            </Disclaimer>
          </Card>

          {mergedBankBrief && (
            <Card>
              <SectionHeader
                title="六個月銀行現金流預審（合併）"
                subtitle={`還款能力：${assessmentLabel(mergedBankBrief.repaymentCapacity.overall)} · 與客戶端相同`}
              />
              <BankCashflowBriefPanel brief={mergedBankBrief} />
            </Card>
          )}

          {mergedAudited && (
            <Card>
              <SectionHeader
                title="審計報告合併（與客戶端相同）"
                subtitle="4.1 基本資料 · 4.2 三年比較"
              />
              <AuditedExtractPanel a={mergedAudited} />
            </Card>
          )}

          <Card className="space-y-2">
            <SectionHeader
              title={`分析佇列／結果（${queue.length}）`}
              subtitle="展開顯示與客戶端相同的抽取面板"
            />
            {queue.length === 0 ? (
              <p className="text-sm text-text-muted">尚未加入文件。</p>
            ) : (
              <ul className="space-y-2">
                {queue.map((item) => {
                  const open = expanded === item.localId;
                  return (
                    <li
                      key={item.localId}
                      className="rounded-xl border border-border bg-surface-1"
                    >
                      <div className="flex flex-wrap items-center gap-2 px-3 py-2">
                        <button
                          type="button"
                          className="flex min-w-0 flex-1 items-center gap-2 text-left"
                          onClick={() =>
                            setExpanded(open ? null : item.localId)
                          }
                        >
                          {open ? (
                            <ChevronUp className="size-4 shrink-0 text-text-muted" />
                          ) : (
                            <ChevronDown className="size-4 shrink-0 text-text-muted" />
                          )}
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-navy-900">
                              {item.label}
                            </p>
                            <p className="text-[11px] text-text-muted">
                              {item.docKind}
                              {item.statementMonth
                                ? ` · ${item.statementMonth}`
                                : ""}{" "}
                              ·{" "}
                              {item.status === "queued" && "等候中"}
                              {item.status === "running" && "分析中…"}
                              {item.status === "done" &&
                                `完成${item.archivedId ? " · 已歸檔" : ""}`}
                              {item.status === "error" &&
                                `失敗：${item.error || ""}`}
                            </p>
                          </div>
                        </button>
                        <div className="flex gap-1">
                          {item.status === "queued" && (
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              onClick={() => removeQueued(item.localId)}
                            >
                              移除
                            </Button>
                          )}
                          {enableArchive &&
                            item.status === "done" &&
                            item.result && (
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                disabled={
                                  Boolean(item.archivedId) ||
                                  archivingId === item.localId
                                }
                                onClick={() => void archiveItem(item)}
                              >
                                <Archive className="mr-1 size-3.5" />
                                {item.archivedId
                                  ? "已歸檔"
                                  : archivingId === item.localId
                                    ? "歸檔中…"
                                    : "歸檔"}
                              </Button>
                            )}
                        </div>
                      </div>
                      {open && item.result && (
                        <div className="border-t border-border px-3 py-3">
                          <ClientResultBody result={item.result} />
                        </div>
                      )}
                      {open && item.status === "error" && (
                        <div className="border-t border-border px-3 py-3 text-sm text-danger-600">
                          {item.error}
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>
        </>
      )}

      {tab === "archive" && enableArchive && (
        <>
          <Card className="space-y-3">
            <SectionHeader
              title="分析歸檔庫"
              subtitle="已保存結果（客戶端規則抽取）"
            />
            <div className="flex flex-wrap gap-2">
              <Input
                className="min-w-[200px] flex-1"
                placeholder="搜尋標題／檔名／公司…"
                value={archiveQ}
                onChange={(e) => setArchiveQ(e.target.value)}
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => void loadArchives()}
                disabled={archiveLoading}
              >
                重新整理
              </Button>
            </div>
            {archiveLoading ? (
              <p className="text-sm text-text-muted">載入中…</p>
            ) : filteredArchives.length === 0 ? (
              <p className="text-sm text-text-muted">尚無歸檔紀錄。</p>
            ) : (
              <ul className="space-y-2">
                {filteredArchives.map((a) => (
                  <li
                    key={a.id}
                    className="flex flex-wrap items-start justify-between gap-2 rounded-xl bg-surface-2 px-3 py-2"
                  >
                    <button
                      type="button"
                      className="min-w-0 flex-1 text-left"
                      onClick={() => void openArchive(a.id)}
                    >
                      <p className="font-medium text-navy-900">{a.title}</p>
                      <p className="text-xs text-text-secondary">
                        {a.docKind} · {a.companyName || "—"}
                        {a.overall ? ` · ${assessmentLabel(a.overall)}` : ""}
                      </p>
                      <p className="text-[11px] text-text-muted">
                        {formatDateTime(a.archivedAt)}
                        {a.archivedBy ? ` · ${a.archivedBy}` : ""}
                      </p>
                      {a.summary && (
                        <p className="mt-1 line-clamp-2 text-xs text-text-secondary">
                          {a.summary}
                        </p>
                      )}
                    </button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="border-red-300 text-red-700"
                      onClick={() => void deleteArchive(a.id)}
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          {archiveDetailId && (
            <Card className="space-y-3">
              <SectionHeader title="歸檔詳情" subtitle={archiveDetailId} />
              {!archiveDetail ? (
                <p className="text-sm text-text-muted">載入詳情…</p>
              ) : (
                <ClientResultBody result={archiveDetail} />
              )}
            </Card>
          )}
        </>
      )}
    </div>
  );
}
