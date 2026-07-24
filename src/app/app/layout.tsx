import { BottomNav, MobileShell } from "@/components/app/mobile-shell";
import { RequireAuth } from "@/components/app/require-auth";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <MobileShell>
      <div className="flex min-h-dvh flex-col">
        <div className="flex-1">
          <RequireAuth>{children}</RequireAuth>
        </div>
        <BottomNav />
      </div>
    </MobileShell>
  );
}
