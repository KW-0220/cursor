"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  Disclaimer,
  SectionHeader,
  StateBanner,
} from "@/components/ui/layout";
import {
  PRIVACY_CONSENT_POLICY_VERSION,
  loadConsentStore,
  requiredConsentsGranted,
} from "@/lib/privacy-consents";
import { loadThirdPartyAuths } from "@/lib/third-party-share";

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
  const [consentOk, setConsentOk] = useState(false);
  const [authCount, setAuthCount] = useState(0);

  useEffect(() => {
    void (async () => {
      let me: Me | null = null;
      try {
        const res = await fetch("/api/auth/me");
        const data = await res.json();
        if (res.ok) me = data.user;
      } catch {
        me = null;
      }
      setUser(me);
      const key = me?.id || "anon";
      setConsentOk(requiredConsentsGranted(loadConsentStore(key)));
      setAuthCount(loadThirdPartyAuths(key).length);
      setLoading(false);
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
        登入狀態、公司資料、私隱及授權管理
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
            description="請先註冊或登入，以保存申請進度及授權紀錄。"
          />
          <Link href="/auth/login">
            <Button fullWidth>前往註冊／登入</Button>
          </Link>
        </div>
      )}

      <SectionHeader title="私隱及授權管理" />
      <StateBanner
        tone={consentOk ? "info" : "warning"}
        title={consentOk ? "必須同意已記錄" : "尚未完成必須同意"}
        description={`政策 ${PRIVACY_CONSENT_POLICY_VERSION} · 分享授權 ${authCount} 筆`}
      />
      <Link
        href="/app/account/privacy"
        className="mt-3 flex w-full items-center justify-between rounded-2xl border border-border bg-surface-1 px-4 py-3 text-left"
      >
        <span>
          <span className="block text-sm font-medium text-navy-900">
            進入私隱及授權管理
          </span>
          <span className="mt-0.5 block text-xs text-text-muted">
            資料用途說明 · 分項同意 · 第三方授權 · 分享紀錄
          </span>
        </span>
        <span className="text-text-muted">›</span>
      </Link>
      <Link
        href="/app/account/share-records"
        className="mt-2 flex w-full items-center justify-between rounded-2xl border border-border bg-surface-1 px-4 py-3 text-left"
      >
        <span>
          <span className="block text-sm font-medium text-navy-900">
            資料分享及授權紀錄
          </span>
          <span className="mt-0.5 block text-xs text-text-muted">
            我的帳戶 → 私隱及授權管理 → 分享紀錄
          </span>
        </span>
        <span className="text-text-muted">›</span>
      </Link>

      <Disclaimer>
        避免「同意所有用途／任何第三方／一經同意不可撤回」等表述。授權≠實際分享；撤回≠刪除全部資料。
      </Disclaimer>

      <div className="mt-4 space-y-2">
        {user && (
          <Button fullWidth variant="outline" onClick={() => void logout()}>
            登出
          </Button>
        )}
        <Link href="/">
          <Button fullWidth variant="ghost">
            返回首頁
          </Button>
        </Link>
      </div>
    </main>
  );
}
