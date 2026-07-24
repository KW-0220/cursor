"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, Disclaimer, SectionHeader, StateBanner } from "@/components/ui/layout";

type Me = {
  id: string;
  email: string;
  nameZh: string | null;
  phone: string | null;
  profileCompleted: boolean;
};

export default function AccountPage() {
  const router = useRouter();
  const [user, setUser] = useState<Me | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch("/api/auth/me");
        const data = await res.json();
        if (res.ok) setUser(data.user);
        else setUser(null);
      } catch {
        setUser(null);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function logout() {
    await fetch("/api/auth/me", { method: "DELETE" });
    router.push("/auth/login");
    router.refresh();
  }

  return (
    <main className="px-4 py-5 pb-28">
      <h1 className="text-xl font-bold text-navy-900">我的帳戶</h1>
      <p className="mt-1 text-sm text-text-secondary">
        登入狀態、公司資料、私隱及設定
      </p>

      {loading ? (
        <Card className="mt-5 text-sm text-text-muted">載入帳戶…</Card>
      ) : user ? (
        <Card className="mt-5">
          <p className="text-xs text-text-muted">已登入</p>
          <p className="mt-1 font-semibold text-navy-900">
            {user.nameZh || "用戶"}
          </p>
          <p className="mt-1 text-sm text-text-secondary">{user.email}</p>
          {user.phone && (
            <p className="mt-1 text-sm text-text-secondary">{user.phone}</p>
          )}
          <p className="mt-2 text-xs text-text-muted">
            資料狀態：
            {user.profileCompleted ? "已完成身份／公司登記" : "尚未完成資料填寫"}
          </p>
          {!user.profileCompleted && (
            <Link href="/register/identity" className="mt-3 block">
              <Button fullWidth>繼續填寫登記資料</Button>
            </Link>
          )}
        </Card>
      ) : (
        <div className="mt-5 space-y-3">
          <StateBanner
            tone="warning"
            title="尚未登入"
            description="請先註冊或登入，以保存申請進度。"
          />
          <Link href="/auth/login">
            <Button fullWidth>前往註冊／登入</Button>
          </Link>
        </div>
      )}

      <SectionHeader title="保安" />
      <div className="space-y-2">
        {["登入裝置管理", "雙重認證", "自動登出設定", "Face ID／Touch ID"].map(
          (item) => (
            <button
              key={item}
              className="flex w-full items-center justify-between rounded-2xl border border-border bg-surface-1 px-4 py-3 text-left text-sm"
            >
              {item}
              <span className="text-text-muted">›</span>
            </button>
          ),
        )}
      </div>

      <SectionHeader title="私隱" />
      <div className="space-y-2">
        {[
          "資料使用目的說明",
          "第三方分享授權紀錄",
          "資料保留期限",
          "撤回同意及刪除帳戶",
        ].map((item) => (
          <button
            key={item}
            className="flex w-full items-center justify-between rounded-2xl border border-border bg-surface-1 px-4 py-3 text-left text-sm"
          >
            {item}
            <span className="text-text-muted">›</span>
          </button>
        ))}
      </div>

      <Disclaimer>
        電郵密碼經 bcrypt 加密儲存；登入以 HttpOnly Cookie 維持。正式環境建議接
        Upstash Redis／Vercel KV 作帳戶持久化，並設定 AUTH_SECRET。
      </Disclaimer>

      <div className="mt-4 space-y-2">
        {user && (
          <Button fullWidth variant="outline" onClick={() => void logout()}>
            登出
          </Button>
        )}
        <Link href="/admin">
          <Button fullWidth variant="outline">
            切換至內部控制台（示範）
          </Button>
        </Link>
        <Link href="/">
          <Button fullWidth variant="ghost">
            返回首頁
          </Button>
        </Link>
      </div>
    </main>
  );
}
