import { cn } from "@/lib/utils";
import {
  DATA_SOURCE_LABEL,
  type DataSourceKind,
  type PolicyItemStatus,
} from "@/lib/policy";
import { TrafficLight } from "@/components/ui/status";

export function DataSourceTag({ kind }: { kind: DataSourceKind }) {
  const tone =
    kind === "ai_extract"
      ? "bg-teal-100 text-teal-600"
      : kind === "customer_declare"
        ? "bg-navy-900/10 text-navy-800"
        : "bg-warning-100 text-warning-600";
  return (
    <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-medium", tone)}>
      {DATA_SOURCE_LABEL[kind]}
    </span>
  );
}

export function PolicyStatusBadge({ status }: { status: PolicyItemStatus }) {
  if (status === "na") {
    return (
      <span className="rounded-full bg-surface-2 px-2.5 py-1 text-xs font-medium text-text-secondary">
        不適用
      </span>
    );
  }
  return <TrafficLight result={status} compact />;
}
