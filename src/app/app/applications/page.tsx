"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, EmptyState, SectionHeader } from "@/components/ui/layout";
import { formatDateTime, formatHKD } from "@/lib/utils";

type StoredApp = {
  id: string;
  loanType: "secured" | "unsecured" | null;
  amount: number;
  purpose: string;
  status: string;
  updatedAt: string;
  docsPct?: number;
  bankCount?: number;
};

/** 真實用戶申請列表：只顯示本機已提交的申請，無 mock */
export default function ApplicationsPage() {
  const [apps, setApps] = useState<StoredApp[] | null>(null);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem("slf_applications");
      setApps(raw ? (JSON.parse(raw) as StoredApp[]) : []);
    } catch {
      setApps([]);
    }
  }, []);

  return (
    <main className="px-4 py-5">
      <SectionHeader title="申請" subtitle="建立新申請；你的申請會顯示於此" />

      {apps === null ? (
        <p className="text-sm text-text-muted">載入中…</p>
      ) : apps.length === 0 ? (
        <EmptyState
          title="尚未有申請"
          description="開始新申請後，進度會在這裡列出。"
          action={
            <Link href="/apply">
              <Button size="lg">＋ 新申請</Button>
            </Link>
          }
        />
      ) : (
        <div className="space-y-3">
          <Link href="/apply">
            <Button fullWidth>＋ 新申請</Button>
          </Link>
          {apps.map((app) => (
            <Card key={app.id}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs text-text-muted">{app.id}</p>
                  <p className="mt-1 font-semibold text-navy-900">
                    {app.loanType === "secured" ? "有抵押貸款" : "無抵押貸款"}
                  </p>
                  <p className="mt-1 text-sm text-text-secondary">
                    <span className="tabular">{formatHKD(app.amount)}</span>
                    {" · "}
                    {app.purpose}
                  </p>
                  <p className="mt-1 text-xs text-text-muted">
                    文件 {app.docsPct ?? 0}%
                    {typeof app.bankCount === "number"
                      ? ` · 月結單 ${app.bankCount}/6`
                      : ""}
                  </p>
                </div>
                <span className="rounded-full bg-teal-100 px-2.5 py-1 text-xs font-medium text-teal-800">
                  已提交
                </span>
              </div>
              <p className="mt-3 text-xs text-text-muted">
                更新於 {formatDateTime(app.updatedAt)}
              </p>
            </Card>
          ))}
        </div>
      )}
    </main>
  );
}
