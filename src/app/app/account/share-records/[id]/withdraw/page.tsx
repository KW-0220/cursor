"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  Disclaimer,
  SectionHeader,
  StateBanner,
} from "@/components/ui/layout";
import {
  WITHDRAW_COPY,
  WITHDRAW_IMPACTS,
  getAuthById,
  withdrawAuth,
  type ThirdPartyAuthRecord,
} from "@/lib/third-party-share";

export default function WithdrawAuthPage() {
  const params = useParams();
  const router = useRouter();
  const id = String(params.id ?? "");
  const [auth, setAuth] = useState<ThirdPartyAuthRecord | null>(null);
  const [userKey, setUserKey] = useState("anon");
  const [ack, setAck] = useState(false);
  const [confirmAgain, setConfirmAgain] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      setAuth(getAuthById(id, key) ?? null);
    })();
  }, [id]);

  function submit() {
    if (!ack || !confirmAgain) {
      setError("請閱讀影響並完成兩次確認。");
      return;
    }
    if (!auth || auth.status !== "有效") {
      setError("此授權不可撤回。");
      return;
    }
    withdrawAuth(auth.id, userKey, "客戶於 App 確認撤回");
    router.push(`/app/account/share-records/${auth.id}?withdrawn=1`);
  }

  if (!auth) {
    return (
      <main className="px-4 py-5">
        <p className="text-sm text-text-muted">找不到授權。</p>
      </main>
    );
  }

  return (
    <main className="px-4 py-5 pb-28">
      <Link
        href={`/app/account/share-records/${id}`}
        className="text-sm text-teal-700 hover:underline"
      >
        ← 返回授權詳情
      </Link>
      <h1 className="mt-3 text-xl font-bold text-navy-900">
        撤回資料分享授權
      </h1>
      <p className="mt-2 text-sm text-text-secondary">
        私隱及授權管理 → 選擇相關第三方 → 查看授權詳情 → 撤回授權
      </p>

      <StateBanner
        tone="warning"
        title={auth.recipientName}
        description={`目前狀態：${auth.status}`}
      />

      <SectionHeader title="撤回可能影響" />
      <Card>
        <ul className="list-inside list-disc space-y-1 text-sm text-text-secondary">
          {WITHDRAW_IMPACTS.map((x) => (
            <li key={x}>{x}</li>
          ))}
        </ul>
        <p className="mt-3 text-sm text-navy-900">{WITHDRAW_COPY}</p>
      </Card>

      <Card className="mt-3 space-y-3">
        <label className="flex items-start gap-3 text-sm">
          <input
            type="checkbox"
            className="mt-1 h-4 w-4 accent-navy-900"
            checked={ack}
            onChange={(e) => setAck(e.target.checked)}
          />
          <span>我已閱讀撤回影響，並明白撤回≠刪除所有資料。</span>
        </label>
        <label className="flex items-start gap-3 text-sm">
          <input
            type="checkbox"
            className="mt-1 h-4 w-4 accent-navy-900"
            checked={confirmAgain}
            onChange={(e) => setConfirmAgain(e.target.checked)}
          />
          <span>我再次確認要撤回對「{auth.recipientName}」的分享授權。</span>
        </label>
      </Card>

      {error && <p className="mt-3 text-sm text-danger-600">{error}</p>}

      <Disclaimer>
        撤回、停止分享及刪除資料屬不同操作，介面不可混為一談。
      </Disclaimer>

      <div className="mt-4 space-y-2">
        <Button fullWidth variant="danger" onClick={submit}>
          確認撤回
        </Button>
        <Link href={`/app/account/share-records/${id}`}>
          <Button fullWidth variant="outline">
            返回
          </Button>
        </Link>
        <Link href="/app/account">
          <Button fullWidth variant="ghost">
            聯絡貸款顧問
          </Button>
        </Link>
      </div>
    </main>
  );
}
