"use client";

import Link from "next/link";
import { MobileShell } from "@/components/app/mobile-shell";
import { Button } from "@/components/ui/button";
import {
  Card,
  Disclaimer,
  PageHeader,
  SectionHeader,
  StateBanner,
} from "@/components/ui/layout";
import { Field, Input, Select } from "@/components/ui/field";
import { DEMO_PARTIES } from "@/lib/bank-cashflow-mock";
import { DOC_CARD_STATUS_LABEL } from "@/lib/required-docs";

export default function IdentityDocsPage() {
  const missing = DEMO_PARTIES.filter((p) => p.status === "not_uploaded");

  return (
    <MobileShell>
      <PageHeader
        title="身份證明文件"
        subtitle="必須文件 4／4 · 董事／股東／擔保人"
        backHref="/apply/documents"
      />
      <main className="space-y-4 px-4 py-5 pb-28">
        <StateBanner
          tone="info"
          title="必須提供人士"
          description="所有董事、股東及個人擔保人。政策未定前按全員處理；後台可設定例如持股 ≥25% 才需上載。"
        />

        <SectionHeader title="人士清單（由 NAR1 建立）" />
        <div className="space-y-3">
          {DEMO_PARTIES.map((p) => (
            <Card key={p.id} className="space-y-2">
              <div className="flex justify-between gap-2">
                <div>
                  <p className="font-semibold text-navy-900">{p.name}</p>
                  <p className="text-xs text-text-secondary">
                    {p.role}
                    {p.sharePct != null ? ` · 持股 ${p.sharePct}%` : ""}
                  </p>
                </div>
                <span className="text-[11px] text-text-muted">
                  {DOC_CARD_STATUS_LABEL[p.status]}
                </span>
              </div>
              <Field label="文件類型">
                <Select defaultValue={p.docType === "護照" ? "passport" : "hk_id"}>
                  <option value="hk_id">香港身份證</option>
                  <option value="passport">護照</option>
                </Select>
              </Field>
              <Field label="上載文件">
                <Input type="file" accept="image/*,.pdf" />
              </Field>
            </Card>
          ))}
        </div>

        {missing.length > 0 && (
          <StateBanner
            tone="warning"
            title="阻止提交"
            description={`尚有 ${missing.length} 人未上載身份證明（例如 ${missing[0].name}）。請補交後才可完成文件檢查。`}
          />
        )}

        <div className="flex flex-col gap-2">
          <Link href="/apply/documents/cross-check">
            <Button fullWidth disabled={missing.length > 0}>
              前往公司資料交叉核對
            </Button>
          </Link>
          <Link href="/apply/documents/supplements">
            <Button fullWidth variant="outline">
              新增補充文件（可選）
            </Button>
          </Link>
        </div>
        <Disclaimer>
          AI 只負責讀取及比對資料，不應單獨判斷身份證或護照真偽。正式 KYC
          須合資格服務或人工覆核。
        </Disclaimer>
      </main>
    </MobileShell>
  );
}
