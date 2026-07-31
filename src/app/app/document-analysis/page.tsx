"use client";

import { AiAnalyzeWorkspace } from "@/components/admin/ai-analyze-workspace";
import { PageHeader } from "@/components/ui/layout";

/** 客戶端：無限上載分析（歸檔需顧問後台） */
export default function DocumentAnalysisPage() {
  return (
    <div>
      <PageHeader
        title="AI 文件分析"
        subtitle="可連續上載多份文件做 AI 抽取／預審（非正式批核）"
        backHref="/app"
      />
      <main className="px-4 py-5 pb-28">
        <AiAnalyzeWorkspace showTrafficLight={false} enableArchive={false} />
      </main>
    </div>
  );
}
