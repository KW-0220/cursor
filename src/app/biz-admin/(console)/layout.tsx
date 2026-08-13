import { BizAdminShell } from "@/components/biz-admin/biz-admin-shell";

export default function BizAdminConsoleLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <BizAdminShell>{children}</BizAdminShell>;
}
