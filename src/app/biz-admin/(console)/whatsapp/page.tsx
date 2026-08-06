"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { WhatsAppBadge } from "@/components/biz/status";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/field";
import { formatDateTime } from "@/lib/bizdoc/completeness";
import type { BizApplication, BizWhatsAppMessage } from "@/lib/bizdoc/types";

type Row = {
  app: BizApplication;
  msg: BizWhatsAppMessage;
};

type WaStatus = {
  configured: boolean;
  provider: string;
  reviewers: string[];
  publicBaseUrl: string;
  hints: string[];
};

export default function BizAdminWhatsAppPage() {
  const [apps, setApps] = useState<BizApplication[]>([]);
  const [status, setStatus] = useState<WaStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [testTo, setTestTo] = useState("");
  const [testMessage, setTestMessage] = useState("");
  const [testResult, setTestResult] = useState<string | null>(null);
  const [testing, setTesting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [appsRes, stRes] = await Promise.all([
        fetch("/api/biz/admin/applications", { cache: "no-store" }),
        fetch("/api/biz/admin/whatsapp", { cache: "no-store" }),
      ]);
      const appsJson = await appsRes.json();
      const stJson = await stRes.json();
      if (!appsRes.ok) {
        throw new Error(appsJson.message || appsJson.error || "載入失敗");
      }
      setApps(appsJson.applications || []);
      if (stRes.ok) setStatus(stJson);
      if (!testTo && stJson.reviewers?.[0]) setTestTo(stJson.reviewers[0]);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [testTo]);

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const rows = useMemo(() => {
    const out: Row[] = [];
    for (const app of apps) {
      for (const msg of app.whatsapp) {
        out.push({ app, msg });
      }
    }
    return out.sort(
      (a, b) =>
        new Date(b.msg.sentAt).getTime() - new Date(a.msg.sentAt).getTime(),
    );
  }, [apps]);

  async function sendTest() {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch("/api/biz/admin/whatsapp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: testTo,
          message: testMessage || undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || json.error || "發送失敗");
      const r = json.result;
      if (r?.ok) {
        setTestResult(`已發送（${r.provider}${r.messageId ? ` · ${r.messageId}` : ""}）`);
      } else {
        setTestResult(
          `未送出（${r?.provider || "none"}）：${r?.error || "未知錯誤"} · 狀態 ${r?.status}`,
        );
      }
      setStatus({
        configured: json.configured,
        provider: json.provider,
        reviewers: json.reviewers || [],
        publicBaseUrl: json.publicBaseUrl,
        hints: json.hints || [],
      });
    } catch (e) {
      setTestResult(e instanceof Error ? e.message : String(e));
    } finally {
      setTesting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-[color:var(--biz-ink)]">
            WhatsApp 通知中心
          </h2>
          <p className="mt-1 text-sm text-[color:var(--biz-muted)]">
            客戶：提交／補件／文件收齊 · 審核員：新申請／客戶補件回覆
          </p>
        </div>
        <Button size="sm" variant="outline" onClick={() => void load()}>
          重新整理
        </Button>
      </div>

      {status && (
        <div
          className={`rounded-2xl border px-4 py-4 text-sm ${
            status.configured
              ? "border-[color:var(--biz-forest-600)] bg-[color:var(--biz-forest-100)]"
              : "border-[color:var(--biz-gold-600)]/40 bg-[color:var(--biz-gold-100)]/40"
          }`}
        >
          <p className="font-medium">
            接駁狀態：{status.configured ? "已接駁" : "尚未接駁"} · provider＝
            {status.provider}
          </p>
          <p className="mt-1 text-[color:var(--biz-muted)]">
            審核員號碼：
            {status.reviewers.length
              ? status.reviewers.join("、")
              : "未設定 BIZ_REVIEWER_WHATSAPP"}
          </p>
          {status.hints.length > 0 && (
            <ul className="mt-2 space-y-1 text-xs text-[color:var(--biz-muted)]">
              {status.hints.map((h) => (
                <li key={h}>· {h}</li>
              ))}
            </ul>
          )}
        </div>
      )}

      <div className="rounded-2xl border border-[color:var(--biz-border)] bg-white p-4">
        <h3 className="font-semibold">測試發送</h3>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <Field label="收件 WhatsApp（含國碼）" required>
            <Input
              value={testTo}
              placeholder="+85291234567"
              onChange={(e) => setTestTo(e.target.value)}
            />
          </Field>
          <div className="sm:col-span-2">
            <Field label="訊息（可留空用預設）">
              <Textarea
                value={testMessage}
                onChange={(e) => setTestMessage(e.target.value)}
              />
            </Field>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <Button
            size="sm"
            disabled={testing || !testTo.trim()}
            onClick={() => void sendTest()}
          >
            {testing ? "發送中…" : "發送測試訊息"}
          </Button>
          {testResult && (
            <p className="text-sm text-[color:var(--biz-muted)]">{testResult}</p>
          )}
        </div>
      </div>

      {error && (
        <p className="rounded-xl bg-danger-100 px-3 py-2 text-sm text-danger-600">
          {error}
        </p>
      )}

      {loading ? (
        <p className="text-sm text-[color:var(--biz-muted)]">載入中…</p>
      ) : rows.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-[color:var(--biz-border)] bg-white px-6 py-12 text-center text-sm text-[color:var(--biz-muted)]">
          尚無 WhatsApp 紀錄。
        </p>
      ) : (
        <ul className="space-y-3">
          {rows.map(({ app, msg }) => (
            <li
              key={msg.id}
              className="rounded-2xl border border-[color:var(--biz-border)] bg-white p-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="text-xs text-[color:var(--biz-muted)]">
                  <span className="font-medium text-[color:var(--biz-ink)]">
                    {msg.type}
                    {msg.recipientRole ? ` · ${msg.recipientRole}` : ""}
                  </span>{" "}
                  · {formatDateTime(msg.sentAt)} · {msg.phone}
                  {msg.provider ? ` · ${msg.provider}` : ""}
                </div>
                <WhatsAppBadge status={msg.status} />
              </div>
              <p className="mt-2 text-sm">{msg.content}</p>
              {msg.failReason && (
                <p className="mt-1 text-xs text-danger-600">{msg.failReason}</p>
              )}
              <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-[color:var(--biz-muted)]">
                <span>
                  {app.company.nameZh || app.id} · {app.applicant.name}
                </span>
                <Link
                  href={`/biz-admin/applications/${app.id}`}
                  className="text-[color:var(--biz-forest-700)] hover:underline"
                >
                  開啟申請 →
                </Link>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
