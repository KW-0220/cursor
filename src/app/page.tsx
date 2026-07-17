import Link from "next/link";
import { Button } from "@/components/ui/button";
import { MobileShell } from "@/components/app/mobile-shell";

export default function SplashPage() {
  return (
    <MobileShell>
      <main className="flex flex-1 flex-col items-center justify-center px-8 py-16 text-center">
        <div className="animate-fade-up mb-8 flex size-20 items-center justify-center rounded-3xl bg-navy-900 text-2xl font-bold text-white shadow-[var(--shadow-md)]">
          SL
        </div>
        <h1 className="animate-fade-up text-3xl font-bold tracking-tight text-navy-900">
          SME LoanFlow
        </h1>
        <p className="animate-fade-up mt-3 max-w-xs text-sm leading-relaxed text-text-secondary [animation-delay:80ms]">
          中小企融資，由準備文件開始變得更簡單
        </p>
        <div className="animate-pulse-soft mt-10 h-1.5 w-28 overflow-hidden rounded-full bg-surface-2">
          <div className="h-full w-2/3 rounded-full bg-teal-500" />
        </div>
        <div className="mt-16 flex w-full flex-col gap-3">
          <Link href="/onboarding">
            <Button fullWidth size="lg">
              開始體驗
            </Button>
          </Link>
          <Link href="/app">
            <Button fullWidth variant="outline" size="lg">
              跳過介紹（示範帳戶）
            </Button>
          </Link>
          <Link
            href="/admin"
            className="text-center text-xs text-text-muted hover:text-teal-600"
          >
            進入內部審批控制台 →
          </Link>
        </div>
      </main>
    </MobileShell>
  );
}
