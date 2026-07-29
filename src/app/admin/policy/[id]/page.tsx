import Link from "next/link";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/layout";

export default async function AdminPolicyPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs text-text-muted">{id}</p>
        <h1 className="mt-1 text-2xl font-bold text-navy-900">
          AI 貸款政策核對結果
        </h1>
        <p className="mt-1 text-sm text-text-secondary">
          僅顯示真實案件政策核對結果
        </p>
      </div>
      <EmptyState
        title="暫無政策核對資料"
        description="此案件尚無真實政策評估結果，示範資料已移除。"
        action={
          <Link href="/admin">
            <Button variant="outline">返回案件總覽</Button>
          </Link>
        }
      />
    </div>
  );
}
