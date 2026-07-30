import {
  Card,
  EmptyState,
  SectionHeader,
  StateBanner,
} from "@/components/ui/layout";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/** C18 後台抵押品審批摘要 — 不再讀本機 localStorage 示範草稿 */
export default function AdminCollateralPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-navy-900">抵押品審批摘要</h1>
          <p className="mt-1 text-sm text-text-secondary">
            C18 · 文件完整度、初步淨值、三色燈、正式估值狀態
          </p>
        </div>
        <p className="rounded-full bg-teal-100 px-3 py-1 text-xs font-semibold text-teal-800">
          案件 0 · live
        </p>
      </div>

      <StateBanner
        tone="warning"
        title="AI 不直接拒絕"
        description="紅燈只代表需要進一步審批。正式可接受抵押價值以指定估值及貸款機構為準。"
      />

      <SectionHeader title="案件抵押品（0）" />
      <Card>
        <EmptyState
          title="暫無抵押品資料（0）"
          description="客戶於申請流程選擇「有抵押貸款」並提交後會顯示於此。本機示範草稿不會再出現。"
        />
      </Card>
    </div>
  );
}
