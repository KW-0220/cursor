"use client";

import { useState } from "react";
import Link from "next/link";
import { MobileShell } from "@/components/app/mobile-shell";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import {
  Card,
  Disclaimer,
  PageHeader,
  SectionHeader,
  StateBanner,
} from "@/components/ui/layout";
import { DocStatusTag } from "@/components/ui/status";
import type { DocumentStatus } from "@/lib/types";

export default function CompanyDocsPage() {
  const [brStatus, setBrStatus] = useState<DocumentStatus>("pending");
  const [narStatus, setNarStatus] = useState<DocumentStatus>("pending");
  const [brExpiry, setBrExpiry] = useState("2027-03-12");
  const [shareholders, setShareholders] = useState([
    { name: "陳大文", role: "董事兼股東", pct: "60" },
    { name: "李美華", role: "股東", pct: "40" },
  ]);

  const brExpired = new Date(brExpiry) < new Date();
  const ready =
    brStatus === "completed" &&
    narStatus === "completed" &&
    !brExpired &&
    shareholders.every((s) => s.name && s.pct);

  return (
    <MobileShell>
      <PageHeader
        title="公司登記文件"
        subtitle="BR 有效期 + NAR1 董事／股東持股"
        backHref="/apply/kyc-docs"
      />
      <main className="space-y-4 px-4 py-5 pb-28">
        <StateBanner
          tone="info"
          title="商業登記證必須在有效期內"
          description="過期 BR 不可進入 Lead 轉介。NAR1／變更登記表需清楚顯示現時董事及股東持股比例。"
        />

        <Card>
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-medium text-navy-900">商業登記證（BR）</p>
              <p className="mt-1 text-xs text-text-muted">
                AI 提取公司名稱、BR 號碼、到期日後由你確認
              </p>
            </div>
            <DocStatusTag status={brStatus} />
          </div>
          <div className="mt-3 flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setBrStatus("completed")}
            >
              上載 BR
            </Button>
          </div>
          <div className="mt-3 space-y-3">
            <Field label="商業登記號碼">
              <Input defaultValue="12345678" />
            </Field>
            <Field label="有效期至" required>
              <Input
                type="date"
                value={brExpiry}
                onChange={(e) => setBrExpiry(e.target.value)}
              />
            </Field>
            {brExpired && (
              <p className="text-sm text-danger-600">
                BR 已過期，請更新後再繼續。
              </p>
            )}
          </div>
        </Card>

        <Card>
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-medium text-navy-900">
                周年申報表（NAR1）／公司變更登記表
              </p>
              <p className="mt-1 text-xs text-text-muted">
                清楚顯示現時董事及股東持股比例
              </p>
            </div>
            <DocStatusTag status={narStatus} />
          </div>
          <div className="mt-3 flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setNarStatus("completed")}
            >
              上載 NAR1／變更表
            </Button>
          </div>
          <SectionHeader title="董事／股東（可人工修正）" />
          <div className="space-y-3">
            {shareholders.map((row, i) => (
              <div key={i} className="grid grid-cols-3 gap-2">
                <Input
                  value={row.name}
                  onChange={(e) =>
                    setShareholders((list) =>
                      list.map((r, idx) =>
                        idx === i ? { ...r, name: e.target.value } : r,
                      ),
                    )
                  }
                  placeholder="姓名"
                />
                <Input
                  value={row.role}
                  onChange={(e) =>
                    setShareholders((list) =>
                      list.map((r, idx) =>
                        idx === i ? { ...r, role: e.target.value } : r,
                      ),
                    )
                  }
                  placeholder="角色"
                />
                <Input
                  className="tabular"
                  value={row.pct}
                  onChange={(e) =>
                    setShareholders((list) =>
                      list.map((r, idx) =>
                        idx === i ? { ...r, pct: e.target.value } : r,
                      ),
                    )
                  }
                  placeholder="持股 %"
                />
              </div>
            ))}
          </div>
        </Card>

        <Disclaimer>
          AI 提取結果需你確認。持股及董事資料最終仍由顧問核對原文。
        </Disclaimer>
      </main>
      <div className="fixed inset-x-0 bottom-0 mx-auto max-w-[430px] border-t border-border bg-surface-1 p-4">
        <Link href={ready ? "/apply/statements" : "#"}>
          <Button fullWidth size="lg" disabled={!ready}>
            儲存並繼續：月結單營業額
          </Button>
        </Link>
      </div>
    </MobileShell>
  );
}
