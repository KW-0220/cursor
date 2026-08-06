import { cn } from "@/lib/utils";
import {
  BIZ_DOC_STATUS_LABEL,
  BIZ_STATUS_LABEL,
  type BizApplicationStatus,
  type BizDocStatus,
  type WhatsAppSendStatus,
} from "@/lib/bizdoc/types";
import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  FileWarning,
  Loader2,
  MessageCircle,
  XCircle,
} from "lucide-react";

const statusTone: Record<BizApplicationStatus, string> = {
  draft: "bg-[color:var(--biz-surface-2)] text-[color:var(--biz-muted)]",
  missing_docs: "bg-[color:var(--biz-gold-100)] text-[color:var(--biz-gold-800)]",
  submitted: "bg-[color:var(--biz-forest-100)] text-[color:var(--biz-forest-800)]",
  doc_review: "bg-[color:var(--biz-forest-100)] text-[color:var(--biz-forest-800)]",
  needs_supplement: "bg-[color:var(--biz-gold-100)] text-[color:var(--biz-gold-800)]",
  supplement_review: "bg-[color:var(--biz-forest-100)] text-[color:var(--biz-forest-800)]",
  docs_complete: "bg-success-100 text-success-600",
  next_stage: "bg-[color:var(--biz-forest-100)] text-[color:var(--biz-forest-800)]",
  sent_to_institution: "bg-[color:var(--biz-forest-100)] text-[color:var(--biz-forest-800)]",
  institution_processing: "bg-[color:var(--biz-forest-100)] text-[color:var(--biz-forest-800)]",
  needs_further_info: "bg-[color:var(--biz-gold-100)] text-[color:var(--biz-gold-800)]",
  completed: "bg-success-100 text-success-600",
  paused: "bg-danger-100 text-danger-600",
};

export function BizStatusBadge({ status }: { status: BizApplicationStatus }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium",
        statusTone[status],
      )}
    >
      {BIZ_STATUS_LABEL[status]}
    </span>
  );
}

export function BizDocBadge({ status }: { status: BizDocStatus }) {
  const map: Record<
    BizDocStatus,
    { className: string; icon: React.ReactNode }
  > = {
    not_uploaded: {
      className: "bg-[color:var(--biz-surface-2)] text-[color:var(--biz-muted)]",
      icon: <Clock3 className="size-3.5" />,
    },
    uploaded: {
      className: "bg-[color:var(--biz-forest-100)] text-[color:var(--biz-forest-800)]",
      icon: <CheckCircle2 className="size-3.5" />,
    },
    awaiting_review: {
      className: "bg-[color:var(--biz-forest-100)] text-[color:var(--biz-forest-800)]",
      icon: <Clock3 className="size-3.5" />,
    },
    reviewing: {
      className: "bg-[color:var(--biz-forest-100)] text-[color:var(--biz-forest-800)]",
      icon: <Loader2 className="size-3.5 animate-spin" />,
    },
    approved: {
      className: "bg-success-100 text-success-600",
      icon: <CheckCircle2 className="size-3.5" />,
    },
    needs_resubmit: {
      className: "bg-[color:var(--biz-gold-100)] text-[color:var(--biz-gold-800)]",
      icon: <FileWarning className="size-3.5" />,
    },
    unclear: {
      className: "bg-[color:var(--biz-gold-100)] text-[color:var(--biz-gold-800)]",
      icon: <AlertTriangle className="size-3.5" />,
    },
    expired: {
      className: "bg-danger-100 text-danger-600",
      icon: <XCircle className="size-3.5" />,
    },
    incomplete: {
      className: "bg-[color:var(--biz-gold-100)] text-[color:var(--biz-gold-800)]",
      icon: <AlertTriangle className="size-3.5" />,
    },
    wrong_type: {
      className: "bg-danger-100 text-danger-600",
      icon: <XCircle className="size-3.5" />,
    },
    inconsistent: {
      className: "bg-[color:var(--biz-gold-100)] text-[color:var(--biz-gold-800)]",
      icon: <AlertTriangle className="size-3.5" />,
    },
    reuploaded: {
      className: "bg-[color:var(--biz-forest-100)] text-[color:var(--biz-forest-800)]",
      icon: <Loader2 className="size-3.5" />,
    },
    not_applicable: {
      className: "bg-[color:var(--biz-surface-2)] text-[color:var(--biz-muted)]",
      icon: <CheckCircle2 className="size-3.5" />,
    },
  };
  const item = map[status];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium",
        item.className,
      )}
    >
      {item.icon}
      {BIZ_DOC_STATUS_LABEL[status]}
    </span>
  );
}

export function WhatsAppBadge({ status }: { status: WhatsAppSendStatus }) {
  const labels: Record<WhatsAppSendStatus, string> = {
    queued: "等待發送",
    sending: "發送中",
    sent: "已成功發送",
    delivered: "已送達",
    failed: "發送失敗",
    invalid_number: "電話號碼無效",
    undeliverable: "WhatsApp 未能送達",
    resent: "已重新發送",
  };
  const bad = ["failed", "invalid_number", "undeliverable"].includes(status);
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium",
        bad
          ? "bg-danger-100 text-danger-600"
          : "bg-[color:var(--biz-forest-100)] text-[color:var(--biz-forest-800)]",
      )}
    >
      <MessageCircle className="size-3.5" />
      {labels[status]}
    </span>
  );
}

export function BizProgressBar({ value }: { value: number }) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs text-[color:var(--biz-muted)]">
        <span>整體完成度</span>
        <span className="tabular font-medium text-[color:var(--biz-ink)]">
          {value}%
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-[color:var(--biz-surface-2)]">
        <div
          className="h-full rounded-full bg-[color:var(--biz-forest-700)] transition-all duration-500"
          style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
        />
      </div>
    </div>
  );
}
