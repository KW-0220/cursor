import { Card, EmptyState, SectionHeader } from "@/components/ui/layout";

export default function AuditPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-navy-900">操作及審核紀錄</h1>
        <p className="mt-1 text-sm text-text-secondary">
          顧問／規則／OCR 修正／文件下載皆需留痕
        </p>
      </div>
      <Card className="overflow-x-auto p-0">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="border-b border-border bg-surface-2 text-xs text-text-muted">
            <tr>
              {["時間", "操作者", "動作", "對象", "詳情"].map((h) => (
                <th key={h} className="px-4 py-3 font-medium">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
        </table>
        <div className="p-4">
          <EmptyState
            title="暫無審計紀錄"
            description="系統操作發生後會寫入此處。示範紀錄已移除。"
          />
        </div>
      </Card>
      <SectionHeader
        title="權限備註"
        subtitle="顧問 / Senior Reviewer / Compliance / Administrator"
      />
    </div>
  );
}
