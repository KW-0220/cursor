import Link from "next/link";
import { Button } from "@/components/ui/button";
import { EmptyState, SectionHeader } from "@/components/ui/layout";

/** 真實用戶：不顯示 mock 申請；只有「新申請」 */
export default function ApplicationsPage() {
  return (
    <main className="px-4 py-5">
      <SectionHeader title="申請" subtitle="建立新申請；你的申請會顯示於此" />

      <EmptyState
        title="尚未有申請"
        description="開始新申請後，進度會在這裡列出。"
        action={
          <Link href="/apply">
            <Button size="lg">＋ 新申請</Button>
          </Link>
        }
      />
    </main>
  );
}
