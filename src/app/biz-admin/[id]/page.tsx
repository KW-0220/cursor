import { redirect } from "next/navigation";

/** 相容舊連結 `/biz-admin/[id]` → `/biz-admin/applications/[id]` */
export default async function LegacyBizAdminDetailRedirect({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/biz-admin/applications/${encodeURIComponent(id)}`);
}
