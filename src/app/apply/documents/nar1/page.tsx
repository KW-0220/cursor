"use client";

import Link from "next/link";
import { MobileShell } from "@/components/app/mobile-shell";
import { Button } from "@/components/ui/button";
import {
  Card,
  Disclaimer,
  PageHeader,
  SectionHeader,
} from "@/components/ui/layout";
import { Field, Input } from "@/components/ui/field";
import { DEMO_PARTIES } from "@/lib/bank-cashflow-mock";

export default function Nar1UploadPage() {
  return (
    <MobileShell>
      <PageHeader
        title="周年申報表 NAR1"
        subtitle="必須文件 2／4 · 須完整頁面"
        backHref="/apply/documents"
      />
      <main className="space-y-4 px-4 py-5 pb-28">
        <Card className="space-y-3">
          <Field label="上載最近期 NAR1（完整 PDF）">
            <Input type="file" accept=".pdf,application/pdf,image/*" />
          </Field>
          <p className="text-xs text-text-secondary">
            不接受只上載封面或部分董事／股東頁面。
          </p>
        </Card>

        <SectionHeader title="AI 提取（示範）" />
        <Card>
          <dl className="space-y-2 text-sm">
            {(
              [
                ["公司名稱", "智創科技有限公司"],
                ["公司註冊編號", "1234567"],
                ["註冊辦事處", "香港九龍觀塘成業街 7 號"],
                ["周年申報日期", "2025-09-18"],
                ["公司秘書", "誠信秘書服務有限公司"],
                ["已發行股本", "HK$10,000"],
              ] as const
            ).map(([k, v]) => (
              <div key={k} className="flex justify-between gap-3">
                <dt className="text-text-secondary">{k}</dt>
                <dd className="text-right font-medium text-navy-900">{v}</dd>
              </div>
            ))}
          </dl>
        </Card>

        <SectionHeader
          title="董事及股東名單"
          subtitle="系統將要求各人上載身份證明"
        />
        <div className="space-y-2">
          {DEMO_PARTIES.filter((p) => p.role !== "個人擔保人").map((p) => (
            <Card key={p.id} className="flex justify-between gap-3">
              <div>
                <p className="font-medium text-navy-900">{p.name}</p>
                <p className="text-xs text-text-secondary">
                  {p.role}
                  {p.sharePct != null ? ` · 持股 ${p.sharePct}%` : ""}
                </p>
              </div>
              <span className="text-xs text-text-muted">將核對身份文件</span>
            </Card>
          ))}
        </div>

        <div className="flex flex-col gap-2">
          <Link href="/apply/documents/bank-statements">
            <Button fullWidth>確認並上載銀行月結單</Button>
          </Link>
          <Link href="/apply/documents/identity">
            <Button fullWidth variant="outline">
              前往身份證明文件
            </Button>
          </Link>
        </div>
        <Disclaimer>
          NAR1 公司名稱須與 BR 一致；申請人須為董事、股東或獲授權代表。
        </Disclaimer>
      </main>
    </MobileShell>
  );
}
