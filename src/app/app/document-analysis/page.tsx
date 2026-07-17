import { DocumentAnalyzeForm } from "@/components/app/document-analyze-form";
import { PageHeader } from "@/components/ui/layout";

export default function DocumentAnalysisPage() {
  return (
    <div>
      <PageHeader
        title="AI 文件資格初篩"
        subtitle="ChatGPT 讀取文件 → 完整性檢查 → 初步評估"
        backHref="/app"
      />
      <main className="px-4 py-5">
        <DocumentAnalyzeForm showInternalTrafficLight={false} />
      </main>
    </div>
  );
}
