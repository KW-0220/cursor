import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, Disclaimer, SectionHeader } from "@/components/ui/layout";
import { maskId } from "@/lib/utils";

export default function AccountPage() {
  return (
    <main className="px-4 py-5">
      <h1 className="text-xl font-bold text-navy-900">我的帳戶</h1>
      <p className="mt-1 text-sm text-text-secondary">公司資料、通知、私隱及設定</p>

      <Card className="mt-5">
        <p className="text-xs text-text-muted">申請人</p>
        <p className="mt-1 font-semibold text-navy-900">陳大文</p>
        <p className="mt-1 text-sm text-text-secondary">
          身份證 {maskId("A123456(7)")} · 董事
        </p>
        <p className="mt-3 text-sm text-navy-900">智創科技有限公司</p>
      </Card>

      <SectionHeader title="保安" />
      <div className="space-y-2">
        {[
          "登入裝置管理",
          "雙重認證",
          "自動登出設定",
          "Face ID／Touch ID",
        ].map((item) => (
          <button
            key={item}
            className="flex w-full items-center justify-between rounded-2xl border border-border bg-surface-1 px-4 py-3 text-left text-sm"
          >
            {item}
            <span className="text-text-muted">›</span>
          </button>
        ))}
      </div>

      <SectionHeader title="私隱" />
      <div className="space-y-2">
        {[
          "資料使用目的說明",
          "第三方分享授權紀錄",
          "資料保留期限",
          "撤回同意及刪除帳戶",
          "文件查看及下載紀錄",
        ].map((item) => (
          <button
            key={item}
            className="flex w-full items-center justify-between rounded-2xl border border-border bg-surface-1 px-4 py-3 text-left text-sm"
          >
            {item}
            <span className="text-text-muted">›</span>
          </button>
        ))}
      </div>

      <Disclaimer>
        設計已預留《個人資料（私隱）條例》、加密及商業數據通入口；實際合規架構須由法律／資安確認。
      </Disclaimer>

      <div className="mt-4 space-y-2">
        <Link href="/admin">
          <Button fullWidth variant="outline">
            切換至內部控制台（示範）
          </Button>
        </Link>
        <Link href="/">
          <Button fullWidth variant="ghost">
            登出
          </Button>
        </Link>
      </div>
    </main>
  );
}
