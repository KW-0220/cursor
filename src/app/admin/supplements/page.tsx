"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import {
  Card,
  EmptyState,
  SectionHeader,
  StateBanner,
} from "@/components/ui/layout";
import { formatDateTime } from "@/lib/utils";

const templates = [
  "缺頁：銀行結單不完整",
  "影像模糊，請重新上載",
  "公司名稱與申請資料不一致",
  "審計報告未見核數師簽署",
  "銀行結單月份不連續",
];

const DOC_TYPES = [
  "銀行結單",
  "審計報告",
  "授信信",
  "物業證明",
  "身份證明",
  "商業登記證 BR",
  "其他",
] as const;

type NotifyMode = "app_push_email" | "app_push" | "email";

type SupplementItem = {
  id: string;
  applicationId: string;
  documentType: string;
  reason: string;
  detail: string;
  dueDate: string;
  required: boolean;
  needOcr: boolean;
  notifyChannels: Array<"app_push" | "email">;
  toEmail: string | null;
  companyNameZh: string | null;
  applicantNameZh: string | null;
  status: string;
  emailStatus: string;
  emailId: string | null;
  emailError: string | null;
  pushStatus: string;
  createdAt: string;
};

function channelsFromMode(mode: NotifyMode): Array<"app_push" | "email"> {
  if (mode === "app_push") return ["app_push"];
  if (mode === "email") return ["email"];
  return ["app_push", "email"];
}

function defaultDueDate() {
  const d = new Date();
  d.setDate(d.getDate() + 7);
  return d.toISOString().slice(0, 10);
}

export default function AdminSupplementsPage() {
  const [reason, setReason] = useState(templates[0]!);
  const [applicationId, setApplicationId] = useState("");
  const [documentType, setDocumentType] = useState<string>(DOC_TYPES[0]!);
  const [detail, setDetail] = useState("");
  const [dueDate, setDueDate] = useState(defaultDueDate);
  const [required, setRequired] = useState("是");
  const [needOcr, setNeedOcr] = useState("是");
  const [notifyMode, setNotifyMode] =
    useState<NotifyMode>("app_push_email");
  const [toEmail, setToEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [flash, setFlash] = useState<string | null>(null);
  const [items, setItems] = useState<SupplementItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [resendHealth, setResendHealth] = useState<{
    configured?: boolean;
    keySource?: string;
    from?: string;
  } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [listRes, healthRes] = await Promise.all([
        fetch("/api/admin/supplements?status=open", { cache: "no-store" }),
        fetch("/api/admin/supplements?health=1", { cache: "no-store" }),
      ]);
      const listData = await listRes.json();
      const healthData = await healthRes.json();
      if (!listRes.ok) {
        throw new Error(listData.message || listData.error || "載入失敗");
      }
      setItems(listData.items ?? []);
      if (healthRes.ok) {
        setResendHealth(healthData.resend ?? null);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "載入失敗");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const openCount = useMemo(() => items.length, [items]);

  async function onSubmit() {
    setError(null);
    setFlash(null);
    if (!applicationId.trim()) {
      setError("請填寫申請編號");
      return;
    }
    if (!reason.trim() || !detail.trim() || !dueDate) {
      setError("請填寫補件原因、詳細說明及截止日期");
      return;
    }

    setSending(true);
    try {
      const res = await fetch("/api/admin/supplements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          applicationId: applicationId.trim(),
          documentType,
          reason: reason.trim(),
          detail: detail.trim(),
          dueDate,
          required: required === "是",
          needOcr: needOcr === "是",
          notifyChannels: channelsFromMode(notifyMode),
          toEmail: toEmail.trim() || null,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data.ok === false) {
        throw new Error(data.message || data.error || "發送失敗");
      }
      setFlash(data.message || "補件要求已發送");
      setDetail("");
      setToEmail("");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "發送失敗");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-navy-900">補件管理</h1>
          <p className="mt-1 text-sm text-text-secondary">
            建立補件要求 · 通知：App Push + 電郵（Resend）· 已移除 SMS
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => void load()}>
          重新整理
        </Button>
      </div>

      {resendHealth && (
        <StateBanner
          tone={resendHealth.configured ? "success" : "warning"}
          title={
            resendHealth.configured
              ? "Resend 電郵已接駁"
              : "Resend 未接駁"
          }
          description={[
            resendHealth.from ? `from=${resendHealth.from}` : null,
            resendHealth.keySource
              ? `keySource=${resendHealth.keySource}`
              : null,
            !resendHealth.configured
              ? "請設定 RESEND_API_KEY（Backend only）"
              : null,
          ]
            .filter(Boolean)
            .join(" · ")}
        />
      )}

      {error && (
        <StateBanner tone="error" title="錯誤" description={error} />
      )}
      {flash && (
        <StateBanner tone="success" title="完成" description={flash} />
      )}

      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <SectionHeader
            title="建立補件要求"
            subtitle="發送後會佇列 App Push，並經 Resend 寄電郵"
          />
          <div className="space-y-3">
            <Field label="申請編號" required>
              <Input
                value={applicationId}
                onChange={(e) => setApplicationId(e.target.value)}
                placeholder="例如 SLF-…"
              />
            </Field>
            <Field label="文件類型" required>
              <Select
                value={documentType}
                onChange={(e) => setDocumentType(e.target.value)}
              >
                {DOC_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="常用原因模板">
              <Select
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              >
                {templates.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="補件原因" required>
              <Input
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
            </Field>
            <Field label="詳細說明" required>
              <Textarea
                value={detail}
                onChange={(e) => setDetail(e.target.value)}
                placeholder="請說明需要補交的文件內容…"
              />
            </Field>
            <Field label="截止日期" required>
              <Input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </Field>
            <Field label="是否屬必要文件">
              <Select
                value={required}
                onChange={(e) => setRequired(e.target.value)}
              >
                <option>是</option>
                <option>否</option>
              </Select>
            </Field>
            <Field label="是否需要重新進行 OCR">
              <Select
                value={needOcr}
                onChange={(e) => setNeedOcr(e.target.value)}
              >
                <option>是</option>
                <option>否</option>
              </Select>
            </Field>
            <Field
              label="通知方式"
              hint="已移除 SMS；預設 App Push + 電郵"
            >
              <Select
                value={notifyMode}
                onChange={(e) =>
                  setNotifyMode(e.target.value as NotifyMode)
                }
              >
                <option value="app_push_email">App Push + 電郵</option>
                <option value="app_push">僅 App Push</option>
                <option value="email">僅電郵</option>
              </Select>
            </Field>
            {(notifyMode === "app_push_email" || notifyMode === "email") && (
              <Field
                label="收件電郵（選填）"
                hint="空白則使用申請／客戶登記電郵"
              >
                <Input
                  type="email"
                  value={toEmail}
                  onChange={(e) => setToEmail(e.target.value)}
                  placeholder="client@example.com"
                />
              </Field>
            )}
            <Button
              fullWidth
              disabled={sending}
              onClick={() => void onSubmit()}
            >
              {sending ? "發送中…" : "發送補件要求"}
            </Button>
          </div>
        </Card>

        <Card>
          <SectionHeader
            title="進行中補件"
            subtitle={loading ? "載入中…" : `${openCount} 宗`}
          />
          {loading ? (
            <p className="text-sm text-text-muted">載入中…</p>
          ) : items.length === 0 ? (
            <EmptyState
              title="暫無進行中補件"
              description="發送補件要求後會顯示於此。"
            />
          ) : (
            <ul className="space-y-3">
              {items.map((item) => (
                <li
                  key={item.id}
                  className="rounded-xl border border-border bg-surface-1 px-3 py-3"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="font-medium text-navy-900">
                        {item.applicationId} · {item.documentType}
                      </p>
                      <p className="mt-0.5 text-xs text-text-secondary">
                        {item.companyNameZh || item.applicantNameZh || "—"}
                        {item.toEmail ? ` · ${item.toEmail}` : ""}
                      </p>
                    </div>
                    <span className="text-[11px] text-text-muted">
                      截止 {item.dueDate}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-text-secondary">
                    {item.reason}
                  </p>
                  <p className="mt-1 text-xs text-text-muted">{item.detail}</p>
                  <p className="mt-2 text-[11px] text-text-muted">
                    通知：
                    {item.notifyChannels
                      .map((c) =>
                        c === "email" ? "電郵" : "App Push",
                      )
                      .join(" + ")}
                    {" · "}
                    電郵{" "}
                    {item.emailStatus === "sent"
                      ? "已寄出"
                      : item.emailStatus === "failed"
                        ? `失敗${item.emailError ? `（${item.emailError}）` : ""}`
                        : item.emailStatus === "skipped"
                          ? "略過"
                          : item.emailStatus}
                    {" · "}
                    Push{" "}
                    {item.pushStatus === "queued"
                      ? "已佇列"
                      : item.pushStatus === "skipped"
                        ? "略過"
                        : item.pushStatus}
                    {" · "}
                    {formatDateTime(item.createdAt)}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
