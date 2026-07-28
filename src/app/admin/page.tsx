import Link from "next/link";
import { adminKpis, applications } from "@/lib/mock-data";
import { formatDateTime, formatHKD } from "@/lib/utils";
import { Card, SectionHeader } from "@/components/ui/layout";
import { StatusTag, TrafficLight } from "@/components/ui/status";

export default function AdminDashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-navy-900">案件總覽</h1>
        <p className="mt-1 text-sm text-text-secondary">
          D02｜KPI + 列表 + 篩選 ·{" "}
          <Link href="/admin/drafts" className="text-teal-700 underline">
            申請草稿狀態（A01）
          </Link>
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
          <tbody>
            {applications.map((app) => (
              <tr
                key={app.id}
                className="border-b border-border last:border-0 hover:bg-surface-2/50"
              >
                <td className="px-4 py-3">
                  <Link
                    href={`/admin/cases/${app.id}`}
                    className="font-medium text-teal-600 hover:underline"
                  >
                    {app.id}
                  </Link>
                </td>
                <td className="px-4 py-3">{app.company.nameZh}</td>
                <td className="px-4 py-3">
                  {app.loanType === "secured" ? "有抵押" : "無抵押"}
                </td>
                <td className="px-4 py-3 tabular">{formatHKD(app.amount)}</td>
                <td className="px-4 py-3">
                  <TrafficLight result={app.screening} compact />
                </td>
                <td className="px-4 py-3 tabular">
                  {app.documentCompleteness}%
                </td>
                <td className="px-4 py-3">{app.advisor}</td>
                <td className="px-4 py-3">
                  <StatusTag status={app.status} />
                </td>
                <td className="px-4 py-3 text-xs text-text-secondary">
                  {formatDateTime(app.updatedAt)}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs ${
                      (app.slaHoursRemaining ?? 99) < 24
                        ? "bg-warning-100 text-warning-600"
                        : "bg-surface-2 text-text-secondary"
                    }`}
                  >
                    {app.slaHoursRemaining}h
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
