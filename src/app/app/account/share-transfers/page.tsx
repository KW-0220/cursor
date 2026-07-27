"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, Disclaimer, SectionHeader } from "@/components/ui/layout";
import {
  loadActualShares,
  markShareSent,
  type ActualShareRecord,
} from "@/lib/third-party-share";

export default function ShareTransfersPage() {
  const [userKey, setUserKey] = useState("anon");
  const [rows, setRows] = useState<ActualShareRecord[]>([]);

  function refresh(key: string) {
    setRows(loadActualShares(key));
  }

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
      setUserKey(key);
      refresh(key);
    })();
  }, []);

  return (
    <main className="px-4 py-5 pb-28">
      <Link
        href="/app/account/privacy"
        className="text-sm text-teal-700 hover:underline"
      >
        ← 私隱及授權管理
      </Link>
      <h1 className="mt-3 text-xl font-bold text-navy-900">
        實際資料分享紀錄
      </h1>
      <p className="mt-2 text-sm text-text-secondary">
        與「授權紀錄」分開：客戶可能已授權，但系統最終未有傳送資料。
      </p>

      <SectionHeader title="傳送狀態" />
      {rows.length === 0 ? (
        <Card className="text-sm text-text-muted">尚未有實際分享紀錄。</Card>
      ) : (
        <div className="space-y-3">
          {rows.map((r) => (
            <Card key={r.id} className="space-y-1 text-sm">
              <div className="flex justify-between gap-2">
                <p className="font-semibold text-navy-900">{r.recipientName}</p>
                <span className="text-xs">{r.status}</span>
              </div>
              <p className="text-xs text-text-muted">相關授權：{r.authId}</p>
              <p className="text-xs text-text-secondary">
                分享時間：
                {r.sharedAt
                  ? new Date(r.sharedAt).toLocaleString("zh-HK")
                  : "—"}
              </p>
              <p className="text-xs text-text-secondary">
                傳送方式：{r.transferMethod} · 加密：
                {r.encrypted ? "是" : "否"}
              </p>
              <p className="text-xs text-text-secondary">
                資料：{r.dataSummary.join("、") || "—"}
              </p>
              <p className="text-xs text-text-secondary">
                文件版本：{r.documentVersions.join(", ") || "—"}
              </p>
              <p className="text-xs text-text-secondary">
                接收確認：{r.receivedAck ? "是" : "否"} · 重試：{r.retryCount} ·
                操作：{r.operator}
              </p>
              {r.failureReason && (
                <p className="text-xs text-danger-600">
                  失敗原因：{r.failureReason}
                </p>
              )}
              {r.status === "已授權，未分享" && (
                <Button
                  size="sm"
                  className="mt-2"
                  variant="outline"
                  onClick={() => {
                    markShareSent(r.authId, userKey);
                    refresh(userKey);
                  }}
                >
                  模擬實際傳送（示範）
                </Button>
              )}
              <Link
                href={`/app/account/share-records/${r.authId}`}
                className="mt-2 inline-block text-xs text-teal-700"
              >
                查看授權詳情 ›
              </Link>
            </Card>
          ))}
        </div>
      )}

      <Disclaimer>
        後台狀態包括：已授權未分享、傳送中、已成功分享、部分失敗、傳送失敗、授權已撤回／已過期。
      </Disclaimer>

      <div className="mt-4 space-y-2">
        <Link href="/app/account/share-records">
          <Button fullWidth variant="outline">
            返回授權紀錄
          </Button>
        </Link>
      </div>
    </main>
  );
}
