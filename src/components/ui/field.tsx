import { InputHTMLAttributes, TextareaHTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/utils";

export function Field({
  label,
  required,
  hint,
  error,
  children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="text-sm font-medium text-text-primary">
        {label}
        {required && <span className="text-danger-600 ml-0.5">*</span>}
      </span>
      {children}
      {hint && !error && (
        <span className="block text-xs text-text-muted">{hint}</span>
      )}
      {error && <span className="block text-xs text-danger-600">{error}</span>}
    </label>
  );
}

export const Input = forwardRef<
  HTMLInputElement,
  InputHTMLAttributes<HTMLInputElement>
>(({ className, ...props }, ref) => (
  <input
    ref={ref}
    className={cn(
      "w-full h-11 rounded-xl border border-border bg-surface-1 px-3 text-sm text-text-primary outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-100 placeholder:text-text-muted",
      className,
    )}
    {...props}
  />
));
Input.displayName = "Input";

export const Textarea = forwardRef<
  HTMLTextAreaElement,
  TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => (
  <textarea
    ref={ref}
    className={cn(
      "w-full min-h-24 rounded-xl border border-border bg-surface-1 px-3 py-2.5 text-sm text-text-primary outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-100 placeholder:text-text-muted",
      className,
    )}
    {...props}
  />
));
Textarea.displayName = "Textarea";

export function Select({
  className,
  children,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        "w-full h-11 rounded-xl border border-border bg-surface-1 px-3 text-sm text-text-primary outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-100",
        className,
      )}
      {...props}
    >
      {children}
    </select>
  );
}
