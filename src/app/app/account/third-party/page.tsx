"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  Disclaimer,
  SectionHeader,
  StateBanner,
} from "@/components/ui/layout";
import {
  AUTH_CONFIRM_CHECKS,
  DEMO_THIRD_PARTY_RECIPIENTS,
  SHARE_DATA_CATEGORIES,
  appendThirdPartyAuth,
  type AuthConfirmCheckId,
  type SharePurpose,
  type ThirdPartyRecipient,
} from "@/lib/third-party-share";

export default function ThirdPartySharePage() {
  const router = useRouter();
  const [userKey, setUserKey] = useState("anon");
  const [userId, setUserId] = useState("anon");
  const [selectedIds, setSelectedIds] = useState<string[]>([
    DEMO_THIRD_PARTY_RECIPIENTS[0]?.id ?? "",
  ]);
  const [focusId, setFocusId] = useState(
    DEMO_THIRD_PARTY_RECIPIENTS[0]?.id ?? "",
  );
  const [purposesByOrg, setPurposesByOrg] = useState<
    Record<string, SharePurpose[]>
  >({});
  const [checks, setChecks] = useState<Record<AuthConfirmCheckId, boolean>>({
    read_scope: false,
    authorize_share: false,
    org_privacy: false,
    authority: false,
  });
  const [showDetail, setShowDetail] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch("/api/auth/me");
        const data = await res.json();
        if (res.ok && data.user?.id) {
          setUserKey(data.user.id);
          setUserId(data.user.id);
        }
      } catch {
        /* anon */
      }
    })();
    const init: Record<string, SharePurpose[]> = {};
    for (const r of DEMO_THIRD_PARTY_RECIPIENTS) {
      init[r.id] = [...r.purposes];
    }
    setPurposesByOrg(init);
  }, []);

  const focus: ThirdPartyRecipient | undefined = useMemo(
    () => DEMO_THIRD_PARTY_RECIPIENTS.find((r) => r.id === focusId),
    [focusId],
  );

  const allChecksOk = AUTH_CONFIRM_CHECKS.every((c) => checks[c.id]);

  function toggleOrg(id: string) {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
    setFocusId(id);
    setError(null);
  }

  function togglePurpose(orgId: string, p: SharePurpose) {
    setPurposesByOrg((prev) => {
      const cur = prev[orgId] ?? [];
      return {
        ...prev,
        [orgId]: cur.includes(p) ? cur.filter((x) => x !== p) : [...cur, p],
      };
    });
  }

  function agreeAndContinue() {
    if (selectedIds.length === 0) {
      setError("請至少選擇一間指定機構。");
      return;
    }
    if (!allChecksOk) {
      setError("請完成全部四項確認勾選。");
      return;
    }
    for (const id of selectedIds) {
      const recipient = DEMO_THIRD_PARTY_RECIPIENTS.find((r) => r.id === id);
      if (!recipient) continue;
      const purposes = purposesByOrg[id] ?? [];
      if (!purposes.length) {
        setError(`請為「${recipient.name}」選擇至少一個分享目的。`);
        return;
      }
      appendThirdPartyAuth(
        {
          recipient,
          purposes,
          confirmChecks: AUTH_CONFIRM_CHECKS.map((c) => c.id),
          userId,
          applicationId: "SLF-DRAFT",
          companyId: "CO-DRAFT",
        },
        userKey,
      );
    }
    router.push("/app/account/share-records?created=1");
  }

  function decline() {
    router.push("/app/account/share-records?declined=1");
  }

  return (
    <main className="px-4 py-5 pb-28">
      <Link
        href="/app/account/privacy"
        className="text-sm text-teal-700 hover:underline"
      >
        ← 私隱及授權管理
      </Link>
      <h1 className="mt-3 text-xl font-bold text-navy-900">
        授權分享申請資料
      </h1>
      <p className="mt-2 text-sm leading-relaxed text-text-secondary">
        為繼續處理你的貸款申請，我們擬將指定資料提供予以下機構。請查看分享目的、資料範圍及接收機構後再作確認。不同第三方建議逐間獨立授權，或清楚列出並逐項選擇。
      </p>

      <StateBanner
        tone="warning"
        title="不可廣泛授權"
        description="請勿使用「同意分享給合作夥伴／任何第三方」。必須清楚列名指定機構。"
      />

      <SectionHeader title="選擇接收機構（可多選，逐間授權）" />
      <div className="space-y-2">
        {DEMO_THIRD_PARTY_RECIPIENTS.map((r) => (
          <label
            key={r.id}
            className="flex cursor-pointer items-start gap-3 rounded-2xl border border-border bg-surface-1 px-4 py-3"
          >
            <input
              type="checkbox"
              className="mt-1 h-4 w-4 accent-navy-900"
              checked={selectedIds.includes(r.id)}
              onChange={() => toggleOrg(r.id)}
            />
            <button
              type="button"
              className="flex-1 text-left"
              onClick={() => setFocusId(r.id)}
            >
              <span className="block text-sm font-semibold text-navy-900">
                {r.name}
              </span>
              <span className="mt-0.5 block text-xs text-text-muted">
                {r.orgType}
                {focusId === r.id ? " · 正在查看詳情" : ""}
              </span>
            </button>
          </label>
        ))}
      </div>

      {focus && showDetail && (
        <>
          <SectionHeader title="接收機構及分享資料詳情" />
          <Card className="space-y-2 text-sm">
            <Row label="機構名稱" value={focus.name} />
            <Row label="機構類型" value={focus.orgType} />
            <Row
              label="私隱資料"
              value={
                <Link href={focus.privacyUrl} className="text-teal-700 underline">
                  查看詳細資料
                </Link>
              }
            />
            <Row label="預計分享時間" value={focus.plannedShareAt} />
            <Row label="資料保存安排" value={focus.retentionNote} />
          </Card>

          <div className="mt-3 space-y-2">
            {SHARE_DATA_CATEGORIES.filter((c) =>
              focus.dataCategoryIds.includes(c.id),
            ).map((cat) => (
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

          <SectionHeader title={`分享目的 · ${focus.name}`} />
          <Card className="space-y-2">
            {focus.purposes.map((p) => (
              <label
                key={p}
                className="flex cursor-pointer items-center gap-2 text-sm"
              >
                <input
                  type="checkbox"
                  className="h-4 w-4 accent-navy-900"
                  checked={(purposesByOrg[focus.id] ?? []).includes(p)}
                  onChange={() => togglePurpose(focus.id, p)}
                />
                {p}
              </label>
            ))}
          </Card>
        </>
      )}

      <SectionHeader title="授權確認" />
      <Card className="space-y-3">
        {AUTH_CONFIRM_CHECKS.map((c) => (
          <label
            key={c.id}
            className="flex cursor-pointer items-start gap-3 text-sm"
          >
            <input
              type="checkbox"
              className="mt-1 h-4 w-4 accent-navy-900"
              checked={checks[c.id]}
              onChange={(e) =>
                setChecks((prev) => ({ ...prev, [c.id]: e.target.checked }))
              }
            />
            <span>{c.label}</span>
          </label>
        ))}
      </Card>

      {error && (
        <p className="mt-3 text-sm text-danger-600">{error}</p>
      )}

      <Disclaimer>
        公司授權不一定等於個人授權。身份證明屬個人資料；董事／股東／擔保人可能需額外確認（OTP／電子簽署），由合規團隊界定。
      </Disclaimer>

      <div className="mt-4 space-y-2">
        <Button fullWidth onClick={agreeAndContinue}>
          同意並繼續
        </Button>
        <Button fullWidth variant="outline" onClick={decline}>
          暫不同意
        </Button>
        <Button
          fullWidth
          variant="ghost"
          onClick={() => setShowDetail((v) => !v)}
        >
          {showDetail ? "收起詳細資料" : "查看詳細資料"}
        </Button>
        <Link href="/app/account">
          <Button fullWidth variant="ghost">
            聯絡貸款顧問
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
