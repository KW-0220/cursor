import Link from "next/link";

export default function TermsPage() {
  return (
    <div className="min-h-dvh bg-[color:var(--biz-bg-mid)] px-5 py-12 md:px-8">
      <div className="mx-auto max-w-2xl">
        <Link href="/" className="text-sm text-[color:var(--biz-forest-700)]">
          ← 返回
        </Link>
        <h1 className="mt-4 font-[family-name:var(--font-biz-display)] text-3xl font-semibold text-[color:var(--biz-forest-900)]">
          使用條款
        </h1>
        <div className="mt-6 space-y-4 text-sm leading-relaxed text-[color:var(--biz-muted)]">
          <p>
            使用本平台即表示你同意按真實及完整資料提交申請。提交資料不代表商業戶口必定獲批；文件收齊亦不代表已獲銀行批准。
          </p>
          <p>
            最終決定由銀行或相關機構作出。平台可按營運需要將資料轉交指定合作機構，並透過 WhatsApp
            發送申請相關通知（需你事先同意）。
          </p>
        </div>
      </div>
    </div>
  );
}
