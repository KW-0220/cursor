"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Bot, ChevronRight, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, SectionHeader } from "@/components/ui/layout";

export default function HomePage() {
  const [name, setName] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch("/api/auth/me");
        const data = await res.json();
        if (res.ok && data.user?.nameZh) setName(data.user.nameZh);
      } catch {
        // ignore
      }
    })();
  }, []);

  return (
    <main className="px-4 pb-6 pt-5">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <p className="text-xs text-text-muted">
            {name ? `你好，${name}` : "你好"}
          </p>
          <h1 className="text-xl font-bold text-navy-900">SME LoanFlow</h1>
        </div>
        <Link
          href="/app/notifications"
          className="rounded-full bg-surface-2 px-3 py-1.5 text-xs font-medium text-navy-800"
        >
          通知
        </Link>
      </div>

      <Card className="bg-[linear-gradient(145deg,#12304a,#1a4060)] text-white">
        <p className="text-sm text-white/70">尚未有申請</p>
        <h2 className="mt-1 text-lg font-semibold">開始貸款申請</h2>
        <p className="mt-2 text-sm text-white/80">
          AI 先了解資金用途，再協助你準備文件與申請流程。
        </p>
        <Link href="/apply" className="mt-4 block">
          <Button className="bg-teal-500 hover:bg-teal-600" fullWidth>
            ＋ 新申請
          </Button>
        </Link>
      </Card>

      <SectionHeader title="快捷入口" />
      <div className="grid gap-2">
        {[
          { href: "/app/ai", label: "AI 財務助理", icon: Bot },
          {
            href: "/apply/documents",
            label: "資料收集：BR／NAR1／月結單／身份",
            icon: Bot,
          },
          {
            href: "/app/document-analysis",
            label: "上載文件 · AI 文件分析",
            icon: Bot,
          },
          { href: "/apply", label: "建立新申請", icon: ChevronRight },
          { href: "/app/account", label: "安全及私隱說明", icon: ShieldCheck },
        ].map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="flex items-center justify-between rounded-2xl border border-border bg-surface-1 px-4 py-3"
          >
            <span className="flex items-center gap-2 text-sm font-medium text-navy-900">
              <item.icon className="size-4 text-teal-600" />
              {item.label}
            </span>
            <ChevronRight className="size-4 text-text-muted" />
          </Link>
        ))}
      </div>
    </main>
  );
}
