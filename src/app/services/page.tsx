import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function ServicesPage() {
  return (
    <div className="min-h-dvh bg-[color:var(--biz-bg-mid)]">
      <header className="border-b border-[color:var(--biz-border)] bg-[color:var(--biz-surface)]">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4 md:px-8">
          <Link
            href="/"
            className="font-[family-name:var(--font-biz-display)] text-xl font-semibold text-[color:var(--biz-forest-900)]"
          >
            開戶文件通
          </Link>
          <Link href="/workspace/login?intent=register">
            <Button size="sm">開始申請</Button>
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-5 py-12 md:px-8">
        <h1 className="font-[family-name:var(--font-biz-display)] text-4xl font-semibold text-[color:var(--biz-forest-900)]">
          服務介紹
        </h1>
        <p className="mt-3 max-w-2xl text-[color:var(--biz-muted)]">
          協助整理及提交公司成立與商業戶口所需資料與文件，並以 WhatsApp
          通知處理進度。
        </p>

        <section className="mt-12">
          <h2 className="text-xl font-semibold">服務流程</h2>
          <ol className="mt-4 grid gap-4 md:grid-cols-4">
            {[
              "電郵註冊並驗證",
              "分步填寫資料、分類上載文件",
              "檢查完整度後正式提交",
              "接收 WhatsApp 通知、按需補件",
            ].map((t, i) => (
              <li
                key={t}
                className="rounded-2xl border border-[color:var(--biz-border)] bg-[color:var(--biz-surface)] p-4"
              >
                <p className="font-[family-name:var(--font-biz-display)] text-2xl text-[color:var(--biz-gold-600)]">
                  {String(i + 1).padStart(2, "0")}
                </p>
                <p className="mt-2 text-sm">{t}</p>
              </li>
            ))}
          </ol>
        </section>

        <section id="docs" className="mt-14 scroll-mt-20">
          <h2 className="text-xl font-semibold">動態文件分類（六類）</h2>
          <p className="mt-2 text-sm text-[color:var(--biz-muted)]">
            系統先按主要股東身份、公司年期、是否有關聯公司分類，再顯示專屬文件清單。不會向所有客戶顯示同一份清單。
          </p>
          <ul className="mt-4 space-y-3">
            {[
              "類別 1：內地／外國 · 新成立 · 有關聯公司 → 關聯公司執照、三個月流水、一份發票",
              "類別 2：內地／外國 · 新成立 · 無關聯 → CV、社保、個人三個月流水",
              "類別 3：香港本地 · 新成立 · 無關聯 → CV、個人流水、工作經驗證明",
              "類別 4：內地／外國 · 超過一年 · 有關聯 → 關聯公司文件、三份發票、審計報告",
              "類別 5：內地／外國 · 超過一年 · 無關聯 → CV／社保／流水、三份香港業務證明、審計報告",
              "類別 6：香港本地 · 超過一年 · 無關聯 → CV／流水／工作證明、香港公司結單、審計報告",
            ].map((t) => (
              <li
                key={t}
                className="rounded-xl border border-[color:var(--biz-border)] bg-[color:var(--biz-surface)] px-4 py-3 text-sm"
              >
                {t}
              </li>
            ))}
          </ul>
          <p className="mt-4 text-xs text-[color:var(--biz-muted)]">
            共用文件模組包含：公司基本文件、身份證明、個人背景、銀行流水、關聯公司、發票合約、審計報告及面簽 Checklist。
          </p>
        </section>

        <section className="mt-14">
          <h2 className="text-xl font-semibold">常見問題</h2>
          <dl className="mt-4 space-y-4">
            {[
              {
                q: "文件收齊等於開戶成功嗎？",
                a: "否。文件收齊僅表示平台已完成初步檢查；最終由銀行或相關機構決定。",
              },
              {
                q: "可以中途儲存嗎？",
                a: "可以。系統支援自動儲存與「儲存並稍後繼續」。",
              },
              {
                q: "海外董事可以申請嗎？",
                a: "可以。支援護照及海外地址證明。",
              },
            ].map((item) => (
              <div
                key={item.q}
                className="border-t border-[color:var(--biz-border)] pt-4"
              >
                <dt className="font-medium">{item.q}</dt>
                <dd className="mt-1 text-sm text-[color:var(--biz-muted)]">
                  {item.a}
                </dd>
              </div>
            ))}
          </dl>
        </section>
      </main>
    </div>
  );
}
