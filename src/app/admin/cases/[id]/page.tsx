import { notFound } from "next/navigation";

/** 案件詳情改接真實資料庫後再啟用；目前不提供示範案件。 */
export default async function CaseDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await params;
  notFound();
}
