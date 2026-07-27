"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  Disclaimer,
  SectionHeader,
  StateBanner,
} from "@/components/ui/layout";
import {
  AUTH_VERSION_CHANGES,
  THIRD_PARTY_AUTH_POLICY_VERSION,
} from "@/lib/third-party-share";

export default function AuthUpdatePage() {
  const latest = AUTH_VERSION_CHANGES[0];

  return (
    <main className="px-4 py-5 pb-28">
      <Link
        href="/app/account/privacy"
        className="text-sm text-teal-700 hover:underline"
      >
        ← 私隱及授權管理
      </Link>
      <h1 className="mt-3 text-xl font-bold text-navy-900">
        授權更新及重新確認
      </h1>
      <p className="mt-2 text-sm text-text-secondary">
        當新增資料用途、第三方類別、分享資料種類，或私隱政策重大修改時，舊授權不可自動套用至新用途。
      </p>

      <StateBanner
        tone="warning"
        title="授權內容已更新"
        description={`目前條款版本：${THIRD_PARTY_AUTH_POLICY_VERSION}。請閱讀主要改動後重新確認。`}
      />

      <SectionHeader title="主要改動比較" />
      <Card>
        <p className="text-xs text-text-muted">版本 {latest?.version}</p>
        <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-text-secondary">
          {(latest?.changes ?? []).map((c) => (
            <li key={c}>{c}</li>
          ))}
        </ul>
      </Card>

      <Disclaimer>
        系統會保留舊版本及新版本紀錄。重新確認後，舊有效授權可能標示為「被取代」。
      </Disclaimer>

      <div className="mt-4 space-y-2">
        <Link href="/app/account/third-party">
          <Button fullWidth>重新確認並授權</Button>
        </Link>
        <Link href="/app/account/share-records">
          <Button fullWidth variant="outline">
            查看舊授權紀錄
          </Button>
        </Link>
      </div>
    </main>
  );
}
