"use client";

import { useRef, useState } from "react";
import { FileUp, Trash2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BizDocBadge } from "@/components/biz/status";
import type { BizDocSlotDef } from "@/lib/bizdoc/documents";
import { MAX_FILE_SIZE_BYTES } from "@/lib/bizdoc/documents";
import { formatBytes, formatDateTime } from "@/lib/bizdoc/completeness";
import type { BizUploadedFile } from "@/lib/bizdoc/types";
import { cn } from "@/lib/utils";

export function FileUploadCard({
  slot,
  files,
  onUpload,
  onRemove,
  locked,
}: {
  slot: BizDocSlotDef;
  files: BizUploadedFile[];
  onUpload: (file: File) => void;
  onRemove?: (fileId: string) => void;
  locked?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function acceptFile(file: File) {
    setError(null);
    const ext = file.name.split(".").pop()?.toUpperCase() ?? "";
    if (!slot.formats.includes(ext) && !(ext === "JPEG" && slot.formats.includes("JPG"))) {
      setError(`不支援 ${ext || "此"} 格式。接受：${slot.formats.join("、")}`);
      return;
    }
    if (file.size > MAX_FILE_SIZE_BYTES) {
      setError("檔案超過 20MB 上限");
      return;
    }
    if (files.length >= slot.maxFiles) {
      setError(`此分類最多 ${slot.maxFiles} 份`);
      return;
    }
    onUpload(file);
  }

  return (
    <section className="rounded-2xl border border-[color:var(--biz-border)] bg-[color:var(--biz-surface)] p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-base font-semibold text-[color:var(--biz-ink)]">
              {slot.name}
            </h3>
            <span
              className={cn(
                "rounded-md px-2 py-0.5 text-[11px] font-medium",
                slot.required
                  ? "bg-[color:var(--biz-gold-100)] text-[color:var(--biz-gold-800)]"
                  : "bg-[color:var(--biz-surface-2)] text-[color:var(--biz-muted)]",
              )}
            >
              {slot.required ? "必須" : "選填"}
            </span>
          </div>
          <p className="mt-1 text-sm text-[color:var(--biz-muted)]">{slot.purpose}</p>
        </div>
      </div>

      <ul className="mt-3 space-y-1 text-sm text-[color:var(--biz-ink)]/80">
        {slot.requirements.map((r) => (
          <li key={r} className="flex gap-2">
            <span className="mt-1.5 size-1 shrink-0 rounded-full bg-[color:var(--biz-gold-600)]" />
            <span>{r}</span>
          </li>
        ))}
      </ul>

      <p className="mt-3 text-xs text-[color:var(--biz-muted)]">
        接受格式：{slot.formats.join("、")} · 上限 20MB
        {slot.tips[0] ? ` · ${slot.tips[0]}` : ""}
      </p>

      {!locked && (
        <div
          className={cn(
            "mt-4 rounded-xl border border-dashed px-4 py-6 text-center transition",
            dragOver
              ? "border-[color:var(--biz-forest-600)] bg-[color:var(--biz-forest-100)]"
              : "border-[color:var(--biz-border)] bg-[color:var(--biz-surface-2)]/60",
          )}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            const f = e.dataTransfer.files?.[0];
            if (f) acceptFile(f);
          }}
        >
          <Upload className="mx-auto size-6 text-[color:var(--biz-forest-700)]" />
          <p className="mt-2 text-sm font-medium text-[color:var(--biz-ink)]">
            拖放上載，或選擇檔案／拍攝
          </p>
          <p className="mt-1 text-xs text-[color:var(--biz-muted)]">
            手機拍攝提示：四角完整、避免反光、文字清晰、平整背景
          </p>
          <div className="mt-4 flex justify-center gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => inputRef.current?.click()}
            >
              <FileUp className="size-4" />
              選擇文件
            </Button>
          </div>
          <input
            ref={inputRef}
            type="file"
            accept={slot.formats.map((f) => `.${f.toLowerCase()}`).join(",")}
            capture="environment"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) acceptFile(f);
              e.target.value = "";
            }}
          />
        </div>
      )}

      {error && (
        <p className="mt-3 text-sm text-danger-600" role="alert">
          {error}
        </p>
      )}

      {files.length > 0 && (
        <ul className="mt-4 space-y-2">
          {files.map((f) => (
            <li
              key={f.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[color:var(--biz-border)] bg-[color:var(--biz-surface)] px-3 py-3"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-[color:var(--biz-ink)]">
                  {f.originalName}
                </p>
                <p className="text-xs text-[color:var(--biz-muted)]">
                  {formatBytes(f.sizeBytes)} · {formatDateTime(f.uploadedAt)} ·{" "}
                  {f.uploadedBy}
                  {f.version > 1 ? ` · v${f.version}` : ""}
                </p>
                {f.issueReason && (
                  <p className="mt-1 text-xs text-[color:var(--biz-gold-800)]">
                    補件原因：{f.issueType} — {f.issueReason}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2">
                <BizDocBadge status={f.status} />
                {onRemove &&
                  f.status !== "approved" &&
                  !locked && (
                    <button
                      type="button"
                      className="rounded-lg p-2 text-[color:var(--biz-muted)] hover:bg-danger-100 hover:text-danger-600"
                      onClick={() => onRemove(f.id)}
                      aria-label="刪除文件"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
