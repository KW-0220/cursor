import Link from "next/link";
import { notFound } from "next/navigation";
import { applications, timeline } from "@/lib/mock-data";
import { formatDateTime, formatHKD } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, PageHeader, ProgressBar, SectionHeader } from "@/components/ui/layout";
import { StatusTag } from "@/components/ui/status";

export default async function ApplicationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const app = applications.find((a) => a.id === id) ?? applications[0];
  if (!app) notFound();

  return (
    <div>
      <PageHeader
        title="申請詳情及進度"
        subtitle={app.id}
        backHref="/app/applications"
      />
      <main className="space-y-4 px-4 py-5">
        <Card>
          <div className="flex items-start justify-between">
            <div>
              <p className="font-semibold text-navy-900">{app.company.nameZh}</p>
              <p className="mt-1 text-sm text-text-secondary">
                {app.loanType === "secured" ? "有抵押貸款" : "無抵押貸款"} ·{" "}
                <span className="tabular">{formatHKD(app.amount)}</span>
              </p>
            </div>
            <StatusTag status={app.status} />
          </div>
          <div className="mt-4 space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-text-muted">文件完整度</span>
              <span className="tabular">{app.documentCompleteness}%</span>
            </div>
            <ProgressBar value={app.documentCompleteness} />
          </div>
          <div className="mt-4 flex gap-2">
            <Link href="/app/supplements" className="flex-1">
              <Button fullWidth variant="outline">
                補件中心
              </Button>
            </Link>
            <Link href="/app/ai" className="flex-1">
              <Button fullWidth variant="secondary">
                詢問目前狀態
              </Button>
            </Link>
          </div>
        </Card>

        <SectionHeader title="時間線" />
        <ol className="relative space-y-4 border-l border-border pl-4">
          {timeline.map((event) => (
            <li key={event.id} className="relative">
              <span className="absolute -left-[21px] top-1 size-2.5 rounded-full bg-teal-500" />
              <p className="text-xs text-text-muted">
                {formatDateTime(event.date)} · {event.owner}
              </p>
              <p className="mt-0.5 text-sm font-semibold text-navy-900">
                {event.status}
              </p>
              <p className="mt-1 text-sm text-text-secondary">
                {event.description}
              </p>
              {event.nextAction && (
                <p className="mt-1 text-xs text-teal-600">
                  下一步：{event.nextAction}
                </p>
              )}
            </li>
          ))}
        </ol>

        <Card className="bg-surface-2">
          <p className="text-xs text-text-muted">負責顧問</p>
          <p className="mt-1 font-medium text-navy-900">{app.advisor}</p>
          <p className="mt-2 text-xs text-text-secondary">
            預留：顧問視像會議入口
          </p>
        </Card>
      </main>
    </div>
  );
}
