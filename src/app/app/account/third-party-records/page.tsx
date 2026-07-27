"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, Disclaimer, SectionHeader } from "@/components/ui/layout";
import {
  SHARE_DATA_CATEGORIES,
  loadThirdPartyAuths,
  type ThirdPartyAuthRecord,
} from "@/lib/third-party-share";

export default function ThirdPartyRecordsPage() {
  const [records, setRecords] = useState<ThirdPartyAuthRecord[]>([]);

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
      setRecords(loadThirdPartyAuths(key));
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
        第三方分享授權紀錄
      </h1>
      <p className="mt-2 text-sm text-text-secondary">
        僅顯示你曾確認的個案授權。一般資料使用同意不會自動產生此處紀錄。
      </p>

      <SectionHeader title="授權歷史" />
      {records.length === 0 ? (
        <Card className="text-sm text-text-muted">
          尚未有第三方分享授權紀錄。
        </Card>
      ) : (
        <div className="space-y-3">
          {records.map((r) => {
            const cats = SHARE_DATA_CATEGORIES.filter((c) =>
              r.dataCategoryIds.includes(c.id),
            )
              .map((c) => c.title)
              .join("、");
            return (
              <Card key={r.id} className="space-y-1 text-sm">
                <p className="font-semibold text-navy-900">{r.recipientName}</p>
                <p className="text-xs text-text-muted">
                  {r.orgType} · 版本 {r.policyVersion}
                </p>
                <p className="text-text-secondary">
                  時間：{new Date(r.authorizedAt).toLocaleString("zh-HK")}
                </p>
                <p className="text-text-secondary">
                  目的：{r.purposes.join("、")}
                </p>
                <p className="text-text-secondary">資料範圍：{cats || "—"}</p>
              </Card>
            );
          })}
        </div>
      )}

      <Disclaimer>
        正式環境建議將授權紀錄同步至後端審計日誌，並與個案／提交紀錄關聯。
      </Disclaimer>

      <div className="mt-4 space-y-2">
        <Link href="/app/account/third-party">
          <Button fullWidth>新增分享授權</Button>
        </Link>
        <Link href="/app/account">
          <Button fullWidth variant="outline">
            返回帳戶
          </Button>
        </Link>
      </div>
    </main>
  );
}
