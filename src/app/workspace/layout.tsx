import { BizdocProvider } from "@/lib/bizdoc/client-store";
import { BizShell } from "@/components/biz/biz-shell";

export default function WorkspaceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <BizdocProvider>
      <BizShell wide>{children}</BizShell>
    </BizdocProvider>
  );
}
