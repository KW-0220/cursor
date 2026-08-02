import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ClientShell } from "@/components/app/mobile-shell";

export default function SplashPage() {
  return (
    <ClientShell>
      <main className="flex flex-1 flex-col items-center justify-center px-8 py-16 text-center md:px-12 md:py-20">
        <div className="animate-fade-up mb-8 flex size-20 items-center justify-center rounded-3xl bg-navy-900 text-2xl font-bold text-white shadow-[var(--shadow-md)]">
          SL
        </div>
        <h1 className="animate-fade-up text-3xl font-bold tracking-tight text-navy-900 md:text-4xl">
          SME LoanFlow
        </h1>
        <p className="animate-fade-up mt-3 max-w-md text-sm leading-relaxed text-text-secondary [animation-delay:80ms] md:text-base">
          中小企融資，由準備文件開始變得更簡單
        </p>
        <p className="animate-fade-up mt-2 max-w-md text-xs text-text-muted [animation-delay:120ms]">
          客戶端網頁版 · 與流動 App 共用同一套帳戶、申請、文件、草稿、授權與審批結果
        </p>
        <div className="animate-pulse-soft mt-10 h-1.5 w-28 overflow-hidden rounded-full bg-surface-2">
          <div className="h-full w-2/3 rounded-full bg-teal-500" />
        </div>
        <div className="mt-16 flex w-full max-w-sm flex-col gap-3 md:max-w-md">
          <Link href="/onboarding">
            <Button fullWidth size="lg">
              開始體驗
            </Button>
          </Link>
          <Link href="/app">
            <Button fullWidth variant="outline" size="lg">
              進入客戶端（示範帳戶）
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
    </ClientShell>
  );
}
