"use client";

import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  Disclaimer,
  SectionHeader,
  StateBanner,
} from "@/components/ui/layout";
import {
  AUTH_CONFIRM_CHECKS,
  categoriesForIds,
  getAuthById,
  loadActualShares,
  type ActualShareRecord,
  type ThirdPartyAuthRecord,
} from "@/lib/third-party-share";

export default function AuthDetailPage() {
  return (
    <Suspense
      fallback={
        <main className="px-4 py-8 text-sm text-text-muted">載入授權詳情…</main>
      }
    >
      <AuthDetailInner />
    </Suspense>
  );
}

function AuthDetailInner() {
  const params = useParams();
  const search = useSearchParams();
  const id = String(params.id ?? "");
  const withdrawn = search.get("withdrawn") === "1";
  const [auth, setAuth] = useState<ThirdPartyAuthRecord | null>(null);
  const [share, setShare] = useState<ActualShareRecord | null>(null);

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
      setAuth(getAuthById(id, key) ?? null);
      setShare(loadActualShares(key).find((s) => s.authId === id) ?? null);
    })();
  }, [id]);

  if (!auth) {
    return (
      <main className="px-4 py-5 pb-28">
        <p className="text-sm text-text-muted">找不到授權紀錄。</p>
        <Link href="/app/account/share-records" className="mt-4 inline-block">
          <Button variant="outline">返回分享紀錄</Button>
        </Link>
      </main>
    );
  }

  const cats = categoriesForIds(auth.dataCategoryIds);

  return (
    <main className="px-4 py-5 pb-28">
      <Link
        href="/app/account/share-records"
        className="text-sm text-teal-700 hover:underline"
      >
        ← 資料分享及授權紀錄
      </Link>
      <h1 className="mt-3 text-xl font-bold text-navy-900">單次授權詳情</h1>
      <p className="mt-1 text-sm text-text-secondary">{auth.recipientName}</p>

      {withdrawn && (
        <StateBanner
          tone="info"
          title="已完成撤回"
          description="尚未完成的資料分享已停止。已傳送予第三方的資料可能仍按其法律責任及保留政策處理。"
        />
      )}

      <SectionHeader title="授權資料" />
      <Card className="space-y-2 text-sm">
        <Row label="授權編號" value={auth.id} />
        <Row label="相關申請編號" value={auth.applicationId} />
        <Row label="接收機構完整名稱" value={auth.recipientName} />
        <Row label="機構類型" value={auth.orgType} />
        <Row label="分享目的" value={auth.purposes.join("、")} />
        <Row
          label="同意日期及時間"
          value={new Date(auth.authorizedAt).toLocaleString("zh-HK")}
        />
        <Row
          label="實際分享日期及時間"
          value={
            auth.sharedAt
              ? new Date(auth.sharedAt).toLocaleString("zh-HK")
              : "尚未傳送"
          }
        />
        <Row label="授權方式" value={auth.authMethod} />
        <Row label="授權條款版本" value={auth.policyVersion} />
        <Row label="相關私隱政策版本" value={auth.privacyPolicyVersion} />
        <Row label="授權狀態" value={auth.status} />
        <Row label="時區" value={auth.timezone} />
      </Card>

      <SectionHeader title="分享資料清單" />
      <div className="space-y-2">
        {cats.map((c) => (
          <Card key={c.id}>
            <p className="text-sm font-semibold text-navy-900">{c.title}</p>
            <ul className="mt-1 list-inside list-disc text-xs text-text-secondary">
              {c.items.map((i) => (
                <li key={i}>{i}</li>
              ))}
            </ul>
          </Card>
        ))}
      </div>

      <SectionHeader title="客戶所選確認選項" />
      <Card className="space-y-1 text-sm text-text-secondary">
        {AUTH_CONFIRM_CHECKS.map((c) => (
          <p key={c.id}>
            {auth.confirmChecks.includes(c.id) ? "☑" : "☐"} {c.label}
          </p>
        ))}
      </Card>

      {auth.withdraw && (
        <>
          <SectionHeader title="撤回紀錄" />
          <Card className="space-y-1 text-sm">
            <Row
              label="撤回時間"
              value={new Date(auth.withdraw.withdrawnAt).toLocaleString("zh-HK")}
            />
            <Row label="原因" value={auth.withdraw.reason || "—"} />
          </Card>
          <SectionHeader title="撤回後的影響" />
          <Card className="text-sm text-text-secondary">
            停止尚未完成的相關資料分享。已經傳送予第三方的資料，可能仍會按該機構的法律責任及資料保留政策處理。撤回≠刪除所有資料。
          </Card>
        </>
      )}

      <SectionHeader title="實際分享狀態" />
      <Card className="text-sm text-text-secondary">
        {share ? (
          <>
            <p>狀態：{share.status}</p>
            <p className="mt-1">傳送方式：{share.transferMethod}</p>
            <p className="mt-1">操作：{share.operator}</p>
          </>
        ) : (
          <p>尚未建立實際分享紀錄。</p>
        )}
      </Card>

      <Disclaimer>
        撤回授權可能停止尚未完成的分享，但不一定能收回第三方已合法取得的資料；亦不影響撤回前已完成的合法處理。
      </Disclaimer>

      <div className="mt-4 space-y-2">
        {auth.status === "有效" && (
          <Link href={`/app/account/share-records/${auth.id}/withdraw`}>
            <Button fullWidth variant="danger">
              撤回授權
            </Button>
          </Link>
        )}
        <Link href="/app/account">
          <Button fullWidth variant="outline">
            聯絡貸款顧問
          </Button>
        </Link>
        <Link href="/app/account/share-records">
          <Button fullWidth variant="ghost">
            返回
          </Button>
        </Link>
      </div>
    </main>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5 sm:flex-row sm:justify-between sm:gap-3">
      <dt className="text-text-muted">{label}</dt>
      <dd className="font-medium text-navy-900 sm:text-right">{value}</dd>
    </div>
  );
}
