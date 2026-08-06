"use client";

import { usePathname } from "next/navigation";
import { BizdocProvider } from "@/lib/bizdoc/client-store";
import { BizShell } from "@/components/biz/biz-shell";

export default function WorkspaceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const bare = pathname === "/workspace/login";

  return (
    <BizdocProvider>
      {bare ? children : <BizShell wide>{children}</BizShell>}
    </BizdocProvider>
  );
}
