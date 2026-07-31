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
  BankSystemChecksPanel,
  BrExtractPanel,
  IdentityExtractPanel,
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
  buildBankSystemChecks,
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
import { toIdentityExtract } from "@/lib/identity-extract";
import { cn, formatDateTime } from "@/lib/utils";

type AdminDocKind = "br" | "bank" | "audited" | "identity";
type PersonRole = "董事" | "股東" | "個人擔保人";

type AnalyzePayload = Record<string, unknown> & {
  ok?: boolean;
  error?: string;
  message?: string;
  fileName?: string;
  docKind?: string;
  personRole?: string | null;
  model?: string;
  extractHint?: string | null;
  bankExtract?: unknown;
  brExtract?: unknown;
  auditedExtract?: unknown;
  identityExtract?: unknown;
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
  docKind: AdminDocKind;
  statementMonth: string | null;
  personRole: PersonRole | null;
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

const PERSON_ROLES: PersonRole[] = ["董事", "股東", "個人擔保人"];

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

function isPdfFile(file: File) {
  const name = file.name.toLowerCase();
  return (
    file.type === "application/pdf" ||
    name.endsWith(".pdf") ||
    file.type === ""
  );
}

function RequirementsList({ items }: { items: string[] }) {
  return (
    <ul className="list-disc space-y-1 pl-5 text-xs text-text-secondary">
      {items.map((t) => (
        <li key={t}>{t}</li>
      ))}
    </ul>
  );
}

function ClientResultBody({
  result,
  monthlyDebtPayments,
}: {
  result: AnalyzePayload;
  monthlyDebtPayments?: number | null;
}) {
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
        <AuditedExtractPanel
          a={a}
          monthlyDebtPayments={monthlyDebtPayments}
        />
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

  if (kind === "identity" && result.identityExtract) {
    return (
      <div className="space-y-2">
        {hint && (
          <StateBanner tone="info" title="抽取提示" description={hint} />
        )}
        <IdentityExtractPanel
          identity={toIdentityExtract(result.identityExtract)}
          personRole={
            typeof result.personRole === "string" ? result.personRole : null
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
        result.message ||
        "請確認文件類型與上載檔案相符後重試。"
      }
    />
  );
}

export function AiAnalyzeWorkspace({
  enableArchive = true,
}: {
  showTrafficLight?: boolean;
  enableArchive?: boolean;
}) {
  const months = useMemo(() => lastSixBankMonths(), []);
  const bankInputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const brInputRef = useRef<HTMLInputElement>(null);
  const auditedInputRef = useRef<HTMLInputElement>(null);
  const identityInputRef = useRef<HTMLInputElement>(null);

  const [tab, setTab] = useState<"analyze" | "archive">("analyze");
  const [companyName, setCompanyName] = useState("");
  const [personRole, setPersonRole] = useState<PersonRole>("董事");
  const [monthlyDebtPayments, setMonthlyDebtPayments] = useState("");
  const [gearingThreshold, setGearingThreshold] = useState("4");
  const [pasteText, setPasteText] = useState("");
  const [pasteKind, setPasteKind] = useState<AdminDocKind>("br");
  const [pasteBankMonth, setPasteBankMonth] = useState(
    months[months.length - 1] ?? "",
  );
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

  const monthlyDebtNum = useMemo(() => {
    const n = Number(monthlyDebtPayments.replace(/,/g, "").trim());
    return Number.isFinite(n) && monthlyDebtPayments.trim() ? n : null;
  }, [monthlyDebtPayments]);

  const gearingThresholdNum = useMemo(() => {
    const n = Number(gearingThreshold);
    return Number.isFinite(n) && n > 0 ? n : 4;
  }, [gearingThreshold]);

  const queuedCount = useMemo(
    () => queue.filter((q) => q.status === "queued").length,
    [queue],
  );
  const doneCount = useMemo(
    () => queue.filter((q) => q.status === "done").length,
    [queue],
  );

  const bankStatements = useMemo(() => {
    const banks: BankStatementExtract[] = [];
    for (const q of queue) {
      if (q.status !== "done" || q.docKind !== "bank" || !q.result?.bankExtract)
        continue;
      banks.push(toBankStatementExtract(q.result.bankExtract));
    }
    return banks;
  }, [queue]);

  const mergedBankBrief = useMemo(() => {
    if (!bankStatements.length) return null;
    return mergeBankStatementExtracts(bankStatements);
  }, [bankStatements]);

  const bankChecks = useMemo(
    () =>
      buildBankSystemChecks(bankStatements, {
        expectedMonths: months,
        companyNameHint: companyName,
      }),
    [bankStatements, months, companyName],
  );

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

  const brDone = useMemo(
    () =>
      queue.find(
        (q) => q.docKind === "br" && q.status === "done" && q.result?.brExtract,
      ) ?? null,
    [queue],
  );

  const identityDone = useMemo(
    () =>
      queue.filter(
        (q) =>
          q.docKind === "identity" &&
          q.status === "done" &&
          q.result?.identityExtract,
      ),
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
    if (enableArchive) void loadArchives();
  }, [enableArchive, loadArchives]);

  useEffect(() => {
    if (tab === "archive") void loadArchives();
  }, [tab, loadArchives]);

  function pushAccepted(
    accepted: QueueItem[],
    dupNames: string[],
    kindLabel: string,
  ) {
    if (accepted.length) {
      setQueue((prev) => [...prev, ...accepted]);
      setFlash(
        `已加入 ${accepted.length} 份${kindLabel}` +
          (dupNames.length ? `；略過重覆 ${dupNames.length}` : ""),
      );
    } else setFlash(null);

    if (dupNames.length) {
      setError(
        `禁止上載重覆文件：${dupNames.slice(0, 5).join("、")}` +
          (dupNames.length > 5 ? ` 等 ${dupNames.length} 個` : ""),
      );
    } else setError(null);
  }

  function collectAccepted(
    files: File[],
    opts: {
      docKind: AdminDocKind;
      statementMonth?: string | null;
      personRole?: PersonRole | null;
      pdfOnly?: boolean;
    },
  ) {
    const existing = new Set(queue.map((q) => q.fingerprint));
    const archivedNames = new Set(
      archives
        .map((a) => a.fileName?.trim().toLowerCase())
        .filter((n): n is string => Boolean(n)),
    );
    const accepted: QueueItem[] = [];
    const dupNames: string[] = [];
    const rejected: string[] = [];
    const seenInBatch = new Set<string>();

    for (const file of files) {
      if (opts.pdfOnly && !isPdfFile(file)) {
        rejected.push(file.name);
        continue;
      }
      // 拒絕對銀行月結用圖檔副檔名（即使 MIME 空白）
      if (opts.pdfOnly) {
        const lower = file.name.toLowerCase();
        if (
          /\.(jpe?g|png|gif|webp|heic|xlsx?|xls|csv)$/i.test(lower)
        ) {
          rejected.push(file.name);
          continue;
        }
      }
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
      // 銀行：同一月份只留一份
      if (
        opts.docKind === "bank" &&
        opts.statementMonth &&
        (queue.some(
          (q) =>
            q.docKind === "bank" &&
            q.statementMonth === opts.statementMonth &&
            q.status !== "error",
        ) ||
          accepted.some((q) => q.statementMonth === opts.statementMonth))
      ) {
        dupNames.push(`${file.name}（${opts.statementMonth} 已有）`);
        continue;
      }
      seenInBatch.add(fp);
      accepted.push({
        localId: `Q-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
        fingerprint: fp,
        file,
        pastedText: "",
        label:
          opts.docKind === "bank"
            ? `${file.name}（${opts.statementMonth}）`
            : opts.docKind === "identity"
              ? `${file.name}（${opts.personRole || "身份證明"}）`
              : file.name,
        docKind: opts.docKind,
        statementMonth: opts.statementMonth ?? null,
        personRole: opts.personRole ?? null,
        status: "queued",
      });
    }

    if (rejected.length) {
      setError(
        `只接受 PDF：已拒絕 ${rejected.slice(0, 5).join("、")}` +
          (rejected.length > 5 ? ` 等 ${rejected.length} 個` : "") +
          "（不接受 JPG／PNG／截圖／Excel）",
      );
    }

    return { accepted, dupNames };
  }

  function addBankFile(month: string, list: FileList | null) {
    const files = Array.from(list ?? []).filter((f) => f.size > 0);
    if (!files.length) return;
    const { accepted, dupNames } = collectAccepted(files.slice(0, 1), {
      docKind: "bank",
      statementMonth: month,
      pdfOnly: true,
    });
    pushAccepted(accepted, dupNames, `銀行月結（${month}）`);
    const el = bankInputRefs.current[month];
    if (el) el.value = "";
  }

  function addBrFiles(list: FileList | null) {
    const files = Array.from(list ?? []).filter((f) => f.size > 0);
    if (!files.length) return;
    const { accepted, dupNames } = collectAccepted(files.slice(0, 1), {
      docKind: "br",
    });
    pushAccepted(accepted, dupNames, "商業登記證 BR");
    if (brInputRef.current) brInputRef.current.value = "";
  }

  function addAuditedFiles(list: FileList | null) {
    const files = Array.from(list ?? []).filter((f) => f.size > 0);
    if (!files.length) return;
    const existingAudited = queue.filter((q) => q.docKind === "audited").length;
    const room = Math.max(0, 3 - existingAudited);
    const { accepted, dupNames } = collectAccepted(files.slice(0, room || 1), {
      docKind: "audited",
      pdfOnly: true,
    });
    if (!room) {
      setError("Audited Report 最多上載 3 份（最近三年）");
      return;
    }
    pushAccepted(accepted, dupNames, "Audited Report");
    if (auditedInputRef.current) auditedInputRef.current.value = "";
  }

  function addIdentityFiles(list: FileList | null) {
    const files = Array.from(list ?? []).filter((f) => f.size > 0);
    if (!files.length) return;
    const { accepted, dupNames } = collectAccepted(files, {
      docKind: "identity",
      personRole,
    });
    pushAccepted(accepted, dupNames, `身份證明（${personRole}）`);
    if (identityInputRef.current) identityInputRef.current.value = "";
  }

  function addPasteJob() {
    const text = pasteText.trim();
    if (!text) {
      setError("請先貼上文字");
      return;
    }
    if (pasteKind === "bank" && !pasteBankMonth) {
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
          pasteKind === "bank"
            ? ` · ${pasteBankMonth}`
            : pasteKind === "identity"
              ? ` · ${personRole}`
              : ` · ${pasteKind}`
        }`,
        docKind: pasteKind,
        statementMonth: pasteKind === "bank" ? pasteBankMonth : null,
        personRole: pasteKind === "identity" ? personRole : null,
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

  async function analyzeOne(item: QueueItem): Promise<QueueItem> {
    const form = new FormData();
    if (item.file) form.set("file", item.file);
    if (item.pastedText) form.set("text", item.pastedText);
    form.set("docKind", item.docKind);
    if (item.statementMonth) form.set("statementMonth", item.statementMonth);
    if (item.personRole) form.set("personRole", item.personRole);
    if (companyName.trim()) form.set("companyName", companyName.trim());
    if (item.docKind === "audited" && monthlyDebtNum != null) {
      form.set("monthlyDebtPayments", String(monthlyDebtNum));
    }

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
      result: {
        ...data,
        docKind: data.docKind || item.docKind,
        personRole: data.personRole ?? item.personRole,
      },
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

    const bankPending = pending.filter((q) => q.docKind === "bank" && q.file);
    const otherPending = pending.filter(
      (q) => !(q.docKind === "bank" && q.file),
    );

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
    setFlash("佇列分析完成（按文件類別獨立抽取）。");
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
      if (item.docKind === "identity" && item.result.identityExtract) {
        const id = toIdentityExtract(item.result.identityExtract);
        summaryBits.push(
          [item.personRole, id.full_name_zh || id.full_name_en, id.id_number]
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

  const queueByKind = (kind: AdminDocKind) =>
    queue.filter((q) => q.docKind === kind);

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
              title="AI 文件分析（按類別分開上載）"
              subtitle="每類文件獨立上載區＋獨立分析要求；禁止重覆檔案"
            />
            <Field label="公司名稱（選填提示）">
              <Input
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="提示 AI 抽取／系統檢查同一公司"
              />
            </Field>
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
          </Card>

          {/* —— 銀行月結 —— */}
          <Card className="space-y-3">
            <SectionHeader
              title="1. 最近六個月銀行月結單"
              subtitle="只接受 PDF · 六個月份必須連續 · 完整交易紀錄"
            />
            <div className="grid gap-3 lg:grid-cols-2">
              <div className="space-y-2">
                <p className="text-xs font-semibold text-navy-900">文件要求</p>
                <RequirementsList
                  items={[
                    "公司最近六個月主要銀行戶口月結單",
                    "只接受 PDF（銀行原始電子結單或完整掃描）",
                    "六個月份必須連續",
                    "必須包括完整交易紀錄及結單頁面",
                    "不接受 JPG、PNG、截圖或 Excel 手動整理表",
                  ]}
                />
              </div>
              <div className="space-y-2">
                <p className="text-xs font-semibold text-navy-900">使用目的／AI 分析</p>
                <RequirementsList
                  items={[
                    "公司現金流",
                    "每月及每日戶口結餘",
                    "營業進帳、進帳頻率及來源",
                    "戶口異常紀錄",
                    "公司基本還款能力",
                  ]}
                />
              </div>
            </div>
            <div className="space-y-2">
              <p className="text-xs font-semibold text-navy-900">
                按月份分開上載（PDF）
              </p>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {months.map((m) => {
                  const existing = queue.find(
                    (q) =>
                      q.docKind === "bank" &&
                      q.statementMonth === m &&
                      q.status !== "error",
                  );
                  return (
                    <div
                      key={m}
                      className="rounded-xl border border-border bg-surface-1 px-3 py-2"
                    >
                      <div className="mb-2 flex items-center justify-between gap-2">
                        <span className="text-sm font-medium text-navy-900">
                          {m}
                        </span>
                        <span className="text-[11px] text-text-muted">
                          {existing
                            ? existing.status === "done"
                              ? "已分析"
                              : existing.status === "running"
                                ? "分析中"
                                : "已加入"
                            : "未上載"}
                        </span>
                      </div>
                      <input
                        ref={(el) => {
                          bankInputRefs.current[m] = el;
                        }}
                        type="file"
                        accept="application/pdf,.pdf"
                        className="hidden"
                        onChange={(e) => addBankFile(m, e.target.files)}
                      />
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        fullWidth
                        disabled={Boolean(existing) || running}
                        onClick={() => bankInputRefs.current[m]?.click()}
                      >
                        <FileUp className="mr-1 size-3.5" />
                        {existing ? "已佔位" : "上載 PDF"}
                      </Button>
                      {existing?.status === "queued" && (
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          className="mt-1 w-full"
                          onClick={() => removeQueued(existing.localId)}
                        >
                          移除
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
            {queueByKind("bank").length > 0 && (
              <p className="text-xs text-text-muted">
                銀行佇列：{queueByKind("bank").length} 份
              </p>
            )}
          </Card>

          {/* —— 身份證明 —— */}
          <Card className="space-y-3">
            <SectionHeader
              title="2. 身份證明文件"
              subtitle="所有董事、股東及個人擔保人（政策未定前按全員處理）"
            />
            <div className="grid gap-3 lg:grid-cols-2">
              <div className="space-y-2">
                <p className="text-xs font-semibold text-navy-900">必須提供人士</p>
                <RequirementsList
                  items={[
                    "所有董事",
                    "所有股東",
                    "所有個人擔保人",
                    "日後可於後台設定持股比例門檻（例如 ≥25%）；現階段按全員",
                  ]}
                />
              </div>
              <div className="space-y-2">
                <p className="text-xs font-semibold text-navy-900">接受文件</p>
                <RequirementsList
                  items={["香港身份證", "護照"]}
                />
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="人士角色">
                <Select
                  value={personRole}
                  onChange={(e) =>
                    setPersonRole(e.target.value as PersonRole)
                  }
                >
                  {PERSON_ROLES.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </Select>
              </Field>
              <div className="flex items-end">
                <input
                  ref={identityInputRef}
                  type="file"
                  multiple
                  accept=".pdf,.png,.jpg,.jpeg,.webp,application/pdf,image/*"
                  className="hidden"
                  onChange={(e) => addIdentityFiles(e.target.files)}
                />
                <Button
                  type="button"
                  variant="outline"
                  fullWidth
                  onClick={() => identityInputRef.current?.click()}
                >
                  <FileUp className="mr-1.5 size-4" />
                  上載身份證明（{personRole}）
                </Button>
              </div>
            </div>
            {identityDone.length > 0 && (
              <div className="space-y-3">
                {identityDone.map((item) => (
                  <div
                    key={item.localId}
                    className="rounded-xl border border-border px-3 py-2"
                  >
                    <p className="mb-2 text-xs font-medium text-navy-900">
                      {item.label}
                    </p>
                    <IdentityExtractPanel
                      identity={toIdentityExtract(
                        item.result!.identityExtract,
                      )}
                      personRole={item.personRole}
                    />
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* —— BR —— */}
          <Card className="space-y-3">
            <SectionHeader
              title="3. 商業登記證 BR"
              subtitle="最新有效副本 · 公司名稱及登記號碼不可遮擋"
            />
            <div className="grid gap-3 lg:grid-cols-2">
              <div className="space-y-2">
                <p className="text-xs font-semibold text-navy-900">文件要求</p>
                <RequirementsList
                  items={[
                    "最新及有效的商業登記證副本",
                    "文件資料必須清晰可見",
                    "公司名稱及商業登記號碼不可被遮擋",
                  ]}
                />
              </div>
              <div className="space-y-2">
                <p className="text-xs font-semibold text-navy-900">AI 需要提取</p>
                <RequirementsList
                  items={[
                    "公司中文名稱／英文名稱",
                    "商業登記號碼",
                    "業務地址",
                    "業務性質（如有）",
                    "生效日期／屆滿日期",
                  ]}
                />
              </div>
            </div>
            <input
              ref={brInputRef}
              type="file"
              accept=".pdf,.png,.jpg,.jpeg,.webp,application/pdf,image/*"
              className="hidden"
              onChange={(e) => addBrFiles(e.target.files)}
            />
            <Button
              type="button"
              variant="outline"
              fullWidth
              onClick={() => brInputRef.current?.click()}
            >
              <FileUp className="mr-1.5 size-4" />
              上載商業登記證
            </Button>
            {brDone?.result?.brExtract ? (
              <BrExtractPanel
                br={toBrExtract(
                  brDone.result.brExtract as Partial<BrExtract>,
                )}
              />
            ) : null}
          </Card>

          {/* —— Audited —— */}
          <Card className="space-y-3">
            <SectionHeader
              title="4. Audited Report（最近三年）"
              subtitle="4.1–4.7：基本資料 · 盈利 · EBITDA · 資產負債 · Gearing · DSCR · 營業額穩定性"
            />
            <RequirementsList
              items={[
                "最近三年經審計財務報表（PDF）",
                "EBITDA＝除稅前溢利＋融資成本＋折舊＋攤銷（有披露則直接提取）",
                "Gearing＝總負債÷有形淨資產（權益－無形－商譽）",
                "DSCR＝EBITDA÷一年總債務支出（月供×12）；缺供款且 EBITDA>0 → 黃燈跟進",
              ]}
            />
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="現有每月供款總和（DSCR 用，選填）">
                <Input
                  value={monthlyDebtPayments}
                  onChange={(e) => setMonthlyDebtPayments(e.target.value)}
                  placeholder="例如 50000"
                  inputMode="decimal"
                />
              </Field>
              <Field label="Gearing 政策門檻">
                <Input
                  value={gearingThreshold}
                  onChange={(e) => setGearingThreshold(e.target.value)}
                  placeholder="4"
                  inputMode="decimal"
                />
              </Field>
            </div>
            <input
              ref={auditedInputRef}
              type="file"
              multiple
              accept="application/pdf,.pdf"
              className="hidden"
              onChange={(e) => addAuditedFiles(e.target.files)}
            />
            <Button
              type="button"
              variant="outline"
              fullWidth
              onClick={() => auditedInputRef.current?.click()}
            >
              <FileUp className="mr-1.5 size-4" />
              上載 Audited Report（最多 3 份 PDF）
            </Button>
            {queueByKind("audited").length > 0 && (
              <p className="text-xs text-text-muted">
                Audited 佇列：{queueByKind("audited").length}／3
              </p>
            )}
          </Card>

          {/* 可選：貼上文字 */}
          <Card className="space-y-3">
            <SectionHeader
              title="或貼上文字（進階）"
              subtitle="用於已 OCR 的文字／測試抽取"
            />
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="對應類別">
                <Select
                  value={pasteKind}
                  onChange={(e) =>
                    setPasteKind(e.target.value as AdminDocKind)
                  }
                >
                  <option value="bank">銀行月結</option>
                  <option value="identity">身份證明</option>
                  <option value="br">商業登記證 BR</option>
                  <option value="audited">Audited Report</option>
                </Select>
              </Field>
              {pasteKind === "bank" && (
                <Field label="月結月份">
                  <Select
                    value={pasteBankMonth}
                    onChange={(e) => setPasteBankMonth(e.target.value)}
                  >
                    {months.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </Select>
                </Field>
              )}
            </div>
            <Field label="文字內容">
              <Textarea
                value={pasteText}
                onChange={(e) => setPasteText(e.target.value)}
                placeholder="貼上結單／報告／證件 OCR 文字…"
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
          </Card>

          {mergedBankBrief && (
            <Card className="space-y-4">
              <SectionHeader
                title="銀行月結 · 系統檢查"
                subtitle="連續六個月／同一公司／同一戶口／完整性／可讀性"
              />
              <BankSystemChecksPanel checks={bankChecks} />
              <SectionHeader
                title="六個月銀行現金流預審（合併）"
                subtitle={`還款能力：${assessmentLabel(mergedBankBrief.repaymentCapacity.overall)}`}
              />
              <BankCashflowBriefPanel brief={mergedBankBrief} />
            </Card>
          )}

          {mergedAudited && (
            <Card>
              <SectionHeader
                title="Audited Report 合併分析（4.1–4.7）"
                subtitle={
                  monthlyDebtNum != null
                    ? `已套用每月供款 ${monthlyDebtNum}`
                    : "尚未填每月供款 → DSCR 黃燈跟進（若 EBITDA>0）"
                }
              />
              <AuditedExtractPanel
                a={mergedAudited}
                monthlyDebtPayments={monthlyDebtNum}
                gearingThreshold={gearingThresholdNum}
              />
            </Card>
          )}

          <Card className="space-y-2">
            <SectionHeader
              title={`分析佇列／結果（${queue.length}）`}
              subtitle="按類別展開個別結果"
            />
            {queue.length === 0 ? (
              <p className="text-sm text-text-muted">
                請於上方各類別區塊分開上載文件。
              </p>
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
                                : ""}
                              {item.personRole ? ` · ${item.personRole}` : ""} ·{" "}
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
                          <ClientResultBody
                            result={item.result}
                            monthlyDebtPayments={monthlyDebtNum}
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
            <Disclaimer>
              各類文件分開上載；銀行只收 PDF；身份證明標註董事／股東／擔保人；Audited
              顯示 4.1–4.7 指標。AI 不直接決定批出貸款。
            </Disclaimer>
          </Card>
        </>
      )}

      {tab === "archive" && enableArchive && (
        <>
          <Card className="space-y-3">
            <SectionHeader
              title="分析歸檔庫"
              subtitle="已保存結果"
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
                <ClientResultBody
                  result={archiveDetail}
                  monthlyDebtPayments={monthlyDebtNum}
                />
              )}
            </Card>
          )}
        </>
      )}
    </div>
  );
}
