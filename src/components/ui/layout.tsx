import { cn } from "@/lib/utils";

export function Card({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-border bg-surface-1 p-4 shadow-[var(--shadow-sm)]",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function SectionHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-3 flex items-start justify-between gap-3">
      <div>
        <h2 className="text-base font-semibold text-navy-900">{title}</h2>
        {subtitle && (
          <p className="mt-0.5 text-sm text-text-secondary">{subtitle}</p>
        )}
      </div>
      {action}
    </div>
  );
}

export function PageHeader({
  title,
  subtitle,
  backHref,
}: {
  title: string;
  subtitle?: string;
  backHref?: string;
}) {
  return (
    <header className="sticky top-0 z-20 border-b border-border bg-surface-1/95 px-4 py-3 backdrop-blur">
      <div className="flex items-center gap-3">
        {backHref && (
          <a
            href={backHref}
            className="text-sm text-teal-600 hover:underline"
          >
            返回
          </a>
        )}
        <div>
          <h1 className="text-lg font-semibold text-navy-900">{title}</h1>
          {subtitle && (
            <p className="text-xs text-text-secondary">{subtitle}</p>
          )}
        </div>
      </div>
    </header>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-surface-2/50 px-6 py-12 text-center">
      <h3 className="text-base font-semibold text-navy-900">{title}</h3>
      <p className="mt-2 max-w-xs text-sm text-text-secondary">{description}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function StateBanner({
  tone,
  title,
  description,
}: {
  tone: "info" | "success" | "warning" | "error";
  title: string;
  description: string;
}) {
  const tones = {
    info: "bg-teal-100 text-teal-600 border-teal-500/20",
    success: "bg-success-100 text-success-600 border-success-600/20",
    warning: "bg-warning-100 text-warning-600 border-warning-600/20",
    error: "bg-danger-100 text-danger-600 border-danger-600/20",
  };
  return (
    <div className={cn("rounded-2xl border p-3", tones[tone])}>
      <p className="text-sm font-semibold">{title}</p>
      <p className="mt-1 text-sm opacity-90">{description}</p>
    </div>
  );
}

export function Disclaimer({ children }: { children: React.ReactNode }) {
  return (
    <p className="rounded-xl bg-surface-2 px-3 py-2 text-xs leading-relaxed text-text-secondary">
      {children}
    </p>
  );
}

export function ProgressBar({ value }: { value: number }) {
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-surface-2">
      <div
        className="h-full rounded-full bg-teal-500 transition-all"
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
  );
}
