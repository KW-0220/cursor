"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Select } from "@/components/ui/field";
import {
  Card,
  SectionHeader,
  StateBanner,
} from "@/components/ui/layout";
import {
  patchStoredApplicationStatus,
  upsertStoredApplication,
  type StoredApplication,
} from "@/lib/applications-client";
import { normalizeClientAppStatus } from "@/lib/application-status";
import { uploadApplicationDocuments } from "@/lib/upload-application-documents";

type DocRow = {
  id: string;
  kind: string;
  kindLabel: string;
  slot: string;
  fileName: string;
  size: number;
  createdAt: string;
};

const KIND_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "br", label: "商業登記證 BR" },
  { value: "audited", label: "審計報告（Audited）" },
  { value: "bank", label: "銀行月結單" },
  { value: "identity", label: "身份證明" },
  { value: "company_other", label: "公司其他文件" },
  { value: "other", label: "其他補件" },
];

function lastSixBankMonths(now = new Date()): string[] {
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

function formatSize(n: number) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

export function ApplicationDocsSupplement({
  applicationId,
  app,
  onAppUpdated,
}: {
  applicationId: string;
  app: StoredApplication;
  onAppUpdated?: (next: StoredApplication) => void;
}) {
  const months = useMemo(() => lastSixBankMonths(), []);
  const inputRef = useRef<HTMLInputElement>(null);
  const [docs, setDocs] = useState<DocRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);
  const [kind, setKind] = useState("bank");
  const [bankMonth, setBankMonth] = useState(months[months.length - 1] ?? "");
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [flash, setFlash] = useState<string | null>(null);

  const loadDocs = useCallback(async () => {
    setLoading(true);
    setListError(null);
    try {
      const res = await fetch(
        `/api/applications/${encodeURIComponent(applicationId)}/documents`,
        { cache: "no-store" },
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.message || data.error || "無法載入已收集文件");
      }
      setDocs((data.documents ?? []) as DocRow[]);
    } catch (e) {
      setListError(e instanceof Error ? e.message : "無法載入已收集文件");
    } finally {
      setLoading(false);
    }
  }, [applicationId]);

  useEffect(() => {
    void loadDocs();
  }, [loadDocs]);

  function onPickFiles(list: FileList | null) {
    const next = Array.from(list ?? []).filter((f) => f.size > 0);
    setFiles(next);
    setUploadError(null);
    setFlash(null);
    const oversized = next.filter((f) => f.size > 15 * 1024 * 1024);
    if (oversized.length) {
      setUploadError(
        `${oversized.map((f) => f.name).join("、")} 超過 15MB，請壓縮後再選`,
      );
      setFiles(next.filter((f) => f.size <= 15 * 1024 * 1024));
    }
  }

  async function upload() {
    if (!files.length || uploading) return;
    setUploading(true);
    setUploadError(null);
    setFlash(null);
    try {
      const items = files.map((file, i) => ({
        file,
        kind,
        slot:
          kind === "bank"
            ? `bank:${bankMonth}`
            : kind === "br"
              ? "br"
              : `${kind}:${Date.now()}-${i}`,
      }));

      const uploaded = await uploadApplicationDocuments(
        applicationId,
        items,
      );

      let nextApp: StoredApplication = {
        ...app,
        updatedAt: new Date().toISOString(),
      };

      const wasRejected =
        normalizeClientAppStatus(app.status) === "rejected";
      if (wasRejected) {
        const patchRes = await fetch("/api/applications", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: applicationId,
            status: "under_review",
            failureReason: null,
          }),
        });
        if (patchRes.ok) {
          patchStoredApplicationStatus(applicationId, "under_review", null);
          nextApp = {
            ...nextApp,
            status: "under_review",
            failureReason: null,
          };
        }
      }

      if (kind === "bank") {
        const bankSlots = new Set([
          ...docs.filter((d) => d.kind === "bank").map((d) => d.slot),
          `bank:${bankMonth}`,
        ]);
        nextApp = {
          ...nextApp,
          bankCount: Math.min(6, bankSlots.size),
        };
      }
      upsertStoredApplication(nextApp);
      onAppUpdated?.(nextApp);

      setFiles([]);
      if (inputRef.current) inputRef.current.value = "";
      setFlash(
        wasRejected
          ? `已補交 ${uploaded.length} 份文件，申請已重新進入「審批中」。`
          : `已上載 ${uploaded.length} 份文件，已同步至後台客戶庫（請用同一登入帳戶）。`,
      );
      await loadDocs();
    } catch (e) {
      setUploadError(e instanceof Error ? e.message : "上載失敗");
    } finally {
      setUploading(false);
    }
  }

  return (
    <Card className="space-y-4">
      <SectionHeader
        title="重新上載文件或補交文件"
        subtitle="可補交漏件或以同類型檔案更新；大檔會直傳 Storage（唔經 Vercel 4.5MB 限制）"
      />

      {normalizeClientAppStatus(app.status) === "rejected" && (
        <StateBanner
          tone="warning"
          title="申請失敗後仍可補件"
          description="上載補件後，狀態會自動改回「審批中」，並清除先前失敗原因。"
        />
      )}

      <div>
        <p className="mb-2 text-xs font-medium text-text-muted">
          已收集文件
          {loading ? " · 載入中…" : ` · ${docs.length} 份`}
        </p>
        {listError && (
          <StateBanner
            tone="warning"
            title="文件列表暫未能載入"
            description={`${listError}（仍可嘗試上載）`}
          />
        )}
        {!listError && docs.length === 0 && !loading ? (
          <p className="text-sm text-text-muted">尚未有上載紀錄。</p>
        ) : (
          <ul className="space-y-2">
            {docs.map((d) => (
              <li
                key={d.id}
                className="rounded-xl bg-surface-2 px-3 py-2 text-sm"
              >
                <p className="font-medium text-navy-900">
                  {d.kindLabel}
                  <span className="ml-2 text-xs font-normal text-text-muted">
                    {d.slot}
                  </span>
                </p>
                <p className="text-xs text-text-secondary">
                  {d.fileName} · {formatSize(d.size)}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="space-y-3 border-t border-border pt-3">
        <Field label="文件類型">
          <Select value={kind} onChange={(e) => setKind(e.target.value)}>
            {KIND_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>
        </Field>

        {kind === "bank" && (
          <Field label="月結單月份">
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

        <div className="space-y-1.5">
          <p className="text-sm font-medium text-text-primary">選擇檔案</p>
          <input
            ref={inputRef}
            type="file"
            multiple={kind !== "br" && kind !== "bank"}
            accept="application/pdf,image/*,.pdf,.png,.jpg,.jpeg,.webp,.heic,.heif"
            className="hidden"
            onChange={(e) => onPickFiles(e.target.files)}
          />
          <Button
            type="button"
            variant="outline"
            fullWidth
            onClick={() => inputRef.current?.click()}
          >
            {files.length
              ? `已選 ${files.length} 個檔案（再選可更換）`
              : "點擊選擇 PDF／圖片"}
          </Button>
          <p className="text-xs text-text-muted">
            單檔 ≤ 15MB。大於約 3.5MB 會自動直傳，唔會因 Vercel 限制失敗。
          </p>
        </div>

        {files.length > 0 && (
          <ul className="space-y-1 text-xs text-text-secondary">
            {files.map((f) => (
              <li key={`${f.name}-${f.size}-${f.lastModified}`}>
                {f.name} · {formatSize(f.size)}
              </li>
            ))}
          </ul>
        )}

        {uploadError && (
          <StateBanner
            tone="error"
            title="上載失敗"
            description={uploadError}
          />
        )}
        {flash && (
          <StateBanner tone="success" title="已提交" description={flash} />
        )}

        <Button
          type="button"
          fullWidth
          disabled={!files.length || uploading}
          onClick={() => void upload()}
        >
          <Upload className="mr-1.5 size-4" />
          {uploading
            ? "上載中…"
            : files.length
              ? `上載／補交（${files.length}）`
              : "請先選擇檔案"}
        </Button>
      </div>
    </Card>
  );
}
