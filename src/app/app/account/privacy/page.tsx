"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  Disclaimer,
  SectionHeader,
  StateBanner,
} from "@/components/ui/layout";
import {
  loadConsentStore,
  requiredConsentsGranted,
  PRIVACY_CONSENT_POLICY_VERSION,
} from "@/lib/privacy-consents";
import {
  THIRD_PARTY_AUTH_POLICY_VERSION,
  loadActualShares,
  loadThirdPartyAuths,
} from "@/lib/third-party-share";

const links = [
  {
    href: "/app/account/data-use",
    title: "資料使用及文件分析說明",
    desc: "P01／P03 · 收集資料與用途、AI 處理說明",
  },
  {
    href: "/app/account/consents",
    title: "分項資料用途同意",
    desc: "P02 · 必須／選擇性獨立勾選",
  },
  {
    href: "/app/account/third-party",
    title: "第三方分享授權",
    desc: "P04–P06 · 指定機構、資料範圍、確認勾選",
  },
  {
    href: "/app/account/share-records",
    title: "資料分享及授權紀錄",
    desc: "P08 · 授權紀錄與實際分享分開顯示",
  },
  {
    href: "/app/account/share-transfers",
    title: "實際資料分享紀錄",
    desc: "P10 · 已傳送／未傳送／失敗狀態",
  },
  {
    href: "/app/account/auth-update",
    title: "授權更新及重新確認",
    desc: "P12 · 重大改動後重新取得同意",
  },
  {
    href: "/app/account/retention",
    title: "資料保留期限",
    desc: "保存及刪除安排概要",
  },
] as const;

export default function PrivacyHubPage() {
  const [consentOk, setConsentOk] = useState(false);
  const [authCount, setAuthCount] = useState(0);
  const [pendingShare, setPendingShare] = useState(0);

  useEffect(() => {
    void (async () => {
      let key = "anon";
      try {
        const res = await fetch("/api/auth/me");
        const data = await res.json();
        if (res.ok && data.user?.id) key = data.user.id;
      } catch {
        /* anon */
      }
      setConsentOk(requiredConsentsGranted(loadConsentStore(key)));
      setAuthCount(loadThirdPartyAuths(key).length);
      setPendingShare(
        loadActualShares(key).filter((s) => s.status === "已授權，未分享")
          .length,
      );
    })();
  }, []);

  return (
    <main className="px-4 py-5 pb-28">
      <Link
        href="/app/account"
        className="text-sm text-teal-700 hover:underline"
      >
        ← 返回我的帳戶
      </Link>
      <h1 className="mt-3 text-xl font-bold text-navy-900">
        私隱及授權管理
      </h1>
      <p className="mt-2 text-sm text-text-secondary">
        說明收集資料 → 分項同意 → 指定第三方授權 → 查看／撤回 →
        保留審計紀錄。一般同意不涵蓋未知第三方。
      </p>

      <StateBanner
        tone={consentOk ? "info" : "warning"}
        title={consentOk ? "必須資料用途同意已齊" : "請先完成分項必須同意"}
        description={`同意政策 ${PRIVACY_CONSENT_POLICY_VERSION} · 分享授權版本 ${THIRD_PARTY_AUTH_POLICY_VERSION} · 授權 ${authCount} 筆 · 待分享 ${pendingShare} 筆`}
      />

      <SectionHeader title="管理項目" />
      <div className="space-y-2">
        {links.map((item) => (
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
        「同意收集及處理」與「授權提供予指定機構」不同。撤回授權不代表刪除所有資料；授權紀錄與實際分享紀錄必須分開查看。
      </Disclaimer>

      <div className="mt-4">
        <Link href="/app/account">
          <Button fullWidth variant="outline">
            返回帳戶
          </Button>
        </Link>
      </div>
    </main>
  );
}
