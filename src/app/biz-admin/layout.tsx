import Link from "next/link";

export default function BizAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-dvh bg-[color:var(--biz-surface-2)]">
      <header className="border-b border-[color:var(--biz-border)] bg-[color:var(--biz-forest-950)] text-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 md:px-6">
          <div>
            <p className="text-xs text-white/50">開戶文件通 · 後台</p>
            <h1 className="text-lg font-semibold">申請與文件審核</h1>
          </div>
          <nav className="flex items-center gap-3 text-sm">
            <Link href="/biz-admin" className="text-white/80 hover:text-white">
              申請列表
            </Link>
            <Link href="/workspace" className="text-white/50 hover:text-white">
              客戶端
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
