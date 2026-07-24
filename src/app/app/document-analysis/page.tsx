import { DocumentAnalyzeForm } from "@/components/app/document-analyze-form";
import { PageHeader } from "@/components/ui/layout";

export default function DocumentAnalysisPage() {
  return (
    <div>
      <PageHeader
        title="AI 文件資格初篩"
        subtitle="AI 讀取文件 → 提取資料 → 預審條件（非批核）"
        backHref="/app"
      />
      <main className="px-4 py-5">
        <DocumentAnalyzeForm showInternalTrafficLight={false} />
      </main>
    </div>
  );
}
