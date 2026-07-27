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

const privacyLinks = [
  {
    href: "/app/account/data-use",
    title: "我們將如何使用你的資料",
    desc: "公司、銀行、身份及補充文件用途說明",
  },
  {
    href: "/app/account/consents",
    title: "資料用途分項同意",
    desc: "必須／選擇性用途獨立勾選，記錄版本及時間",
  },
  {
    href: "/app/account/third-party",
    title: "授權分享申請資料",
    desc: "向指定第三方分享前的個案授權",
  },
  {
    href: "/app/account/third-party-records",
    title: "第三方分享授權紀錄",
    desc: "已確認的分享授權歷史",
  },
  {
    href: "/app/account/retention",
    title: "資料保留期限",
    desc: "申請資料保存及刪除安排概要",
  },
] as const;

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
        登入狀態、公司資料、私隱及資料授權
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
            {user.profileCompleted
              ? "已完成身份／公司登記"
              : "尚未完成資料填寫"}
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
            description="請先註冊或登入，以保存申請進度及同意紀錄。"
          />
          <Link href="/auth/login">
            <Button fullWidth>前往註冊／登入</Button>
          </Link>
        </div>
      )}

      <SectionHeader title="私隱與資料使用" />
      <StateBanner
        tone={consentOk ? "info" : "warning"}
        title={consentOk ? "必須同意項目已記錄" : "尚未完成必須同意"}
        description={
          consentOk
            ? `政策版本 ${PRIVACY_CONSENT_POLICY_VERSION} · 第三方授權紀錄 ${authCount} 筆`
            : "請先閱讀資料用途，並在「資料用途分項同意」完成必須項目。"
        }
      />

      <div className="mt-3 space-y-2">
        {privacyLinks.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="flex w-full items-center justify-between rounded-2xl border border-border bg-surface-1 px-4 py-3 text-left"
          >
            <span>
              <span className="block text-sm font-medium text-navy-900">
                {item.title}
              </span>
              <span className="mt-0.5 block text-xs text-text-muted">
                {item.desc}
              </span>
            </span>
            <span className="text-text-muted">›</span>
          </Link>
        ))}
      </div>

      <Disclaimer>
        一般資料使用同意，不代表已授權將資料分享給所有銀行、財務機構或服務供應商。每次向新的第三方傳送資料前，系統會另行取得清晰授權。
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
