"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bot,
  Database,
  FileSearch,
  LayoutDashboard,
  Settings2,
  Shield,
  ClipboardList,
} from "lucide-react";
import { cn } from "@/lib/utils";

const nav = [
  { href: "/admin", label: "案件總覽", icon: LayoutDashboard },
  { href: "/admin/customers", label: "客戶登記資料庫", icon: Database },
  { href: "/admin/cases/SLF-2026-00482", label: "財務簡報示範", icon: FileSearch },
  { href: "/admin/leads/SLF-2026-00482", label: "Lead 預審轉介", icon: Bot },
  { href: "/admin/policy/SLF-2026-00482", label: "政策核對（十項）", icon: ClipboardList },
  { href: "/admin/cashflow-rules", label: "現金流審批規則", icon: Settings2 },
  { href: "/admin/ai-analyze", label: "AI 文件分析", icon: Bot },
  { href: "/admin/supplements", label: "補件管理", icon: ClipboardList },
  { href: "/admin/rules", label: "初篩規則", icon: Settings2 },
  { href: "/admin/audit", label: "審計紀錄", icon: Shield },
];

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <div className="admin-shell flex min-h-dvh">
      <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col border-r border-border bg-navy-950 text-white lg:flex">
        <div className="border-b border-white/10 px-5 py-5">
          <p className="text-xs text-white/50">SME LoanFlow</p>
          <h1 className="mt-1 text-lg font-semibold">內部審批控制台</h1>
        </div>
        <nav className="flex-1 space-y-1 p-3">
          {nav.map(({ href, label, icon: Icon }) => {
            const active =
              href === "/admin"
                ? pathname === "/admin"
                : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm transition",
                  active
                    ? "bg-white/10 text-white"
                    : "text-white/65 hover:bg-white/5 hover:text-white",
                )}
              >
                <Icon className="size-4" />
                {label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-white/10 p-4 text-xs text-white/50">
          <p>角色：顧問 · 李美欣</p>
          <Link href="/app" className="mt-2 inline-block text-teal-500 hover:underline">
            ← 返回客戶端 App
          </Link>
        </div>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-surface-1/95 px-4 py-3 backdrop-blur lg:px-8">
          <div className="lg:hidden">
            <p className="text-xs text-text-muted">SME LoanFlow Admin</p>
            <p className="font-semibold text-navy-900">內部控制台</p>
          </div>
          <div className="hidden text-sm text-text-secondary lg:block">
            Desktop Web 優先 · 角色權限控管
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className="rounded-full bg-success-100 px-2.5 py-1 text-success-600">
              已登入
            </span>
            <span className="rounded-full bg-surface-2 px-2.5 py-1 text-text-secondary">
              Audit Log 啟用
            </span>
          </div>
        </header>
        <div className="flex-1 px-4 py-5 lg:px-8">{children}</div>
      </div>
    </div>
  );
}
