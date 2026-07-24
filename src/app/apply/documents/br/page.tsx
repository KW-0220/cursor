"use client";

import { useState } from "react";
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
import { Field, Input } from "@/components/ui/field";

type BrStatus =
  | "已完成"
  | "即將到期"
  | "已過期"
  | "資料不一致"
  | "文件不清晰"
  | "尚未上載";

export default function BrUploadPage() {
  const [fileName, setFileName] = useState<string | null>("BR_智創科技_2026.pdf");
  const [status, setStatus] = useState<BrStatus>("已完成");
  const [extracted] = useState({
    nameZh: "智創科技有限公司",
    nameEn: "SmartCreate Technology Limited",
    brNumber: "12345678-000-01-26-A",
    address: "香港九龍觀塘成業街 7 號",
    nature: "資訊科技服務",
    effective: "2025-04-01",
    expiry: "2026-03-31",
  });

  return (
    <MobileShell>
      <PageHeader title="商業登記證 BR" subtitle="必須文件 1／4" backHref="/apply/documents" />
      <main className="space-y-4 px-4 py-5 pb-28">
        <Card className="space-y-3">
          <Field label="上載 BR（清晰 PDF／影像）">
            <Input
              type="file"
              accept=".pdf,image/*"
              onChange={(e) => {
                const f = e.target.files?.[0];
                setFileName(f?.name ?? null);
                setStatus(f ? "已完成" : "尚未上載");
              }}
            />
          </Field>
          {fileName && (
            <p className="text-xs text-text-muted">已選：{fileName}</p>
          )}
          <div className="flex flex-wrap gap-2">
            {(
              ["已完成", "即將到期", "已過期", "資料不一致", "文件不清晰"] as const
            ).map((s) => (
              <button
                key={s}
                onClick={() => setStatus(s)}
                className={`rounded-full px-2.5 py-1 text-[11px] ${
                  status === s ? "bg-navy-900 text-white" : "bg-surface-2"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </Card>

        <StateBanner
          tone={
            status === "已完成"
              ? "success"
              : status === "已過期" || status === "資料不一致"
                ? "error"
                : "warning"
          }
          title={`狀態：${status}`}
          description="系統檢查：有效期、公司名稱／BR 號碼與申請資料、文件清晰度。"
        />

        <SectionHeader title="AI 提取" subtitle="請確認後才繼續" />
        <Card>
          <dl className="space-y-2 text-sm">
            {(
              [
                ["公司中文名稱", extracted.nameZh],
                ["公司英文名稱", extracted.nameEn],
                ["商業登記號碼", extracted.brNumber],
                ["業務地址", extracted.address],
                ["業務性質", extracted.nature],
                ["生效日期", extracted.effective],
                ["屆滿日期", extracted.expiry],
              ] as const
            ).map(([k, v]) => (
              <div key={k} className="flex justify-between gap-3">
                <dt className="text-text-secondary">{k}</dt>
                <dd className="text-right font-medium text-navy-900">{v}</dd>
              </div>
            ))}
          </dl>
        </Card>

        <div className="flex flex-col gap-2">
          <Link href="/apply/documents/nar1">
            <Button fullWidth>確認並繼續 NAR1</Button>
          </Link>
          <Link href="/apply/documents">
            <Button fullWidth variant="outline">
              返回文件清單
            </Button>
          </Link>
        </div>
        <Disclaimer>
          AI 只讀取及比對資料；BR 真偽及正式核實由顧問／合資格服務處理。
        </Disclaimer>
      </main>
    </MobileShell>
  );
}
