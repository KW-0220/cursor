"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function BizAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const supabase = createClient();
        const { data, error } = await supabase.auth.getUser();
        const user = data.user;
        const role = user?.app_metadata?.role;
        if (error || !user || role !== "admin") {
          router.replace("/auth/login?intent=login&mode=admin");
          return;
        }
        setEmail(user.email ?? null);
        setReady(true);
      } catch {
        router.replace("/auth/login");
      }
    })();
  }, [router]);

  if (!ready) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-[color:var(--biz-surface-2)] text-sm text-[color:var(--biz-muted)]">
        正在驗證管理員身分（Supabase）…
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-[color:var(--biz-surface-2)]">
      <header className="border-b border-[color:var(--biz-border)] bg-[color:var(--biz-forest-950)] text-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 md:px-6">
          <div>
            <p className="text-xs text-white/50">開戶文件通 · 後台 · Supabase</p>
            <h1 className="text-lg font-semibold">申請與文件審核</h1>
          </div>
          <nav className="flex flex-wrap items-center gap-3 text-sm">
            <span className="hidden text-white/40 sm:inline">{email}</span>
            <Link href="/biz-admin" className="text-white/80 hover:text-white">
              申請列表
            </Link>
            <Link href="/workspace" className="text-white/50 hover:text-white">
              客戶端
            </Link>
            <Link href="/admin" className="text-white/50 hover:text-white">
              貸款後台
            </Link>
            <Link href="/" className="text-white/50 hover:text-white">
              首頁
            </Link>
          </nav>
        </div>
      </header>
      <div className="mx-auto max-w-7xl px-4 py-6 md:px-6">{children}</div>
    </div>
  );
}
