"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { Card, SectionHeader, StateBanner } from "@/components/ui/layout";
import { financialYears } from "@/lib/mock-data";
import { formatHKD } from "@/lib/utils";

export default function DocumentViewerPage() {
  const [selected, setSelected] = useState(0);
  const field = financialYears[selected];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <Link
            href="/admin/cases/SLF-2026-00482"
            className="text-sm text-teal-600 hover:underline"
          >
            ← 返回財務簡報
          </Link>
          <h1 className="mt-1 text-2xl font-bold text-navy-900">文件檢視器</h1>
          <p className="text-sm text-text-secondary">
            D05｜左原文／右 OCR · 點擊數字跳頁
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            放大
          </Button>
          <Button variant="outline" size="sm">
            旋轉
          </Button>
          <Button variant="outline" size="sm">
            下載
          </Button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="min-h-[560px] bg-[linear-gradient(180deg,#eef2f6,#f8fafc)]">
          <div className="mb-3 flex items-center justify-between text-xs text-text-muted">
            <span>原始 PDF／圖片 · 第 {field.sourcePage} 頁</span>
            <span>敏感資料遮罩啟用</span>
          </div>
          <div className="flex h-[480px] flex-col rounded-xl border border-border bg-surface-1 p-6 shadow-inner">
            <p className="text-center text-xs text-text-muted">
              AUDITED FINANCIAL STATEMENTS
            </p>
            <p className="mt-2 text-center text-sm font-semibold text-navy-900">
              {field.year}
            </p>
            <div className="mt-8 space-y-3 text-sm">
              <div className="flex justify-between border-b border-dashed border-border pb-2">
                <span>Revenue / 營業額</span>
                <span className="rounded bg-teal-100 px-2 tabular text-teal-600">
                  {formatHKD(field.revenue)}
                </span>
              </div>
              <div className="flex justify-between border-b border-dashed border-border pb-2">
                <span>Gross Profit / 毛利</span>
                <span className="tabular">{formatHKD(field.grossProfit)}</span>
              </div>
              <div className="flex justify-between border-b border-dashed border-border pb-2">
                <span>Net Profit / 淨利潤</span>
                <span className="tabular">{formatHKD(field.netProfit)}</span>
              </div>
              <div className="flex justify-between">
                <span>Equity / 股東權益</span>
                <span className="tabular">{formatHKD(field.equity)}</span>
              </div>
            </div>
            <p className="mt-auto text-center text-[11px] text-text-muted">
              示範預覽 · 實際會嵌入 PDF.js / 影像檢視器
            </p>
          </div>
          <div className="mt-3 flex gap-2">
            {financialYears.map((y, i) => (
              <button
                key={y.year}
                onClick={() => setSelected(i)}
                className={`rounded-lg px-3 py-1.5 text-xs ${
                  selected === i
                    ? "bg-navy-900 text-white"
                    : "bg-surface-2 text-text-secondary"
                }`}
              >
                {y.year}
              </button>
            ))}
          </div>
        </Card>

        <Card>
          <SectionHeader title="OCR 提取欄位" />
          <StateBanner
            tone="info"
            title={`AI 信心度 ${(field.confidence * 100).toFixed(0)}%`}
            description="低信心結果不可當作確定資料，請人工覆核。"
          />
          <div className="mt-4 space-y-3">
            <Field label="營業額">
              <Input
                className="tabular"
                defaultValue={field.revenue}
                onFocus={() => setSelected(selected)}
              />
            </Field>
            <Field label="毛利">
              <Input className="tabular" defaultValue={field.grossProfit} />
            </Field>
            <Field label="淨利潤">
              <Input className="tabular" defaultValue={field.netProfit} />
            </Field>
            <Field label="股東權益">
              <Input className="tabular" defaultValue={field.equity} />
            </Field>
          </div>
          <div className="mt-4 space-y-2 rounded-xl bg-warning-100 p-3 text-sm text-warning-600">
            <p className="font-semibold">文件問題</p>
            <p>2026 年 3 月銀行結單缺少第 4–6 頁</p>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button>標示為已確認</Button>
            <Button variant="outline">人工修正</Button>
            <Button variant="secondary">要求客戶補件</Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
