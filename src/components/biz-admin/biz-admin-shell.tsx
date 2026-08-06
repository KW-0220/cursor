"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  ClipboardList,
  FolderOpen,
  LayoutDashboard,
  MessageCircle,
  Shield,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

const nav = [
  { href: "/biz-admin", label: "總覽", icon: LayoutDashboard, exact: true },
  {
    href: "/biz-admin/applications",
    label: "申請管理",
    icon: FolderOpen,
  },
  {
    href: "/biz-admin/supplements",
    label: "補件中心",
    icon: ClipboardList,
  },
  {
    href: "/biz-admin/whatsapp",
    label: "WhatsApp 通知",
    icon: MessageCircle,
  },
  {
    href: "/biz-admin/audit",
    label: "操作審計",
    icon: Shield,
  },
] as const;

export function BizAdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [email, setEmail] = useState<string | null>(null);
  const [name, setName] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const supabase = createClient();
        const { data, error } = await supabase.auth.getUser();
        const user = data.user;
        const role = user?.app_metadata?.role;
        if (error || !user || role !== "biz_admin") {
          router.replace("/biz-admin/login");
          return;
        }
        setEmail(user.email ?? null);
        setName(
          (user.user_metadata?.nameZh as string | undefined) ||
            "開戶文件審核員",
        );
        setChecking(false);
      } catch {
        router.replace("/biz-admin/login");
      }
    })();
  }, [router]);

  async function logout() {
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
    } catch {
      /* ignore */
    }
    router.push("/biz-admin/login");
    router.refresh();
  }

  if (checking) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-[color:var(--biz-surface-2)] text-sm text-[color:var(--biz-muted)]">
        正在驗證開戶文件通後台身分…
      </div>
    );
  }

  return (
    <div className="flex min-h-dvh">
      <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col border-r border-white/10 bg-[color:var(--biz-forest-950)] text-white lg:flex">
        <div className="border-b border-white/10 px-5 py-5">
          <p className="text-xs text-white/45">開戶文件通</p>
          <h1 className="mt-1 font-[family-name:var(--font-biz-display)] text-lg font-semibold tracking-wide">
            文件審核後台
          </h1>
        </div>
        <nav className="flex-1 space-y-1 overflow-y-auto p-3">
          {nav.map(({ href, label, icon: Icon, ...rest }) => {
            const exact = "exact" in rest && rest.exact;
            const active = exact
              ? pathname === href
              : pathname === href || pathname.startsWith(`${href}/`);
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm transition",
                  active
                    ? "bg-white/12 text-white"
                    : "text-white/60 hover:bg-white/5 hover:text-white",
                )}
              >
                <Icon className="size-4" />
                {label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-white/10 p-4 text-xs text-white/45">
          <p>角色：biz_admin</p>
          <p className="mt-1 truncate text-white/85">{name}</p>
          <p className="truncate">{email}</p>
          <button
            type="button"
            className="mt-2 text-[color:var(--biz-gold-500)] hover:underline"
            onClick={() => void logout()}
          >
            登出
          </button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col bg-[color:var(--biz-surface-2)]">
        <header className="sticky top-0 z-10 flex items-center justify-between border-b border-[color:var(--biz-border)] bg-[color:var(--biz-surface)]/95 px-4 py-3 backdrop-blur lg:px-8">
          <div className="lg:hidden">
            <p className="text-xs text-[color:var(--biz-muted)]">開戶文件通</p>
            <p className="font-semibold text-[color:var(--biz-ink)]">
              文件審核後台
            </p>
          </div>
          <div className="hidden text-sm text-[color:var(--biz-muted)] lg:block">
            獨立後台 · 非 SME LoanFlow · 非銀行審批
          </div>
          <div className="flex items-center gap-2">
            <nav className="mr-2 hidden gap-2 text-xs md:flex">
              {nav.map(({ href, label }) => (
                <Link
                  key={href}
                  href={href}
                  className="rounded-lg px-2 py-1 text-[color:var(--biz-muted)] hover:bg-[color:var(--biz-forest-100)] hover:text-[color:var(--biz-forest-800)] lg:hidden"
                >
                  {label}
                </Link>
              ))}
            </nav>
            <span className="max-w-[10rem] truncate rounded-full bg-[color:var(--biz-forest-100)] px-2.5 py-1 text-xs text-[color:var(--biz-forest-800)]">
              {email || "已登入"}
            </span>
            <Button size="sm" variant="outline" onClick={() => void logout()}>
              登出
            </Button>
          </div>
        </header>

        <div className="border-b border-[color:var(--biz-border)] bg-[color:var(--biz-surface)] px-4 py-2 lg:hidden">
          <div className="flex gap-1 overflow-x-auto">
            {nav.map(({ href, label }) => {
              const active =
                href === "/biz-admin"
                  ? pathname === href
                  : pathname.startsWith(href);
              return (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    "shrink-0 rounded-lg px-3 py-1.5 text-xs",
                    active
                      ? "bg-[color:var(--biz-forest-800)] text-white"
                      : "bg-[color:var(--biz-surface-2)] text-[color:var(--biz-muted)]",
                  )}
                >
                  {label}
                </Link>
              );
            })}
          </div>
        </div>

        <div className="flex-1 px-4 py-5 lg:px-8">{children}</div>
      </div>
    </div>
  );
}
