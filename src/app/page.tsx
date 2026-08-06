import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function MarketingHomePage() {
  return (
    <div className="min-h-dvh bg-[color:var(--biz-bg-mid)] text-[color:var(--biz-ink)]">
      <header className="absolute inset-x-0 top-0 z-20">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5 md:px-8">
          <p className="font-[family-name:var(--font-biz-display)] text-xl font-semibold tracking-tight text-white md:text-2xl">
            開戶文件通
          </p>
          <div className="flex items-center gap-2">
            <Link
              href="/services"
              className="hidden text-sm text-white/80 hover:text-white sm:inline"
            >
              服務介紹
            </Link>
            <Link href="/workspace/login?intent=login">
              <Button
                size="sm"
                variant="outline"
                className="border-white/30 bg-white/10 text-white hover:bg-white/20"
              >
                登入
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <section className="biz-hero-plane flex flex-col justify-end px-5 pb-24 pt-28 md:px-8 md:pb-28 md:pt-32">
        <div className="relative z-10 mx-auto w-full max-w-6xl">
          <p className="animate-biz-rise font-[family-name:var(--font-biz-display)] text-4xl font-semibold leading-[1.15] tracking-tight text-white md:text-6xl md:leading-[1.1]">
            開戶文件通
          </p>
          <h1 className="animate-biz-rise-delay mt-5 max-w-2xl text-xl font-medium leading-snug text-white/95 md:text-3xl">
            公司成立及商業戶口文件，一站式整理及提交
          </h1>
          <p className="animate-biz-rise-delay-2 mt-4 max-w-xl text-sm leading-relaxed text-white/75 md:text-base">
            按步驟提交公司、董事及業務資料，可中途儲存，並透過 WhatsApp
            掌握文件處理進度。
          </p>
          <div className="animate-biz-rise-delay-2 mt-8 flex flex-wrap gap-3">
            <Link href="/workspace/login?intent=register">
              <Button
                size="lg"
                className="bg-[color:var(--biz-gold-500)] text-[color:var(--biz-ink)] hover:bg-[color:var(--biz-gold-600)] hover:text-white"
              >
                開始申請
              </Button>
            </Link>
            <Link href="/services#docs">
              <Button
                size="lg"
                variant="outline"
                className="border-white/35 bg-transparent text-white hover:bg-white/10"
              >
                查看文件清單
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-16 md:px-8 md:py-20">
        <h2 className="font-[family-name:var(--font-biz-display)] text-3xl font-semibold text-[color:var(--biz-forest-900)]">
          一個完整的數碼申請工作空間
        </h2>
        <p className="mt-3 max-w-2xl text-sm text-[color:var(--biz-muted)] md:text-base">
          不是單純上載區——每次登入即可知道進度、尚欠項目、是否需要補交，以及下一步要做什麼。
        </p>
        <ol className="mt-10 grid gap-8 md:grid-cols-4">
          {[
            { n: "01", t: "電郵註冊", d: "建立帳戶並驗證電郵" },
            { n: "02", t: "分類填寫及上載", d: "公司、董事、業務證明分步完成" },
            { n: "03", t: "正式提交", d: "系統檢查完整度後鎖定版本" },
            { n: "04", t: "WhatsApp 追蹤", d: "處理中、補件、文件收齊通知" },
          ].map((s) => (
            <li key={s.n} className="border-t border-[color:var(--biz-border)] pt-4">
              <p className="font-[family-name:var(--font-biz-display)] text-2xl text-[color:var(--biz-gold-600)]">
                {s.n}
              </p>
              <p className="mt-2 font-semibold text-[color:var(--biz-ink)]">{s.t}</p>
              <p className="mt-1 text-sm text-[color:var(--biz-muted)]">{s.d}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="border-y border-[color:var(--biz-border)] bg-[color:var(--biz-surface)]">
        <div className="mx-auto grid max-w-6xl gap-10 px-5 py-16 md:grid-cols-2 md:px-8">
          <div>
            <h2 className="font-[family-name:var(--font-biz-display)] text-3xl font-semibold text-[color:var(--biz-forest-900)]">
              文件分類上載
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-[color:var(--biz-muted)]">
              商業登記證、註冊證書、NAR1、組織章程、董事身份及住址證明、兩套業務證明——各自獨立區域，清楚顯示狀態與補件原因。
            </p>
          </div>
          <div>
            <h2 className="font-[family-name:var(--font-biz-display)] text-3xl font-semibold text-[color:var(--biz-forest-900)]">
              可中途儲存
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-[color:var(--biz-muted)]">
              自動儲存、手動儲存、離開前提示。重新登入後恢復上次進度；文件上載後即時寫入申請。
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-16 md:px-8">
        <div className="rounded-3xl bg-[color:var(--biz-forest-900)] px-6 py-10 text-white md:px-10">
          <h2 className="font-[family-name:var(--font-biz-display)] text-3xl font-semibold">
            資料安全與清晰狀態
          </h2>
          <p className="mt-3 max-w-2xl text-sm text-white/75">
            HTTPS、私人物件儲存、敏感資料遮罩、操作審計。狀態從不只有「處理中」——從填寫、補件到文件收齊、提交相關機構，每一步都可讀。
          </p>
          <p className="mt-4 text-xs text-white/55">
            注意：文件已收齊不代表商業戶口已獲批；最終決定由銀行或相關機構作出。
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/workspace">
              <Button className="bg-[color:var(--biz-gold-500)] text-[color:var(--biz-ink)] hover:bg-[color:var(--biz-gold-600)] hover:text-white">
                進入客戶工作台
              </Button>
            </Link>
            <Link href="/biz-admin/login">
              <Button
                variant="outline"
                className="border-white/30 bg-transparent text-white hover:bg-white/10"
              >
                後台登入
              </Button>
            </Link>
            <Link
              href="/onboarding"
              className="self-center text-xs text-white/50 hover:text-white/80"
            >
              貸款產品（SME LoanFlow）→
            </Link>
          </div>
        </div>
      </section>

      <footer className="border-t border-[color:var(--biz-border)] px-5 py-8 text-center text-xs text-[color:var(--biz-muted)] md:px-8">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-4">
          <Link href="/services" className="hover:text-[color:var(--biz-forest-800)]">
            服務與文件
          </Link>
          <Link href="/legal/privacy" className="hover:text-[color:var(--biz-forest-800)]">
            私隱政策
          </Link>
          <Link href="/legal/terms" className="hover:text-[color:var(--biz-forest-800)]">
            使用條款
          </Link>
        </div>
        <p className="mt-4">開戶文件通 · 公司成立及商業戶口文件管理</p>
      </footer>
    </div>
  );
}
