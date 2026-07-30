import Link from "next/link";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/layout";

export default async function AdminLeadPrescreenPage({
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
          Lead 轉介／預審條件
        </h1>
        <p className="mt-1 text-sm text-text-secondary">
          僅顯示真實案件預審結果
        </p>
      </div>
      <EmptyState
        title="暫無預審資料"
        description="此案件尚無真實文件預審結果，示範資料已移除。"
        action={
          <Link href="/admin">
            <Button variant="outline">返回案件總覽</Button>
          </Link>
        }
      />
    </div>
  );
}
