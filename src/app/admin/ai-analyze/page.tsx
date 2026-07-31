import { AiAnalyzeWorkspace } from "@/components/admin/ai-analyze-workspace";

export default function AdminAiAnalyzePage() {
  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-navy-900">AI 文件分析</h1>
        <p className="mt-1 text-sm text-text-secondary">
          與客戶申請端相同規則：BR · 銀行月結現金流 · Audited 抽取｜可佇列／歸檔
        </p>
      </div>
      <AiAnalyzeWorkspace enableArchive />
    </div>
  );
}
