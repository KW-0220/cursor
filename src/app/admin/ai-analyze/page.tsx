import { AiAnalyzeWorkspace } from "@/components/admin/ai-analyze-workspace";

export default function AdminAiAnalyzePage() {
  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-navy-900">AI 文件分析</h1>
        <p className="mt-1 text-sm text-text-secondary">
          按類別分開上載｜Gemini Backend（GEMINI_API_KEY）｜BR · 銀行月結 ·
          身份證明 · Audited
        </p>
      </div>
      <AiAnalyzeWorkspace enableArchive />
    </div>
  );
}
