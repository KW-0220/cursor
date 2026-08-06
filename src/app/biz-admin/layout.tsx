"use client";

import { usePathname } from "next/navigation";
import { BizAdminShell } from "@/components/biz-admin/biz-admin-shell";

export default function BizAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  if (pathname === "/biz-admin/login") {
    return children;
  }
  return <BizAdminShell>{children}</BizAdminShell>;
}
