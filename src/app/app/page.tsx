import Link from "next/link";
import { Bot, ChevronRight, ShieldCheck } from "lucide-react";
import { applications, supplements } from "@/lib/mock-data";
import { formatDateTime, formatHKD } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, ProgressBar, SectionHeader, StateBanner } from "@/components/ui/layout";
import { StatusTag } from "@/components/ui/status";

export default function HomePage() {
  const active = applications[0];
  const hasApplication = true;

  return (
    <main className="px-4 pb-6 pt-5">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <p className="text-xs text-text-muted">你好，陳大文</p>
          <h1 className="text-xl font-bold text-navy-900">SME LoanFlow</h1>
        </div>
        <Link
          href="/app/notifications"
          className="rounded-full bg-surface-2 px-3 py-1.5 text-xs font-medium text-navy-800"
        >
          通知 3
        </Link>
      </div>

      {!hasApplication ? (
        <div className="space-y-4">
          <Card className="bg-[linear-gradient(145deg,#12304a,#1a4060)] text-white">
            <p className="text-sm text-white/70">歡迎使用</p>
            <h2 className="mt-1 text-lg font-semibold">開始貸款申請</h2>
            <p className="mt-2 text-sm text-white/80">
              AI 先了解資金用途，再協助你準備文件與申請流程。
            </p>
            <Link href="/apply" className="mt-4 block">
              <Button className="bg-teal-500 hover:bg-teal-600" fullWidth>
                開始貸款申請
              </Button>
            </Link>
          </Card>
        </div>
      ) : (
        <div className="space-y-4 animate-fade-up">
          <StateBanner
            tone="warning"
            title="有待處理事項"
            description={supplements[0].detail}
          />

          <Card>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs text-text-muted">{active.id}</p>
                <h2 className="mt-1 font-semibold text-navy-900">
                  {active.loanType === "secured" ? "有抵押貸款" : "無抵押貸款"}
                </h2>
                <p className="mt-1 tabular text-sm text-text-secondary">
                  {formatHKD(active.amount)} · {active.purpose}
                </p>
              </div>
              <StatusTag status={active.status} />
            </div>
            <div className="mt-4 space-y-2">
              <div className="flex justify-between text-xs text-text-secondary">
                <span>文件完整度</span>
                <span className="tabular">{active.documentCompleteness}%</span>
              </div>
              <ProgressBar value={active.documentCompleteness} />
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
              <div className="rounded-xl bg-surface-2 p-3">
                <p className="text-text-muted">負責顧問</p>
                <p className="mt-1 font-medium text-navy-900">{active.advisor}</p>
              </div>
              <div className="rounded-xl bg-surface-2 p-3">
                <p className="text-text-muted">最近更新</p>
                <p className="mt-1 font-medium text-navy-900">
                  {formatDateTime(active.updatedAt)}
                </p>
              </div>
            </div>
            <div className="mt-4 flex gap-2">
              <Link href={`/app/applications/${active.id}`} className="flex-1">
                <Button fullWidth>查看申請進度</Button>
              </Link>
              <Link href="/app/supplements" className="flex-1">
                <Button fullWidth variant="outline">
                  補件中心
                </Button>
              </Link>
            </div>
          </Card>
        </div>
      )}

      <SectionHeader title="快捷入口" />
      <div className="grid gap-2">
        {[
          { href: "/app/ai", label: "AI 貸款需求分析", icon: Bot },
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
