import { redirect } from "next/navigation";

export default function LegacyPersonalDocsRedirect() {
  redirect("/workspace/apply/documents");
}
