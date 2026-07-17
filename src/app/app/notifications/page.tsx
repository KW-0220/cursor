import { Card, PageHeader, SectionHeader } from "@/components/ui/layout";

const notifications = [
  { type: "需要補件", body: "請補交 2026 年 3 月完整銀行結單。", time: "昨天 16:40" },
  { type: "文件分析完成", body: "審計報告 OCR 已完成，請確認提取資料。", time: "7/15 12:05" },
  { type: "申請狀態更新", body: "案件已分配予顧問李美欣。", time: "7/16 09:40" },
  { type: "顧問已留言", body: "請盡快補件，以免影響處理進度。", time: "7/17 17:10" },
];

export default function NotificationsPage() {
  return (
    <div>
      <PageHeader title="訊息及通知" subtitle="P20" backHref="/app" />
      <main className="space-y-3 px-4 py-5">
        <SectionHeader
          title="通知偏好"
          subtitle="App Push · 電郵 · SMS（重要）"
        />
        {notifications.map((n) => (
          <Card key={n.type + n.time}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-navy-900">{n.type}</p>
                <p className="mt-1 text-sm text-text-secondary">{n.body}</p>
              </div>
              <span className="shrink-0 text-[11px] text-text-muted">
                {n.time}
              </span>
            </div>
          </Card>
        ))}
      </main>
    </div>
  );
}
