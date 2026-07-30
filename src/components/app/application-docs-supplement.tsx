"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Upload } from "lucide-react";
import { lastSixBankMonths } from "@/components/app/apply-documents-upload";
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
  const [kind, setKind] = useState("bank");
  const [bankMonth, setBankMonth] = useState(months[months.length - 1] ?? "");
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [flash, setFlash] = useState<string | null>(null);

  const loadDocs = useCallback(async () => {
    setLoading(true);
    setError(null);
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
      setError(e instanceof Error ? e.message : "無法載入已收集文件");
    } finally {
      setLoading(false);
    }
  }, [applicationId]);

  useEffect(() => {
    void loadDocs();
  }, [loadDocs]);

  async function upload() {
    if (!files.length || uploading) return;
    setUploading(true);
    setError(null);
    setFlash(null);
    try {
      const form = new FormData();
      files.forEach((file, i) => {
        form.append("files", file, file.name);
        form.append("kinds", kind);
        const slot =
          kind === "bank"
            ? `bank:${bankMonth}`
            : kind === "br"
              ? "br"
              : `${kind}:${Date.now()}-${i}`;
        form.append("slots", slot);
      });

      const res = await fetch(
        `/api/applications/${encodeURIComponent(applicationId)}/documents`,
        { method: "POST", body: form },
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.message || data.error || "上載失敗");
      }

      const uploaded = Number(data.count ?? files.length);
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

      // 粗略更新月結／完整度提示
      if (kind === "bank") {
        const bankSlots = new Set(
          [
            ...docs.filter((d) => d.kind === "bank").map((d) => d.slot),
            `bank:${bankMonth}`,
          ],
        );
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
          ? `已補交 ${uploaded} 份文件，申請已重新進入「審批中」。`
          : `已上載 ${uploaded} 份文件，後台客戶庫／案件會同步更新。`,
      );
      await loadDocs();
    } catch (e) {
      setError(e instanceof Error ? e.message : "上載失敗");
    } finally {
      setUploading(false);
    }
  }

  return (
    <Card className="space-y-4">
      <SectionHeader
        title="重新上載文件或補交文件"
        subtitle="可補交漏件，或以同類型檔案覆蓋／更新；補交後後台即時可見"
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
        {docs.length === 0 && !loading ? (
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
          <Select
            value={kind}
            onChange={(e) => setKind(e.target.value)}
          >
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

        <Field
          label="選擇檔案"
          hint="PDF／圖片，單檔 ≤ 15MB；可一次多選（審計／身份證明等）"
        >
          <input
            ref={inputRef}
            type="file"
            multiple={kind !== "br" && kind !== "bank"}
            accept=".pdf,image/*,.png,.jpg,.jpeg,.webp"
            className="block w-full text-sm text-text-secondary file:mr-3 file:rounded-lg file:border-0 file:bg-teal-100 file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-teal-800"
            onChange={(e) =>
              setFiles(Array.from(e.target.files ?? []).filter((f) => f.size > 0))
            }
          />
        </Field>

        {files.length > 0 && (
          <p className="text-xs text-text-muted">
            待上載：{files.map((f) => f.name).join("、")}
          </p>
        )}

        {error && (
          <StateBanner tone="error" title="上載失敗" description={error} />
        )}
        {flash && (
          <StateBanner tone="success" title="已提交" description={flash} />
        )}

        <Button
          fullWidth
          disabled={!files.length || uploading}
          onClick={() => void upload()}
        >
          <Upload className="mr-1.5 size-4" />
          {uploading ? "上載中…" : "上載／補交文件"}
        </Button>
      </div>
    </Card>
  );
}
