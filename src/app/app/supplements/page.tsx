import Link from "next/link";
import { supplements } from "@/lib/mock-data";
import { Button } from "@/components/ui/button";
import { Card, PageHeader, SectionHeader, StateBanner } from "@/components/ui/layout";

export default function SupplementsPage() {
  const item = supplements[0];
  return (
    <div>
      <PageHeader title="補件中心" subtitle="P19" backHref="/app" />
      <main className="space-y-4 px-4 py-5">
        <StateBanner
          tone="warning"
          title="需要補交文件"
          description={`截止日期：${item.dueDate}`}
        />
        <Card>
          <p className="text-xs text-text-muted">文件類型</p>
          <p className="mt-1 font-semibold text-navy-900">{item.documentType}</p>
          <p className="mt-3 text-sm text-text-secondary">{item.detail}</p>
          {item.advisorNote && (
            <p className="mt-3 rounded-xl bg-surface-2 px-3 py-2 text-xs text-text-secondary">
              顧問備註：{item.advisorNote}
            </p>
          )}
          <Link href="/apply" className="mt-4 block">
            <Button fullWidth>上載補充文件</Button>
          </Link>
        </Card>
        <SectionHeader title="補交紀錄" />
        <Card className="text-sm text-text-secondary">
          尚未有成功補交紀錄。完成上載後會顯示時間、檔案名稱及分析狀態。
        </Card>
      </main>
    </div>
  );
}
