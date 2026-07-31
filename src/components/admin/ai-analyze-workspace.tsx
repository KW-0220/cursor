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
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import {
  Card,
  Disclaimer,
  SectionHeader,
  StateBanner,
} from "@/components/ui/layout";
import { TrafficLight } from "@/components/ui/status";
import { cn, formatDateTime, formatHKD } from "@/lib/utils";

type AnalyzePayload = Record<string, unknown> & {
  ok?: boolean;
  error?: string;
  message?: string;
  fileName?: string;
  docKind?: string;
  model?: string;
  extract?: Record<string, unknown>;
  bankExtract?: Record<string, unknown>;
  brExtract?: Record<string, unknown>;
  auditedExtract?: Record<string, unknown>;
  analysis?: {
    documentType?: string;
    summary?: string;
    overall?: string;
    confidence?: number;
    needsHumanReview?: boolean;
    applicantFacingMessage?: string;
    companyNameGuess?: string;
    completeness?: { ok: string[]; issues: string[] };
    ruleHits?: Array<{
      rule: string;
      status: "green" | "amber" | "red";
      detail: string;
      suggestion?: string;
    }>;
  };
  ebitdaAnalysis?: {
    formula?: string;
    coverageRule?: string;
    coversDebtPayments?: boolean | null;
  };
  disclaimer?: string;
};

type QueueItem = {
  localId: string;
  file: File | null;
  pastedText: string;
  label: string;
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

const DOC_KINDS = [
  { value: "auto", label: "自動判斷" },
  { value: "br", label: "商業登記證 BR" },
  { value: "bank", label: "銀行月結單" },
  { value: "audited", label: "審計報告" },
  { value: "nar1", label: "NAR1" },
  { value: "financial", label: "其他財務文件" },
] as const;

function money(n: unknown) {
  if (typeof n !== "number" || !Number.isFinite(n)) return "—";
  return formatHKD(n);
}

function overallLabel(o?: string | null) {
  if (o === "green") return "綠燈";
  if (o === "amber") return "黃燈";
  if (o === "red") return "紅燈";
  return o || "—";
}

function ResultBody({
  result,
  showTrafficLight,
}: {
  result: AnalyzePayload;
  showTrafficLight: boolean;
}) {
  const extract = result.extract;
  const analysis = result.analysis;
  const br = result.brExtract as Record<string, unknown> | undefined;
  const bank = result.bankExtract as Record<string, unknown> | undefined;
  const audited = result.auditedExtract as Record<string, unknown> | undefined;

  return (
    <div className="space-y-3 text-sm">
      {analysis?.summary && (
        <p className="text-text-secondary">{analysis.summary}</p>
      )}
      {analysis?.applicantFacingMessage && (
        <p className="text-navy-900">{analysis.applicantFacingMessage}</p>
      )}

      {br && (
        <dl className="grid gap-1 rounded-xl bg-surface-2 px-3 py-2 text-xs sm:grid-cols-2">
          {(
            [
              ["中文名", br.company_name_zh],
              ["英文名", br.company_name_en],
              ["BR", br.br_number],
              ["地址", br.business_address],
              ["性質", br.business_nature],
              ["屆滿", br.expiry_date],
            ] as [string, unknown][]
          ).map(([k, v]) => (
            <div key={k} className="flex justify-between gap-2">
              <dt className="text-text-muted">{k}</dt>
              <dd className="text-right text-navy-900">
                {v == null || v === "" ? "—" : String(v)}
              </dd>
            </div>
          ))}
        </dl>
      )}

      {bank && (
        <dl className="grid gap-1 rounded-xl bg-surface-2 px-3 py-2 text-xs sm:grid-cols-2">
          {(
            [
              ["月份", bank.month],
              ["銀行", bank.bank_name],
              ["總存入", money(bank.total_credits)],
              ["總支出", money(bank.total_debits)],
              ["期初", money(bank.opening_balance)],
              ["期末", money(bank.closing_balance)],
            ] as [string, unknown][]
          ).map(([k, v]) => (
            <div key={k} className="flex justify-between gap-2">
              <dt className="text-text-muted">{k}</dt>
              <dd className="text-right tabular text-navy-900">{v as string}</dd>
            </div>
          ))}
        </dl>
      )}

      {audited && (
        <dl className="grid gap-1 rounded-xl bg-surface-2 px-3 py-2 text-xs sm:grid-cols-2">
          {(
            [
              ["公司", audited.company_name],
              ["年結", audited.year_end_date],
              ["核數師", audited.auditor_name],
              ["意見", audited.audit_opinion_type],
            ] as [string, unknown][]
          ).map(([k, v]) => (
            <div key={k} className="flex justify-between gap-2">
              <dt className="text-text-muted">{k}</dt>
              <dd className="text-right text-navy-900">
                {v == null || v === "" ? "—" : String(v)}
              </dd>
            </div>
          ))}
        </dl>
      )}

      {extract && !br && !bank && !audited && (
        <dl className="space-y-1.5">
          {(
            [
              ["公司名稱", extract.company_name ?? "—"],
              ["財政年度", extract.financial_year ?? "—"],
              ["營業額", money(extract.revenue)],
              ["EBITDA", money(extract.EBITDA)],
              ["純利", money(extract.net_profit)],
              ["現有債務", money(extract.existing_debt)],
            ] as [string, unknown][]
          ).map(([label, value]) => (
            <div
              key={label}
              className="flex justify-between gap-3 border-b border-border/50 pb-1"
            >
              <dt className="text-xs text-text-muted">{label}</dt>
              <dd className="text-right text-xs font-medium tabular text-navy-900">
                {String(value)}
              </dd>
            </div>
          ))}
        </dl>
      )}

      {showTrafficLight && analysis?.overall && (
        <TrafficLight
          result={analysis.overall as "green" | "amber" | "red"}
          label="整體初篩"
          detail={analysis.summary || ""}
        />
      )}

      {showTrafficLight &&
        analysis?.ruleHits?.map((hit) => (
          <TrafficLight
            key={hit.rule + hit.detail}
            result={hit.status}
            label={hit.rule}
            detail={hit.detail}
            suggestion={hit.suggestion}
          />
        ))}

      <p className="text-[11px] text-text-muted">
        模型 {result.model || "—"} · 類型 {result.docKind || "auto"}
        {analysis?.confidence != null
          ? ` · 信心 ${(analysis.confidence * 100).toFixed(0)}%`
          : ""}
      </p>
    </div>
  );
}

export function AiAnalyzeWorkspace({
  showTrafficLight = true,
  enableArchive = true,
}: {
  showTrafficLight?: boolean;
  enableArchive?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [tab, setTab] = useState<"analyze" | "archive">("analyze");
  const [loanType, setLoanType] = useState("unsecured");
  const [amountHkd, setAmountHkd] = useState(1500000);
  const [purpose, setPurpose] = useState("營運資金");
  const [companyName, setCompanyName] = useState("");
  const [docKind, setDocKind] = useState("auto");
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
    if (tab === "archive") void loadArchives();
  }, [tab, loadArchives]);

  function addFiles(list: FileList | File[] | null) {
    const files = Array.from(list ?? []).filter((f) => f.size > 0);
    if (!files.length) return;
    setQueue((prev) => [
      ...prev,
      ...files.map((file) => ({
        localId: `Q-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
        file,
        pastedText: "",
        label: file.name,
        status: "queued" as const,
      })),
    ]);
    setFlash(`已加入 ${files.length} 個檔案（佇列可繼續加，無上限）`);
    setError(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  function addPasteJob() {
    const text = pasteText.trim();
    if (!text) {
      setError("請先貼上文字");
      return;
    }
    setQueue((prev) => [
      ...prev,
      {
        localId: `Q-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
        file: null,
        pastedText: text,
        label: `貼上文字（${text.length} 字）`,
        status: "queued",
      },
    ]);
    setPasteText("");
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

  async function analyzeOne(item: QueueItem): Promise<QueueItem> {
    const form = new FormData();
    if (item.file) form.set("file", item.file);
    if (item.pastedText) form.set("text", item.pastedText);
    form.set("loanType", loanType);
    form.set("amountHkd", String(amountHkd));
    form.set("purpose", purpose);
    if (companyName.trim()) form.set("companyName", companyName.trim());
    if (docKind && docKind !== "auto") form.set("docKind", docKind);

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
      result: data,
      label: data.fileName || item.label,
    };
  }

  async function runQueue() {
    if (running) return;
    const pending = queue.filter((q) => q.status === "queued");
    if (!pending.length) {
      setError("佇列沒有待分析項目——請先上載或貼上文件");
      return;
    }
    setRunning(true);
    setError(null);
    setFlash(null);
    for (const item of pending) {
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
    setFlash("佇列分析完成。可繼續上載更多文件，或將結果歸檔。");
  }

  async function archiveItem(item: QueueItem) {
    if (!item.result || !enableArchive) return;
    setArchivingId(item.localId);
    setError(null);
    try {
      const res = await fetch("/api/admin/analysis-archive", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: item.label,
          fileName: item.result.fileName || item.label,
          docKind: item.result.docKind || docKind,
          companyName: companyName || item.result.analysis?.companyNameGuess || null,
          loanType,
          amountHkd,
          purpose,
          summary: item.result.analysis?.summary ?? null,
          overall: item.result.analysis?.overall ?? null,
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
    const targets = queue.filter((q) => q.status === "done" && q.result && !q.archivedId);
    for (const item of targets) {
      await archiveItem(item);
    }
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
            歸檔庫（{archives.length || "…"}）
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
              title="無限上載 · AI 文件分析"
              subtitle="可連續加入檔案／文字，逐份分析；完成後可歸檔保存"
            />
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="文件類型提示">
                <Select
                  value={docKind}
                  onChange={(e) => setDocKind(e.target.value)}
                >
                  {DOC_KINDS.map((k) => (
                    <option key={k.value} value={k.value}>
                      {k.label}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="貸款類型">
                <Select
                  value={loanType}
                  onChange={(e) => setLoanType(e.target.value)}
                >
                  <option value="unsecured">無抵押</option>
                  <option value="secured">有抵押</option>
                </Select>
              </Field>
              <Field label="申請金額 HKD">
                <Input
                  type="number"
                  className="tabular"
                  value={amountHkd}
                  onChange={(e) => setAmountHkd(Number(e.target.value))}
                />
              </Field>
              <Field label="公司名稱（選填）">
                <Input
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="提示 AI 抽取"
                />
              </Field>
              <Field label="用途" hint="整批佇列共用此上下文">
                <Input
                  value={purpose}
                  onChange={(e) => setPurpose(e.target.value)}
                />
              </Field>
            </div>

            <input
              ref={inputRef}
              type="file"
              multiple
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
              選擇檔案（可多選，可重複加入）
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
                  全部歸檔未存結果
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
              單檔建議 ≤ 12MB。佇列無數量上限；AI 只做抽取／預審，不直接批核。
            </Disclaimer>
          </Card>

          <Card className="space-y-2">
            <SectionHeader
              title={`分析佇列／結果（${queue.length}）`}
              subtitle="點項目展開詳情；完成後可歸檔"
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
                          <ResultBody
                            result={item.result}
                            showTrafficLight={showTrafficLight}
                          />
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
              subtitle="已保存的 AI 分析結果，可重看／刪除"
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
                        {a.docKind} · {a.companyName || "—"} ·{" "}
                        {overallLabel(a.overall)}
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
              <SectionHeader
                title="歸檔詳情"
                subtitle={archiveDetailId}
              />
              {!archiveDetail ? (
                <p className="text-sm text-text-muted">載入詳情…</p>
              ) : (
                <ResultBody
                  result={archiveDetail}
                  showTrafficLight={showTrafficLight}
                />
              )}
            </Card>
          )}
        </>
      )}
    </div>
  );
}
