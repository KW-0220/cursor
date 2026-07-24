"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { StateBanner } from "@/components/ui/layout";

/** Soft gate：未登入提示並導向註冊／登入；帳戶頁本身除外 */
export function RequireAuth({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [status, setStatus] = useState<"loading" | "ok" | "anon">("loading");

  useEffect(() => {
    if (pathname?.startsWith("/app/account")) {
      setStatus("ok");
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/auth/me");
        if (cancelled) return;
        setStatus(res.ok ? "ok" : "anon");
      } catch {
        if (!cancelled) setStatus("anon");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [pathname]);

  if (status === "loading") {
    return (
      <div className="px-4 py-10 text-center text-sm text-text-muted">
        核對登入狀態…
      </div>
    );
  }

  if (status === "anon") {
    return (
      <div className="space-y-4 px-4 py-8">
        <StateBanner
          tone="warning"
          title="請先註冊／登入"
          description="申請進度與帳戶資料需要真實登入狀態才能保存。"
        />
        <Button fullWidth size="lg" onClick={() => router.push("/auth/login")}>
          前往註冊／登入
        </Button>
        <Link
          href="/app/account"
          className="block text-center text-sm text-text-secondary underline"
        >
          查看帳戶頁
        </Link>
      </div>
    );
  }

  return <>{children}</>;
}
