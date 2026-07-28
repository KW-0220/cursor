"use client";

import { formatDateTime } from "@/lib/utils";
import type { SaveUiStatus } from "@/hooks/use-application-draft";

const copy: Record<SaveUiStatus, string> = {
  idle: "",
  dirty: "尚有修改未儲存",
  saving: "正在儲存……",
  saved: "已自動儲存",
  error: "未能儲存，請重新嘗試",
  conflict: "此申請已在另一部裝置更新",
  offline: "已暫存在此裝置，恢復連線後會同步",
};

export function SaveStatusBar(props: {
  status: SaveUiStatus;
  lastSavedAt?: string | null;
  errorMessage?: string | null;
  onRetry?: () => void;
  onReloadConflict?: () => void;
}) {
  const { status, lastSavedAt, errorMessage, onRetry, onReloadConflict } =
    props;
  if (status === "idle") return null;

  let text = copy[status];
  if (status === "saved" && lastSavedAt) {
    text = `✓ 已於 ${formatDateTime(lastSavedAt)} 自動儲存`;
  }
  if ((status === "error" || status === "conflict") && errorMessage) {
    text = errorMessage;
  }

  const tone =
    status === "error" || status === "conflict"
      ? "bg-warning-100 text-warning-800 border-warning-600/20"
      : status === "saving" || status === "dirty"
        ? "bg-surface-2 text-text-secondary border-border"
        : status === "offline"
          ? "bg-warning-100/60 text-navy-800 border-border"
          : "bg-teal-100/80 text-teal-900 border-teal-500/20";

  return (
    <div
      className={`mx-4 mt-2 flex items-center justify-between gap-2 rounded-xl border px-3 py-2 text-xs ${tone}`}
      role="status"
      aria-live="polite"
    >
      <span>{text}</span>
      <span className="shrink-0">
        {status === "error" && onRetry ? (
          <button
            type="button"
            className="font-medium underline"
            onClick={onRetry}
          >
            重試
          </button>
        ) : null}
        {status === "conflict" && onReloadConflict ? (
          <button
            type="button"
            className="font-medium underline"
            onClick={onReloadConflict}
          >
            重新載入最新版本
          </button>
        ) : null}
      </span>
    </div>
  );
}
