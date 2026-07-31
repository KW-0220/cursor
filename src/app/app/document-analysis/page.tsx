"use client";

import { AiAnalyzeWorkspace } from "@/components/admin/ai-analyze-workspace";
import { PageHeader } from "@/components/ui/layout";

export default function DocumentAnalysisPage() {
  return (
    <div>
      <PageHeader
        title="AI 文件分析"
        subtitle="與申請文件步驟相同：BR／銀行月結／審計報告 AI 抽取"
        backHref="/app"
      />
      <main className="px-4 py-5 pb-28">
        <AiAnalyzeWorkspace enableArchive={false} />
      </main>
    </div>
  );
}
