import { redirect } from "next/navigation";

/** 舊步驟合併至動態文件上載 */
export default function LegacyCompanyDocsRedirect() {
  redirect("/workspace/apply/documents");
}
