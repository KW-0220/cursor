"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  Disclaimer,
  SectionHeader,
  StateBanner,
} from "@/components/ui/layout";
import {
  DEMO_THIRD_PARTY_RECIPIENTS,
  SHARE_DATA_CATEGORIES,
  appendThirdPartyAuth,
  type SharePurpose,
  type ThirdPartyRecipient,
} from "@/lib/third-party-share";

export default function ThirdPartySharePage() {
  const [userKey, setUserKey] = useState("anon");
  const [recipientId, setRecipientId] = useState(
    DEMO_THIRD_PARTY_RECIPIENTS[0]?.id ?? "",
  );
  const [selectedPurposes, setSelectedPurposes] = useState<SharePurpose[]>([]);
  const [confirmed, setConfirmed] = useState(false);
  const [doneMsg, setDoneMsg] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch("/api/auth/me");
        const data = await res.json();
        if (res.ok && data.user?.id) setUserKey(data.user.id);
      } catch {
        /* anon */
      }
    })();
  }, []);

  const recipient: ThirdPartyRecipient | undefined = useMemo(
    () => DEMO_THIRD_PARTY_RECIPIENTS.find((r) => r.id === recipientId),
    [recipientId],
  );

  useEffect(() => {
    if (!recipient) return;
    setSelectedPurposes([...recipient.purposes]);
    setConfirmed(false);
    setDoneMsg(null);
  }, [recipient]);

  const categories = useMemo(() => {
    if (!recipient) return [];
    return SHARE_DATA_CATEGORIES.filter((c) =>
      recipient.dataCategoryIds.includes(c.id),
    );
  }, [recipient]);

  function togglePurpose(p: SharePurpose) {
    setSelectedPurposes((prev) =>
      prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p],
    );
  }

  function authorize() {
    if (!recipient || !confirmed || selectedPurposes.length === 0) return;
    const rec = appendThirdPartyAuth(
      {
        recipientId: recipient.id,
        recipientName: recipient.name,
        orgType: recipient.orgType,
        purposes: selectedPurposes,
        dataCategoryIds: recipient.dataCategoryIds,
      },
      userKey,
    );
    setDoneMsg(
      `已記錄授權：${rec.recipientName}（${new Date(rec.authorizedAt).toLocaleString("zh-HK")}）`,
    );
    setConfirmed(false);
  }

  return (
    <main className="px-4 py-5 pb-28">
      <Link
        href="/app/account"
        className="text-sm text-teal-700 hover:underline"
      >
        ← 返回我的帳戶
      </Link>
      <h1 className="mt-3 text-xl font-bold text-navy-900">
        授權分享申請資料
      </h1>
      <p className="mt-2 text-sm leading-relaxed text-text-secondary">
        為繼續處理你的貸款申請，我們擬將指定資料提供予以下機構。請查看分享目的、資料範圍及接收機構後再作確認。
      </p>

      <StateBanner
        tone="warning"
        title="核心原則"
        description="一般資料使用同意，不代表已授權將資料分享給所有銀行、財務機構或服務供應商。每次向新的第三方傳送前，須另行清晰授權。"
      />

      <SectionHeader title="選擇接收機構" />
      <Card className="space-y-2">
        <label className="block text-xs text-text-muted">機構</label>
        <select
          className="h-11 w-full rounded-xl border border-border bg-surface-1 px-3 text-sm text-navy-900"
          value={recipientId}
          onChange={(e) => setRecipientId(e.target.value)}
        >
          {DEMO_THIRD_PARTY_RECIPIENTS.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name}（{r.orgType}）
            </option>
          ))}
        </select>
      </Card>

      {recipient && (
        <>
          <SectionHeader title="1. 接收機構資料" />
          <Card className="space-y-2 text-sm">
            <Row label="機構名稱" value={recipient.name} />
            <Row label="機構類型" value={recipient.orgType} />
            <Row
              label="私隱資料"
              value={
                <Link
                  href={recipient.privacyUrl}
                  className="text-teal-700 underline"
                >
                  查看私隱說明
                </Link>
              }
            />
            <Row label="預計分享時間" value={recipient.plannedShareAt} />
            <Row label="資料保存安排" value={recipient.retentionNote} />
          </Card>

          <SectionHeader title="2. 分享資料範圍" />
          <div className="space-y-2">
            {categories.map((cat) => (
              <Card key={cat.id}>
                <p className="text-sm font-semibold text-navy-900">
                  {cat.title}
                </p>
                <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-text-secondary">
                  {cat.items.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </Card>
            ))}
          </div>

          <SectionHeader title="3. 分享目的" />
          <Card className="space-y-2">
            <p className="text-xs text-text-muted">
              請確認本次授權涵蓋的目的（可增刪）：
            </p>
            {recipient.purposes.map((p) => (
              <label
                key={p}
                className="flex cursor-pointer items-center gap-2 text-sm text-navy-900"
              >
                <input
                  type="checkbox"
                  className="h-4 w-4 accent-navy-900"
                  checked={selectedPurposes.includes(p)}
                  onChange={() => togglePurpose(p)}
                />
                {p}
              </label>
            ))}
          </Card>

          <Card className="mt-3">
            <label className="flex cursor-pointer items-start gap-3 text-sm">
              <input
                type="checkbox"
                className="mt-1 h-4 w-4 accent-navy-900"
                checked={confirmed}
                onChange={(e) => setConfirmed(e.target.checked)}
              />
              <span>
                我已閱讀上述接收機構、資料範圍及分享目的，並授權 SME LoanFlow
                僅就本個案向該機構分享所列資料。
              </span>
            </label>
          </Card>
        </>
      )}

      {doneMsg && (
        <p className="mt-3 text-sm text-teal-800">{doneMsg}</p>
      )}

      <Disclaimer>
        授權紀錄會保存機構、目的、資料類別、時間及政策版本，可於「第三方分享授權紀錄」查閱。
      </Disclaimer>

      <div className="mt-4 space-y-2">
        <Button
          fullWidth
          disabled={!confirmed || selectedPurposes.length === 0}
          onClick={authorize}
        >
          確認授權分享
        </Button>
        <Link href="/app/account/third-party-records">
          <Button fullWidth variant="outline">
            查看授權紀錄
          </Button>
        </Link>
        <Link href="/app/account">
          <Button fullWidth variant="ghost">
            返回帳戶
          </Button>
        </Link>
      </div>
    </main>
  );
}

function Row({
  label,
  value,
}: {
  label: string;
  value: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-0.5 sm:flex-row sm:justify-between sm:gap-3">
      <dt className="text-text-muted">{label}</dt>
      <dd className="font-medium text-navy-900 sm:text-right">{value}</dd>
    </div>
  );
}
