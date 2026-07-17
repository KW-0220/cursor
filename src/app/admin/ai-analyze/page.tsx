import { DocumentAnalyzeForm } from "@/components/app/document-analyze-form";

export default function AdminAiAnalyzePage() {
  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-navy-900">AI 文件資格分析</h1>
        <p className="mt-1 text-sm text-text-secondary">
          顧問／內部使用 · 顯示三色燈初篩（非正式批核）
        </p>
      </div>
      <DocumentAnalyzeForm showInternalTrafficLight />
    </div>
  );
}
