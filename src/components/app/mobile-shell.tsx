"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bot, FileText, Home, UserRound } from "lucide-react";
import { cn } from "@/lib/utils";

const tabs = [
  { href: "/app", label: "首頁", icon: Home },
  { href: "/app/applications", label: "申請", icon: FileText },
  { href: "/app/ai", label: "AI 助理", icon: Bot },
  { href: "/app/account", label: "我的帳戶", icon: UserRound },
];

/** 流動版底部四 Tab（md 以下） */
export function BottomNav() {
  const pathname = usePathname();
  return (
    <nav className="sticky bottom-0 z-30 border-t border-border bg-surface-1/95 px-2 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
      <ul className="grid grid-cols-4">
        {tabs.map(({ href, label, icon: Icon }) => {
          const active =
            href === "/app" ? pathname === "/app" : pathname.startsWith(href);
          return (
            <li key={href}>
              <Link
                href={href}
                className={cn(
                  "flex flex-col items-center gap-1 py-2.5 text-[11px]",
                  active ? "text-navy-900" : "text-text-muted",
                )}
              >
                <Icon className={cn("size-5", active && "text-teal-600")} />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/** 網頁版頂部導航（md 以上）；路由與 BottomNav 相同 */
export function ClientTopNav() {
  const pathname = usePathname();
  return (
    <header className="sticky top-0 z-30 hidden border-b border-border bg-surface-1/95 backdrop-blur md:block">
      <div className="flex items-center justify-between gap-4 px-6 py-3">
        <div className="min-w-0">
          <p className="text-[11px] font-medium uppercase tracking-wide text-text-muted">
            客戶端網頁版
          </p>
          <p className="truncate text-sm font-semibold text-navy-900">
            SME LoanFlow
          </p>
        </div>
        <nav aria-label="客戶端主要導覽">
          <ul className="flex flex-wrap items-center gap-1">
            {tabs.map(({ href, label, icon: Icon }) => {
              const active =
                href === "/app"
                  ? pathname === "/app"
                  : pathname.startsWith(href);
              return (
                <li key={href}>
                  <Link
                    href={href}
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm transition",
                      active
                        ? "bg-teal-100 font-medium text-teal-800"
                        : "text-text-secondary hover:bg-surface-2 hover:text-navy-900",
                    )}
                  >
                    <Icon className="size-4" />
                    {label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>
    </header>
  );
}

/**
 * 客戶端共用殼：
 * - 流動：維持原 430px phone frame
 * - 桌面網頁：放寬至可讀寬度，同一套路由／API／資料
 * Admin 控制台不使用此殼。
 */
export function ClientShell({
  children,
  wide = false,
}: {
  children: React.ReactNode;
  /** 申請精靈等較闊內容 */
  wide?: boolean;
}) {
  return (
    <div className="client-shell-bg min-h-dvh">
      <div
        className={cn(
          "client-shell flex flex-col",
          wide && "client-shell--wide",
        )}
      >
        {children}
      </div>
    </div>
  );
}

/** 向後相容別名——既有頁面 import MobileShell 唔使改 */
export const MobileShell = ClientShell;
