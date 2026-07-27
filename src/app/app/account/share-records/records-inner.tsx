"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  Disclaimer,
  SectionHeader,
  StateBanner,
} from "@/components/ui/layout";
import {
  categoriesForIds,
  loadActualShares,
  loadThirdPartyAuths,
  type ActualShareRecord,
  type ThirdPartyAuthRecord,
} from "@/lib/third-party-share";

export default function ShareRecordsInner() {
  const params = useSearchParams();
  const [auths, setAuths] = useState<ThirdPartyAuthRecord[]>([]);
  const [shares, setShares] = useState<ActualShareRecord[]>([]);

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
      setAuths(loadThirdPartyAuths(key));
      setShares(loadActualShares(key));
    })();
  }, []);

  const created = params.get("created") === "1";
  const declined = params.get("declined") === "1";

  return (
    <main className="px-4 py-5 pb-28">
      <Link
        href="/app/account/privacy"
        className="text-sm text-teal-700 hover:underline"
      >
        ← 私隱及授權管理
      </Link>
      <h1 className="mt-3 text-xl font-bold text-navy-900">
        資料分享及授權紀錄
      </h1>
      <p className="mt-2 text-sm text-text-secondary">
        我的帳戶 → 私隱及授權管理 → 分享紀錄。授權紀錄與實際分享紀錄分開。
      </p>

      {created && (
        <StateBanner
          tone="info"
          title="已建立授權紀錄"
          description="系統尚未必定已傳送資料。請在「實際資料分享紀錄」查看傳送狀態。"
        />
      )}
      {declined && (
        <StateBanner
          tone="warning"
          title="暫不同意分享"
          description="案件可保留但不向該第三方分享資料。建議聯絡貸款顧問了解對申請的影響。"
        />
      )}

      <SectionHeader title="授權紀錄" />
      {auths.length === 0 ? (
        <Card className="text-sm text-text-muted">尚未有授權紀錄。</Card>
      ) : (
        <div className="space-y-3">
          {auths.map((r) => {
            const share = shares.find((s) => s.authId === r.id);
            const cats = categoriesForIds(r.dataCategoryIds)
              .map((c) => c.title)
              .join("、");
            return (
              <Card key={r.id} className="space-y-2 text-sm">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold text-navy-900">
                      {r.recipientName}
                    </p>
                    <p className="text-xs text-text-muted">{r.orgType}</p>
                  </div>
                  <span className="rounded-full bg-surface-2 px-2 py-0.5 text-xs">
                    {r.status}
                  </span>
                </div>
                <dl className="space-y-1 text-xs text-text-secondary">
                  <div className="flex justify-between gap-2">
                    <dt>分享目的</dt>
                    <dd className="text-right">{r.purposes.join("、")}</dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt>授權日期</dt>
                    <dd>{new Date(r.authorizedAt).toLocaleString("zh-HK")}</dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt>分享日期</dt>
                    <dd>
                      {r.sharedAt
                        ? new Date(r.sharedAt).toLocaleString("zh-HK")
                        : share?.status === "已授權，未分享"
                          ? "尚未傳送"
                          : "—"}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt>資料範圍</dt>
                    <dd className="text-right">{cats || "—"}</dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt>授權版本</dt>
                    <dd>{r.policyVersion}</dd>
                  </div>
                </dl>
                <Link
                  href={`/app/account/share-records/${r.id}`}
                  className="inline-block text-xs font-medium text-teal-700"
                >
                  查看詳情 ›
                </Link>
              </Card>
            );
          })}
        </div>
      )}

      <Disclaimer>
        客戶可能已授權分享，但系統最終未有傳送資料。請同時查看「實際資料分享紀錄」。
      </Disclaimer>

      <div className="mt-4 space-y-2">
        <Link href="/app/account/share-transfers">
          <Button fullWidth variant="outline">
            實際資料分享紀錄
          </Button>
        </Link>
        <Link href="/app/account/third-party">
          <Button fullWidth>新增分享授權</Button>
        </Link>
      </div>
    </main>
  );
}
