import { Card, SectionHeader } from "@/components/ui/layout";

const logs = [
  {
    time: "2026-07-17 16:40",
    actor: "李美欣",
    action: "建立補件要求",
    target: "SLF-2026-00482",
    detail: "銀行結單缺頁",
  },
  {
    time: "2026-07-16 09:40",
    actor: "系統",
    action: "分配負責人",
    target: "SLF-2026-00482",
    detail: "指派顧問李美欣",
  },
  {
    time: "2026-07-15 12:08",
    actor: "AI 引擎",
    action: "OCR 提取完成",
    target: "審計報告 FY2025",
    detail: "信心度 94%",
  },
  {
    time: "2026-07-10 11:02",
    actor: "管理員 周先生",
    action: "更新初篩規則",
    target: "供款佔入數比例上限",
    detail: "45% → 50%",
  },
];

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
          <tbody>
            {logs.map((log) => (
              <tr key={log.time + log.action} className="border-b border-border last:border-0">
                <td className="px-4 py-3 tabular text-xs">{log.time}</td>
                <td className="px-4 py-3">{log.actor}</td>
                <td className="px-4 py-3 font-medium text-navy-900">{log.action}</td>
                <td className="px-4 py-3">{log.target}</td>
                <td className="px-4 py-3 text-text-secondary">{log.detail}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
      <SectionHeader title="權限備註" subtitle="顧問 / Senior Reviewer / Compliance / Administrator" />
    </div>
  );
}
