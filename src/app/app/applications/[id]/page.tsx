import Link from "next/link";
import { notFound } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, EmptyState, PageHeader } from "@/components/ui/layout";

export default async function ApplicationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  // 示範案件已清空；真實詳情改由 session／API 提供後再啟用
  if (!id) notFound();

  return (
    <div>
      <PageHeader
        title="申請詳情及進度"
        subtitle={id}
        backHref="/app/applications"
      />
      <main className="space-y-4 px-4 py-5">
        <Card>
          <EmptyState
            title="暫無此申請詳情"
            description="示範案件已清空。請從「申請」列表開啟你已提交的真實申請。"
            action={
              <Link href="/app/applications">
                <Button>返回申請列表</Button>
              </Link>
            }
          />
        </Card>
      </main>
    </div>
  );
}
