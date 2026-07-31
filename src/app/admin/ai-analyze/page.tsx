import { AiAnalyzeWorkspace } from "@/components/admin/ai-analyze-workspace";

export default function AdminAiAnalyzePage() {
  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-navy-900">AI 文件分析</h1>
        <p className="mt-1 text-sm text-text-secondary">
          無限上載分析 · 結果歸檔保存 · 顧問／內部使用（非正式批核）
        </p>
      </div>
      <AiAnalyzeWorkspace showTrafficLight enableArchive />
    </div>
  );
}
