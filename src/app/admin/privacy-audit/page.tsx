import { Card, EmptyState, SectionHeader } from "@/components/ui/layout";

const headers = [
  "User ID",
  "Company ID",
  "Application ID",
  "Consent ID",
  "授權項目",
  "接收機構",
  "資料類型",
  "分享目的",
  "授權文字版本",
  "私隱政策版本",
  "同意日期及時間",
  "時區",
  "IP",
  "裝置及瀏覽器",
  "App 版本",
  "授權操作來源",
  "實際分享時間",
  "分享方式",
  "傳送結果",
  "撤回時間",
  "授權狀態",
  "執行分享者",
  "人工修改",
];

export default function PrivacyAuditAdminPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-navy-900">後台授權審計紀錄</h1>
        <p className="mt-1 text-sm text-text-secondary">
          A01 · 授權方式可包括 App 勾選、電子簽署、OTP、書面授權或顧問上載證明
        </p>
      </div>
      <SectionHeader title="審計欄位" />
      <Card className="overflow-x-auto p-0">
        <table className="w-full min-w-[1400px] text-left text-xs">
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
            title="暫無授權審計紀錄"
            description="客戶完成第三方授權後會寫入此處。示範資料已移除。"
          />
        </div>
      </Card>
      <p className="text-xs text-text-muted">
        如由職員代為記錄，必須上載授權證明並記錄操作人員（正式環境接檔案儲存）。
      </p>
    </div>
  );
}
