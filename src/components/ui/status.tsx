import { cn } from "@/lib/utils";
import type { ApplicationStatus, DocumentStatus, ScreeningResult } from "@/lib/types";
import { DOC_STATUS_LABEL, STATUS_LABEL } from "@/lib/types";
import { AlertTriangle, CheckCircle2, CircleAlert, Clock3, FileWarning, Loader2, XCircle } from "lucide-react";

const statusTone: Record<ApplicationStatus, string> = {
  Draft: "bg-surface-2 text-text-secondary",
  Submitted: "bg-navy-900/10 text-navy-800",
  "AI Processing": "bg-navy-900/10 text-navy-800",
  "Under Review": "bg-navy-900/10 text-navy-800",
  "Additional Info Required": "bg-navy-900/10 text-navy-800",
  Matched: "bg-navy-900/10 text-navy-800",
  "Sent to Lender": "bg-navy-900/10 text-navy-800",
  Approved: "bg-success-100 text-success-600",
  "Not Approved": "bg-danger-100 text-danger-600",
  Withdrawn: "bg-danger-100 text-danger-600",
};

export function StatusTag({ status }: { status: ApplicationStatus }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium",
        statusTone[status],
      )}
    >
      {STATUS_LABEL[status]}
    </span>
  );
}

export function DocStatusTag({ status }: { status: DocumentStatus }) {
  const map: Record<DocumentStatus, { className: string; icon: React.ReactNode }> = {
    pending: { className: "bg-surface-2 text-text-secondary", icon: <Clock3 className="size-3.5" /> },
    uploading: { className: "bg-teal-100 text-teal-600", icon: <Loader2 className="size-3.5 animate-spin" /> },
    classifying: { className: "bg-teal-100 text-teal-600", icon: <Loader2 className="size-3.5 animate-spin" /> },
    analyzing: { className: "bg-teal-100 text-teal-600", icon: <Loader2 className="size-3.5 animate-spin" /> },
    completed: { className: "bg-success-100 text-success-600", icon: <CheckCircle2 className="size-3.5" /> },
    needs_attention: { className: "bg-warning-100 text-warning-600", icon: <AlertTriangle className="size-3.5" /> },
    failed: { className: "bg-danger-100 text-danger-600", icon: <XCircle className="size-3.5" /> },
    supplement_required: { className: "bg-warning-100 text-warning-600", icon: <FileWarning className="size-3.5" /> },
  };
  const item = map[status];
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium", item.className)}>
      {item.icon}
      {DOC_STATUS_LABEL[status]}
    </span>
  );
}

export function TrafficLight({
  result,
  label,
  detail,
  suggestion,
  compact,
}: {
  result: ScreeningResult;
  label?: string;
  detail?: string;
  suggestion?: string;
  compact?: boolean;
}) {
  const config = {
    green: {
      bg: "bg-success-100",
      text: "text-success-600",
      border: "border-success-600/20",
      title: "綠燈",
      icon: <CheckCircle2 className="size-5" />,
    },
    amber: {
      bg: "bg-warning-100",
      text: "text-warning-600",
      border: "border-warning-600/20",
      title: "黃燈",
      icon: <AlertTriangle className="size-5" />,
    },
    red: {
      bg: "bg-danger-100",
      text: "text-danger-600",
      border: "border-danger-600/20",
      title: "紅燈",
      icon: <CircleAlert className="size-5" />,
    },
  }[result];

  if (compact) {
    return (
      <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold", config.bg, config.text)}>
        {config.icon}
        {config.title}
        {label ? `｜${label}` : ""}
      </span>
    );
  }

  return (
    <div className={cn("rounded-2xl border p-4", config.bg, config.border)}>
      <div className={cn("flex items-center gap-2 font-semibold", config.text)}>
        {config.icon}
        <span>
          {config.title}
          {label ? `｜${label}` : ""}
        </span>
      </div>
      {detail && <p className="mt-2 text-sm text-text-primary">{detail}</p>}
      {suggestion && (
        <p className="mt-2 text-sm text-text-secondary">{suggestion}</p>
      )}
    </div>
  );
}
