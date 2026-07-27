import { Card, SectionHeader } from "@/components/ui/layout";
import { DEMO_ADMIN_TRANSFERS } from "@/lib/third-party-share";

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
      <SectionHeader title="傳送日誌（示範）" />
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
          <tbody>
            {DEMO_ADMIN_TRANSFERS.map((row) => (
              <tr
                key={row.authId + row.sharedAt}
                className="border-b border-border last:border-0"
              >
                <td className="px-3 py-2 tabular">{row.sharedAt}</td>
                <td className="px-3 py-2">{row.recipient}</td>
                <td className="px-3 py-2">{row.method}</td>
                <td className="px-3 py-2">{row.payload}</td>
                <td className="px-3 py-2">{row.docVersions}</td>
                <td className="px-3 py-2">{row.encrypted}</td>
                <td className="px-3 py-2 font-medium text-navy-900">
                  {row.status}
                </td>
                <td className="px-3 py-2">{row.received}</td>
                <td className="px-3 py-2">{row.failure}</td>
                <td className="px-3 py-2">{row.retries}</td>
                <td className="px-3 py-2">{row.operator}</td>
                <td className="px-3 py-2">{row.authId}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
