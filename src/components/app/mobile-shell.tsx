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

export function BottomNav() {
  const pathname = usePathname();
  return (
    <nav className="sticky bottom-0 z-30 border-t border-border bg-surface-1/95 px-2 pb-[env(safe-area-inset-bottom)] backdrop-blur">
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

export function MobileShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-[linear-gradient(180deg,#e8eef4_0%,#f5f7fa_40%,#f5f7fa_100%)]">
      <div className="mobile-shell flex flex-col">{children}</div>
    </div>
  );
}
