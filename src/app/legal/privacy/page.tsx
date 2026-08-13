import Link from "next/link";

export default function PrivacyPage() {
  return (
    <LegalShell title="私隱政策">
      <p>
        本平台收集並處理公司成立及商業戶口申請所需的個人資料、公司資料與文件，用途限於申請處理、文件審核、進度通知及合規要求。
      </p>
      <p className="mt-4">
        敏感資料（如身份證號碼）於介面顯示時會作遮罩；文件存放於私人物件儲存，不可用公開連結直接存取。
      </p>
    </LegalShell>
  );
}

function LegalShell({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-dvh bg-[color:var(--biz-bg-mid)] px-5 py-12 md:px-8">
      <div className="mx-auto max-w-2xl">
        <Link href="/" className="text-sm text-[color:var(--biz-forest-700)]">
          ← 返回
        </Link>
        <h1 className="mt-4 font-[family-name:var(--font-biz-display)] text-3xl font-semibold text-[color:var(--biz-forest-900)]">
          {title}
        </h1>
        <div className="mt-6 text-sm leading-relaxed text-[color:var(--biz-muted)]">
          {children}
        </div>
      </div>
    </div>
  );
}
