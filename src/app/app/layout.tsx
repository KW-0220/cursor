import {
  BottomNav,
  ClientShell,
  ClientTopNav,
} from "@/components/app/mobile-shell";
import { RequireAuth } from "@/components/app/require-auth";

/**
 * 客戶端登入後殼：流動 BottomNav + 桌面 TopNav。
 * 共用既有 /app/* 路由與 /api/*（申請、文件、AI、帳戶）。
 * 後台 /admin 不經此 layout。
 */
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClientShell>
      <div className="flex min-h-dvh flex-col">
        <ClientTopNav />
        <div className="flex-1">
          <RequireAuth>{children}</RequireAuth>
        </div>
        <BottomNav />
      </div>
    </ClientShell>
  );
}
