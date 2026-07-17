import { BottomNav, MobileShell } from "@/components/app/mobile-shell";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <MobileShell>
      <div className="flex min-h-dvh flex-col">
        <div className="flex-1">{children}</div>
        <BottomNav />
      </div>
    </MobileShell>
  );
}
