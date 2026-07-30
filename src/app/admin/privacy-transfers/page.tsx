import { Card, EmptyState, SectionHeader } from "@/components/ui/layout";

const headers = [
  "分享日期及時間",
  "接收機構",
  "傳送方式",
  "傳送的資料及文件",
  "文件版本",
  "是否加密",
  "傳送狀態",
  "是否成功接收",
  "失敗原因",
  "重試紀錄",
  "操作人員／系統",
  "相關授權編號",
];

export default function PrivacyTransfersAdminPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-navy-900">實際資料傳送紀錄</h1>
        <p className="mt-1 text-sm text-text-secondary">
          A02 · 與授權紀錄分開；狀態含已授權未分享／傳送中／成功／失敗／已撤回等
        </p>
      </div>
      <SectionHeader title="傳送日誌" />
      <Card className="overflow-x-auto p-0">
        <table className="w-full min-w-[1100px] text-left text-xs">
          <thead className="border-b border-border bg-surface-2 text-text-muted">
            <tr>
              {headers.map((h) => (
                <th key={h} className="whitespace-nowrap px-3 py-2 font-medium">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
        </table>
        <div className="p-4">
          <EmptyState
            title="暫無傳送紀錄"
            description="實際資料傳送發生後會寫入此處。示範資料已移除。"
          />
        </div>
      </Card>
    </div>
  );
}
