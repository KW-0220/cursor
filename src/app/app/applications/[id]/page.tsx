"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  EmptyState,
  PageHeader,
  SectionHeader,
} from "@/components/ui/layout";
import {
  clientAppStatusLabel,
  clientAppStatusTone,
  normalizeClientAppStatus,
} from "@/lib/application-status";
import {
  getStoredApplication,
  type StoredApplication,
} from "@/lib/applications-client";
import { cn, formatDateTime, formatHKD } from "@/lib/utils";

export default function ApplicationDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const [app, setApp] = useState<StoredApplication | null | undefined>(
    undefined,
  );

  useEffect(() => {
    if (!id) {
      setApp(null);
      return;
    }
    const local = getStoredApplication(id);
    setApp(local);

    void fetch(`/api/applications?id=${encodeURIComponent(id)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        const remote = data?.application as
          | {
              id: string;
              loanType: "secured" | "unsecured" | null;
              amount: number;
              purpose: string;
              status: string;
              failureReason?: string | null;
              docsPct?: number;
              bankCount?: number;
              updatedAt: string;
              createdAt?: string;
            }
          | undefined;
        if (!remote) return;
        const merged = {
          ...(local ?? {
            id: remote.id,
            loanType: remote.loanType,
            amount: remote.amount,
            purpose: remote.purpose,
            docsPct: remote.docsPct,
            bankCount: remote.bankCount,
            createdAt: remote.createdAt,
          }),
          status: normalizeClientAppStatus(remote.status),
          failureReason: remote.failureReason ?? null,
          updatedAt: remote.updatedAt,
          amount: remote.amount,
          purpose: remote.purpose,
          loanType: remote.loanType,
        };
        setApp(merged);
      })
      .catch(() => null);
  }, [id]);

  if (app === undefined) {
    return (
      <div>
        <PageHeader
          title="申請詳情及進度"
          subtitle={id || "—"}
          backHref="/app/applications"
        />
        <main className="px-4 py-5 text-sm text-text-muted">載入中…</main>
      </div>
    );
  }

  if (!app) {
    return (
      <div>
        <PageHeader
          title="申請詳情及進度"
          subtitle={id || "—"}
          backHref="/app/applications"
        />
        <main className="space-y-4 px-4 py-5">
          <Card>
            <EmptyState
              title="找不到此申請"
              description="可能已清除瀏覽器資料，或申請編號不正確。"
              action={
                <Link href="/app/applications">
                  <Button>返回申請列表</Button>
                </Link>
              }
            />
          </Card>
        </main>
      </div>
    );
  }

  const status = normalizeClientAppStatus(app.status);

  return (
    <div>
      <PageHeader
        title="申請詳情及進度"
        subtitle={app.id}
        backHref="/app/applications"
      />
      <main className="space-y-4 px-4 py-5">
        <Card>
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-semibold text-navy-900">
                {app.loanType === "secured" ? "有抵押貸款" : "無抵押貸款"}
              </p>
              <p className="mt-1 text-sm text-text-secondary">
                <span className="tabular">{formatHKD(app.amount)}</span>
                {" · "}
                {app.purpose}
              </p>
            </div>
            <span
              className={cn(
                "shrink-0 rounded-full px-2.5 py-1 text-xs font-medium",
                clientAppStatusTone(status),
              )}
            >
              {clientAppStatusLabel(status)}
            </span>
          </div>

          <dl className="mt-4 grid gap-2 text-sm text-text-secondary">
            <div className="flex justify-between gap-3">
              <dt className="text-text-muted">申請狀態</dt>
              <dd className="font-medium text-navy-900">
                {clientAppStatusLabel(status)}
              </dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-text-muted">文件完整度</dt>
              <dd className="tabular">{app.docsPct ?? 0}%</dd>
            </div>
            {typeof app.bankCount === "number" && (
              <div className="flex justify-between gap-3">
                <dt className="text-text-muted">銀行月結單</dt>
                <dd>
                  {app.bankCount}/6
                </dd>
              </div>
            )}
            <div className="flex justify-between gap-3">
              <dt className="text-text-muted">最後更新</dt>
              <dd>{formatDateTime(app.updatedAt)}</dd>
            </div>
          </dl>
        </Card>

        {status === "under_review" && (
          <Card className="text-sm text-text-secondary">
            申請正在審批中。結果稍後會更新為「成功批核」或「申請失敗」。
          </Card>
        )}

        {status === "approved" && (
          <Card className="border-success-600/20 bg-success-100/50 text-sm text-success-600">
            已成功批核。實際額度、利率及放款安排以貸款機構正式通知為準。
          </Card>
        )}

        {status === "rejected" && (
          <Card className="border-danger-600/20 bg-danger-100/60">
            <SectionHeader title="申請失敗" subtitle="失敗原因" />
            <p className="text-sm leading-relaxed text-danger-600">
              {app.failureReason?.trim() || "未有提供失敗原因"}
            </p>
          </Card>
        )}

        <Link href="/app/applications">
          <Button fullWidth variant="outline">
            返回申請列表
          </Button>
        </Link>
      </main>
    </div>
  );
}
