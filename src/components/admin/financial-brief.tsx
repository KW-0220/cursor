"use client";

import { Card, EmptyState, SectionHeader } from "@/components/ui/layout";

/** 財務摘要圖表：示範資料已清空，待接真實案件 API。 */
export function FinancialBriefCharts() {
  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <Card>
        <SectionHeader title="財務趨勢" subtitle="單位：百萬港元" />
        <EmptyState title="暫無財務數據" description="案件數 0" />
      </Card>
      <Card>
        <SectionHeader title="銀行現金流" subtitle="單位：千港元" />
        <EmptyState title="暫無現金流數據" description="案件數 0" />
      </Card>
      <Card>
        <SectionHeader title="現有債務" />
        <EmptyState title="暫無債務紀錄" description="案件數 0" />
      </Card>
      <Card>
        <SectionHeader title="抵押品" />
        <EmptyState title="暫無抵押品" description="案件數 0" />
      </Card>
      <Card className="xl:col-span-2">
        <SectionHeader title="初篩規則命中" />
        <EmptyState title="暫無初篩結果" description="案件數 0" />
      </Card>
    </div>
  );
}
