import Link from "next/link";
import { applications } from "@/lib/mock-data";
import { formatDateTime, formatHKD } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, EmptyState, SectionHeader } from "@/components/ui/layout";
import { StatusTag } from "@/components/ui/status";

export default function ApplicationsPage() {
  return (
    <main className="px-4 py-5">
      <SectionHeader
        title="申請"
        subtitle="建立新申請及查看過往申請"
        action={
          <Link href="/apply">
            <Button size="sm">＋ 新申請</Button>
          </Link>
        }
      />
      {applications.length === 0 ? (
        <EmptyState
          title="尚未有申請"
          description="由 AI 了解融資需要開始，或直接選擇貸款類型。"
          action={
            <Link href="/apply">
              <Button>開始貸款申請</Button>
            </Link>
          }
        />
      ) : (
        <div className="space-y-3">
          {applications.map((app) => (
            <Link key={app.id} href={`/app/applications/${app.id}`}>
              <Card className="mb-3 transition hover:border-teal-500/40">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs text-text-muted">{app.id}</p>
                    <p className="mt-1 font-semibold text-navy-900">
                      {app.company.nameZh}
                    </p>
                    <p className="mt-1 text-sm text-text-secondary">
                      {app.loanType === "secured" ? "有抵押" : "無抵押"} ·{" "}
                      <span className="tabular">{formatHKD(app.amount)}</span>
                    </p>
                  </div>
                  <StatusTag status={app.status} />
                </div>
                <p className="mt-3 text-xs text-text-muted">
                  更新於 {formatDateTime(app.updatedAt)}
                </p>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
