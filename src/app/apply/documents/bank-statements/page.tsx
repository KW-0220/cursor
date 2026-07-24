"use client";

import { useMemo, useState } from "react";
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
import { formatHKD } from "@/lib/utils";

const MONTHS = [
  "2025-10",
  "2025-11",
  "2025-12",
  "2026-01",
  "2026-02",
  "2026-03",
];

export default function BankStatementsUploadPage() {
  const [uploads, setUploads] = useState<Record<string, string | null>>(() =>
    Object.fromEntries(MONTHS.map((m) => [m, `${m}_HSBC.pdf`])),
  );
  const [scenario, setScenario] = useState<"ok" | "missing">("ok");

  const filled = useMemo(
    () => MONTHS.filter((m) => uploads[m]).length,
    [uploads],
  );

  const continuousOk = scenario === "ok" && filled === 6;

  return (
    <MobileShell>
      <PageHeader
        title="最近六個月銀行月結單"
        subtitle="必須文件 3／4 · 只接受 PDF"
        backHref="/apply/documents"
      />
      <main className="space-y-4 px-4 py-5 pb-28">
        <StateBanner
          tone="info"
          title="文件要求"
          description="六個連續月份、同一主要銀行戶口、完整交易及結單頁面。不接受 JPG、PNG、截圖或 Excel。"
        />

        <div className="flex gap-2">
          <button
            onClick={() => {
              setScenario("ok");
              setUploads(Object.fromEntries(MONTHS.map((m) => [m, `${m}.pdf`])));
            }}
            className={`rounded-full px-3 py-1.5 text-xs ${scenario === "ok" ? "bg-navy-900 text-white" : "bg-surface-2"}`}
          >
            六個月齊備
          </button>
          <button
            onClick={() => {
              setScenario("missing");
              setUploads((u) => ({ ...u, "2026-02": null }));
            }}
            className={`rounded-full px-3 py-1.5 text-xs ${scenario === "missing" ? "bg-navy-900 text-white" : "bg-surface-2"}`}
          >
            缺一個月份
          </button>
        </div>

        <Card>
          <p className="text-sm font-medium text-navy-900">
            完整性：{filled}／6 個月
            {continuousOk ? " · 連續 ✓" : " · 需要補交"}
          </p>
        </Card>

        <SectionHeader title="按月上載 PDF" />
        <div className="space-y-3">
          {MONTHS.map((m) => (
            <Card key={m}>
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-medium text-navy-900">{m}</p>
                <span
                  className={`text-xs ${uploads[m] ? "text-teal-700" : "text-warning-600"}`}
                >
                  {uploads[m] ? "已上載 PDF" : "尚未上載"}
                </span>
              </div>
              <Field label="上載 PDF">
                <Input
                  type="file"
                  accept="application/pdf,.pdf"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (
                      f &&
                      f.type &&
                      !f.type.includes("pdf") &&
                      !f.name.toLowerCase().endsWith(".pdf")
                    ) {
                      alert("只接受 PDF 格式");
                      return;
                    }
                    setUploads((prev) => ({
                      ...prev,
                      [m]: f?.name ?? null,
                    }));
                  }}
                />
              </Field>
              {uploads[m] && (
                <p className="mt-1 text-xs text-text-muted">{uploads[m]}</p>
              )}
            </Card>
          ))}
        </div>

        {!continuousOk && (
          <StateBanner
            tone="warning"
            title="需要補交"
            description="系統發現缺少一個月份。請重新上載後再進行每日平均餘額計算。"
          />
        )}

        <Card className="bg-surface-2">
          <p className="text-xs text-text-muted">分析前置條件</p>
          <ul className="mt-2 space-y-1 text-xs text-text-secondary">
            <li>· 六個連續月份 PDF</li>
            <li>· 同一公司／同一主要戶口</li>
            <li>· 含期初及期末結餘、完整交易頁</li>
          </ul>
          <p className="mt-2 text-xs text-text-muted">
            示範戶口末四位 ···4821 · 餘額基準：日終帳面結餘（Ledger）
          </p>
          <p className="mt-1 text-xs text-text-secondary">
            參考進帳量級約 {formatHKD(640000)}／月（分析頁詳見）
          </p>
        </Card>

        <div className="flex flex-col gap-2">
          <Link href="/apply/documents/identity">
            <Button fullWidth disabled={!continuousOk}>
              繼續上載身份證明
            </Button>
          </Link>
          <Link href="/apply/cashflow">
            <Button fullWidth variant="outline" disabled={!continuousOk}>
              預覽現金流分析
            </Button>
          </Link>
        </div>
        <Disclaimer>
          未符合前置條件時顯示黃燈並停止正式計算，不會估算每日平均餘額。
        </Disclaimer>
      </main>
    </MobileShell>
  );
}
