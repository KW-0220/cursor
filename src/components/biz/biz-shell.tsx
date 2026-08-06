"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bell,
  FileStack,
  FolderOpen,
  Home,
  UserRound,
} from "lucide-react";
import { cn } from "@/lib/utils";

const tabs = [
  { href: "/workspace", label: "概覽", icon: Home },
  { href: "/workspace/documents", label: "文件", icon: FolderOpen },
  { href: "/workspace/progress", label: "進度", icon: FileStack },
  { href: "/workspace/account", label: "帳戶", icon: UserRound },
];

export function BizShell({
  children,
  wide,
}: {
  children: React.ReactNode;
  wide?: boolean;
}) {
  return (
    <div className="biz-shell-bg min-h-dvh">
      <div className={cn("biz-shell flex min-h-dvh flex-col", wide && "biz-shell--wide")}>
        <BizTopNav />
        <div className="flex flex-1 flex-col">{children}</div>
        <BizBottomNav />
      </div>
    </div>
  );
}

function BizTopNav() {
  const pathname = usePathname();
  return (
    <header className="sticky top-0 z-30 border-b border-[color:var(--biz-border)] bg-[color:var(--biz-surface)]/95 backdrop-blur">
      <div className="flex items-center justify-between gap-4 px-4 py-3 md:px-8">
        <Link href="/workspace" className="min-w-0">
          <p className="font-[family-name:var(--font-biz-display)] text-lg font-semibold tracking-tight text-[color:var(--biz-ink)]">
            開戶文件通
          </p>
          <p className="text-[11px] text-[color:var(--biz-muted)]">
            公司成立及商業戶口 · 數碼申請工作空間
          </p>
        </Link>
        <nav className="hidden items-center gap-1 md:flex" aria-label="主要導覽">
          {tabs.map(({ href, label, icon: Icon }) => {
            const active =
              href === "/workspace"
                ? pathname === "/workspace"
                : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm transition",
                  active
                    ? "bg-[color:var(--biz-forest-100)] font-medium text-[color:var(--biz-forest-800)]"
                    : "text-[color:var(--biz-muted)] hover:bg-[color:var(--biz-surface-2)] hover:text-[color:var(--biz-ink)]",
                )}
              >
                <Icon className="size-4" />
                {label}
              </Link>
            );
          })}
          <Link
            href="/workspace/progress"
            className="ml-2 inline-flex size-9 items-center justify-center rounded-lg text-[color:var(--biz-muted)] hover:bg-[color:var(--biz-surface-2)]"
            aria-label="通知"
          >
            <Bell className="size-4" />
          </Link>
        </nav>
      </div>
    </header>
  );
}

function BizBottomNav() {
  const pathname = usePathname();
  return (
    <nav className="sticky bottom-0 z-30 border-t border-[color:var(--biz-border)] bg-[color:var(--biz-surface)]/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
      <ul className="grid grid-cols-4">
        {tabs.map(({ href, label, icon: Icon }) => {
          const active =
            href === "/workspace"
              ? pathname === "/workspace"
              : pathname.startsWith(href);
          return (
            <li key={href}>
              <Link
                href={href}
                className={cn(
                  "flex flex-col items-center gap-1 py-2.5 text-[11px]",
                  active
                    ? "text-[color:var(--biz-forest-800)]"
                    : "text-[color:var(--biz-muted)]",
                )}
              >
                <Icon
                  className={cn(
                    "size-5",
                    active && "text-[color:var(--biz-gold-600)]",
                  )}
                />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
