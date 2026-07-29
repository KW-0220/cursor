import { Card, EmptyState, SectionHeader } from "@/components/ui/layout";

const adminKpis = [
  { label: "新申請", value: "0" },
  { label: "文件分析中", value: "0" },
  { label: "需要補件", value: "0" },
  { label: "待人工審核", value: "0" },
  { label: "已送交貸款機構", value: "0" },
  { label: "本月批核", value: "0" },
  { label: "平均處理時間", value: "—" },
];

export default function AdminDashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-navy-900">案件總覽</h1>
        <p className="mt-1 text-sm text-text-secondary">
          KPI + 列表 · 僅顯示真實案件
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-7">
        {adminKpis.map((kpi) => (
          <Card key={kpi.label} className="py-3">
            <p className="text-xs text-text-muted">{kpi.label}</p>
            <p className="mt-1 text-2xl font-semibold tabular text-navy-900">
              {kpi.value}
            </p>
          </Card>
        ))}
      </div>

      <Card>
        <SectionHeader
          title="篩選器"
          subtitle="貸款類型 · 金額 · 初篩顏色 · 文件狀態 · 負責人 · 日期 · 行業 · 狀態"
        />
        <div className="flex flex-wrap gap-2">
          {["全部", "有抵押", "無抵押", "綠燈", "黃燈", "紅燈", "需要補件", "我的案件"].map(
            (f) => (
              <button
                key={f}
                className="rounded-full bg-surface-2 px-3 py-1.5 text-xs font-medium text-text-secondary hover:bg-teal-100 hover:text-teal-600"
              >
                {f}
              </button>
            ),
          )}
        </div>
      </Card>

      <Card className="overflow-x-auto p-0">
        <table className="w-full min-w-[960px] text-left text-sm">
          <thead className="border-b border-border bg-surface-2/80 text-xs text-text-muted">
            <tr>
              {[
                "申請編號",
                "公司名稱",
                "貸款類型",
                "申請金額",
                "AI 初篩",
                "文件完整度",
                "負責顧問",
                "目前狀態",
                "最後更新",
                "SLA",
              ].map((h) => (
                <th key={h} className="px-4 py-3 font-medium">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
        </table>
        <div className="p-4">
          <EmptyState
            title="暫無案件"
            description="尚未有真實申請進入後台。客戶完成申請後會出現在此列表。"
          />
        </div>
      </Card>
    </div>
  );
}
