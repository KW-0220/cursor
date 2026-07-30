import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, EmptyState, PageHeader, SectionHeader } from "@/components/ui/layout";

export default function SupplementsPage() {
  return (
    <div>
      <PageHeader title="補件中心" subtitle="P19" backHref="/app" />
      <main className="space-y-4 px-4 py-5">
        <Card>
          <EmptyState
            title="暫無補件要求（0）"
            description="顧問發出補件後會顯示於此。"
            action={
              <Link href="/app">
                <Button variant="outline">返回主頁</Button>
              </Link>
            }
          />
        </Card>
        <SectionHeader title="補交紀錄" />
        <Card className="text-sm text-text-secondary">
          尚未有成功補交紀錄。完成上載後會顯示時間、檔案名稱及分析狀態。
        </Card>
      </main>
    </div>
  );
}
