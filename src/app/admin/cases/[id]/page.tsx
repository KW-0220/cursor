import Link from "next/link";
import { notFound } from "next/navigation";
import {
  DebtAndCollateralPanels,
  FinancialBriefCharts,
  ScreeningPanel,
} from "@/components/admin/financial-brief";
import { Button } from "@/components/ui/button";
import { Card, SectionHeader, StateBanner } from "@/components/ui/layout";
import { DocStatusTag, StatusTag } from "@/components/ui/status";
import { applications, checklistIssues, documentRequirements } from "@/lib/mock-data";
import { formatHKD } from "@/lib/utils";

export default async function CaseDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const app = applications.find((a) => a.id === id) ?? applications[0];
  if (!app) notFound();
  const docs =
    documentRequirements[app.loanType === "secured" ? "secured" : "unsecured"];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs text-text-muted">{app.id}</p>
          <h1 className="mt-1 text-2xl font-bold text-navy-900">
            一頁式中小企財務簡報
          </h1>
          <p className="mt-1 text-sm text-text-secondary">
            D03｜{app.company.nameZh}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <StatusTag status={app.status} />
          <Link href={`/admin/leads/${app.id}`}>
            <Button variant="secondary">Lead 預審</Button>
          </Link>
          <Link href={`/admin/policy/${app.id}`}>
            <Button variant="secondary">AI 政策核對</Button>
          </Link>
          <Link href={`/admin/cases/${app.id}/documents`}>
            <Button variant="outline">文件檢視器</Button>
          </Link>
          <Button>更新狀態</Button>
        </div>
      </div>

      <Card>
        <SectionHeader title="A. 公司概覽" />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          {[
            ["公司名稱", app.company.nameZh],
            ["成立年期", "約 8 年"],
            ["業務性質", app.company.industry],
            ["員工人數", String(app.company.employees)],
            ["貸款用途", app.purpose],
            ["申請金額", formatHKD(app.amount)],
          ].map(([k, v]) => (
            <div key={k} className="rounded-xl bg-surface-2 p-3">
              <p className="text-xs text-text-muted">{k}</p>
              <p className="mt-1 text-sm font-semibold text-navy-900">{v}</p>
            </div>
          ))}
        </div>
      </Card>

      <FinancialBriefCharts />
      <DebtAndCollateralPanels />

      <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <Card>
          <SectionHeader title="F. AI 初篩" subtitle="D04｜圖示 + 文字 + 原因 + 下一步" />
          <ScreeningPanel />
        </Card>
        <Card>
          <SectionHeader title="文件狀態" />
          <StateBanner
            tone="warning"
            title="待人工確認"
            description={checklistIssues[0]}
          />
          <div className="mt-4 space-y-2">
            {docs.map((d) => (
              <div
                key={d.name}
                className="flex items-center justify-between rounded-xl bg-surface-2 px-3 py-2"
              >
                <span className="text-sm text-navy-900">{d.name}</span>
                <DocStatusTag status={d.status} />
              </div>
            ))}
          </div>
          <div className="mt-4 grid gap-2">
            <Button fullWidth>建立補件要求</Button>
            <Button fullWidth variant="outline">
              送交合作貸款機構
            </Button>
            <Button fullWidth variant="ghost">
              匯出財務簡報
            </Button>
          </div>
        </Card>
      </div>

      <Card>
        <SectionHeader title="D06｜案件處理操作" subtitle="全部操作寫入 Audit Log" />
        <div className="flex flex-wrap gap-2">
          {[
            "分配負責人",
            "新增內部備註",
            "向客戶發出訊息",
            "修正 OCR 資料",
            "標記風險",
            "關閉／撤回案件",
          ].map((op) => (
            <Button key={op} size="sm" variant="outline">
              {op}
            </Button>
          ))}
        </div>
      </Card>
    </div>
  );
}
