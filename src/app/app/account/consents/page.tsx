"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  Disclaimer,
  SectionHeader,
  StateBanner,
} from "@/components/ui/layout";
import {
  CONSENT_ITEMS,
  PRIVACY_CONSENT_POLICY_VERSION,
  emptyConsentSelections,
  loadConsentStore,
  requiredConsentsGranted,
  saveConsentStore,
  type ConsentRecord,
  type ConsentStore,
} from "@/lib/privacy-consents";

type Me = { id: string };

export default function ConsentsPage() {
  const [userKey, setUserKey] = useState("anon");
  const [selections, setSelections] = useState<Record<string, boolean>>(
    emptyConsentSelections(),
  );
  const [openId, setOpenId] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      let key = "anon";
      try {
        const res = await fetch("/api/auth/me");
        const data = await res.json();
        if (res.ok && data.user?.id) key = data.user.id as string;
      } catch {
        /* anon */
      }
      setUserKey(key);
      const store = loadConsentStore(key);
      if (store?.policyVersion === PRIVACY_CONSENT_POLICY_VERSION) {
        const next = emptyConsentSelections();
        for (const r of store.records) next[r.itemId] = r.granted;
        setSelections(next);
        setSavedAt(store.updatedAt);
      }
    })();
  }, []);

  const requiredOk = useMemo(() => {
    const fake: ConsentStore = {
      policyVersion: PRIVACY_CONSENT_POLICY_VERSION,
      updatedAt: new Date().toISOString(),
      records: Object.entries(selections).map(([itemId, granted]) => ({
        itemId,
        granted,
        policyVersion: PRIVACY_CONSENT_POLICY_VERSION,
        decidedAt: new Date().toISOString(),
      })),
    };
    return requiredConsentsGranted(fake);
  }, [selections]);

  function toggle(id: string, value: boolean) {
    setSelections((prev) => ({ ...prev, [id]: value }));
    setMessage(null);
  }

  function save() {
    const now = new Date().toISOString();
    const records: ConsentRecord[] = CONSENT_ITEMS.map((item) => ({
      itemId: item.id,
      granted: Boolean(selections[item.id]),
      policyVersion: PRIVACY_CONSENT_POLICY_VERSION,
      decidedAt: now,
    }));
    const store: ConsentStore = {
      policyVersion: PRIVACY_CONSENT_POLICY_VERSION,
      updatedAt: now,
      records,
    };
    saveConsentStore(store, userKey);
    setSavedAt(now);
    setMessage(
      requiredOk
        ? "已儲存同意紀錄（含版本及時間）。"
        : "已儲存，但仍有必須項目未勾選。",
    );
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
        資料用途分項同意
      </h1>
      <p className="mt-2 text-sm text-text-secondary">
        不可只使用一個「全部同意」。每項獨立勾選；選擇性用途不會預先勾選，亦不會與貸款必須同意綑綁。
      </p>

      <StateBanner
        tone="info"
        title={`政策版本 ${PRIVACY_CONSENT_POLICY_VERSION}`}
        description={
          savedAt
            ? `上次儲存：${new Date(savedAt).toLocaleString("zh-HK")}`
            : "尚未儲存本裝置上的同意紀錄"
        }
      />

      <SectionHeader title="同意項目" />
      <div className="space-y-3">
        {CONSENT_ITEMS.map((item) => {
          const open = openId === item.id;
          const checked = Boolean(selections[item.id]);
          return (
            <Card key={item.id} className="space-y-2">
              <label className="flex cursor-pointer items-start gap-3">
                <input
                  type="checkbox"
                  className="mt-1 h-4 w-4 accent-navy-900"
                  checked={checked}
                  onChange={(e) => toggle(item.id, e.target.checked)}
                />
                <span className="flex-1">
                  <span className="block text-sm font-semibold text-navy-900">
                    {item.label}
                  </span>
                  <span className="mt-0.5 block text-xs text-teal-800">
                    {item.requirementLabel}
                  </span>
                  <span className="mt-1 block text-xs text-text-secondary">
                    {item.summary}
                  </span>
                </span>
              </label>
              <button
                type="button"
                className="text-xs font-medium text-teal-700"
                onClick={() => setOpenId(open ? null : item.id)}
              >
                {open ? "收起詳細說明" : "展開詳細說明"}
              </button>
              {open && (
                <ul className="list-inside list-disc space-y-1 rounded-lg bg-surface-2 px-3 py-2 text-xs text-text-secondary">
                  {item.details.map((d) => (
                    <li key={d}>{d}</li>
                  ))}
                </ul>
              )}
            </Card>
          );
        })}
      </div>

      {!requiredOk && (
        <StateBanner
          tone="warning"
          title="必須項目尚未齊"
          description="請勾選所有標示為「必須」的同意項目後再繼續申請流程。"
        />
      )}
      {message && (
        <p className="mt-3 text-sm text-teal-800">{message}</p>
      )}

      <Disclaimer>
        系統會記錄每項同意的政策版本及決定時間。向指定銀行或其他機構分享資料，須另於「授權分享申請資料」確認。
      </Disclaimer>

      <div className="mt-4 space-y-2">
        <Button fullWidth onClick={save}>
          儲存同意紀錄
        </Button>
        <Link href="/app/account/data-use">
          <Button fullWidth variant="outline">
            查看資料使用目的
          </Button>
        </Link>
        <Link href="/app/account/third-party">
          <Button fullWidth variant="outline">
            前往第三方分享授權
          </Button>
        </Link>
      </div>
    </main>
  );
}
