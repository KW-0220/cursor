"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { MobileShell } from "@/components/app/mobile-shell";
import { Button } from "@/components/ui/button";
import {
  Card,
  Disclaimer,
  PageHeader,
  ProgressBar,
  SectionHeader,
  StateBanner,
} from "@/components/ui/layout";
import {
  DOC_CARD_STATUS_LABEL,
  type RequiredDocCardStatus,
} from "@/lib/required-docs";
import { getDemoRequiredDocs } from "@/lib/bank-cashflow-mock";

function statusTone(s: RequiredDocCardStatus) {
  if (s === "completed") return "text-teal-700 bg-teal-100";
  if (s === "not_uploaded") return "text-text-muted bg-surface-2";
  if (s === "format_rejected" || s === "data_mismatch")
    return "text-danger-600 bg-danger-100";
  return "text-warning-600 bg-warning-100";
}

export default function DocumentsHubPage() {
  const [scenario, setScenario] = useState<"start" | "partial" | "ok">("partial");
  const progress = useMemo(() => getDemoRequiredDocs(scenario), [scenario]);

  return (
    <MobileShell>
      <PageHeader
        title="上載申請文件"
        subtitle="第1至第4項為必須文件"
        backHref="/apply"
      />
      <main className="space-y-4 px-4 py-5 pb-32">
        <p className="text-sm leading-relaxed text-text-secondary">
          請上載以下公司及身份文件。第1至第4項為必須文件，完成上載後系統才可開始分析申請。
        </p>

        <div className="flex flex-wrap gap-2">
          {(
            [
              ["start", "未開始"],
              ["partial", "進行中"],
              ["ok", "齊備"],
            ] as const
          ).map(([k, label]) => (
            <button
              key={k}
              onClick={() => setScenario(k)}
              className={`rounded-full px-3 py-1.5 text-xs font-medium ${
                scenario === k
                  ? "bg-navy-900 text-white"
                  : "bg-surface-2 text-text-secondary"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <Card>
          <p className="text-xs text-text-muted">必須文件完成度</p>
          <p className="mt-1 text-xl font-semibold text-navy-900">
            {progress.completed}／{progress.total}
          </p>
          <div className="mt-3">
            <ProgressBar value={(progress.completed / progress.total) * 100} />
          </div>
        </Card>

        <SectionHeader title="必須文件" />
        <div className="space-y-3">
          {progress.slots.map((slot, idx) => (
            <Link key={slot.id} href={slot.href}>
              <Card className="mb-3 transition hover:border-teal-500/40">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs text-text-muted">第 {idx + 1} 項</p>
                    <p className="mt-0.5 font-semibold text-navy-900">
                      {slot.title}
                    </p>
                    <p className="mt-1 text-xs leading-relaxed text-text-secondary">
                      {slot.requirement}
                    </p>
                    {slot.detail && (
                      <p className="mt-2 text-xs text-warning-600">{slot.detail}</p>
                    )}
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-medium ${statusTone(slot.status)}`}
                  >
                    {DOC_CARD_STATUS_LABEL[slot.status]}
                  </span>
                </div>
              </Card>
            </Link>
          ))}
        </div>

        <SectionHeader title="其他補充文件" />
        <Card>
          <p className="text-sm text-text-secondary">
            補充文件並非必須，但可以協助貸款顧問更全面了解公司的財務及營運情況。
          </p>
          <Link href="/apply/documents/supplements" className="mt-3 block">
            <Button fullWidth variant="outline">
              新增補充文件
            </Button>
          </Link>
        </Card>

        {progress.canStartAnalysis ? (
          <StateBanner
            tone="success"
            title="必須文件已齊"
            description="可進行交叉核對及銀行現金流分析（初步資格評估，非正式批核）。"
          />
        ) : (
          <StateBanner
            tone="warning"
            title="尚有必須文件未完成"
            description="完成第1至第4項後才可開始分析申請。"
          />
        )}

        <div className="flex flex-col gap-2">
          <Link href="/apply/documents/cross-check">
            <Button fullWidth disabled={!progress.canStartAnalysis}>
              開始資料交叉核對
            </Button>
          </Link>
          <Link href="/apply/cashflow">
            <Button fullWidth variant="outline" disabled={!progress.canStartAnalysis}>
              銀行現金流分析
            </Button>
          </Link>
        </div>

        <Disclaimer>
          第一階段為 AI 中小企貸款初步資格及現金流評估，不構成正式貸款批核。
        </Disclaimer>
      </main>
    </MobileShell>
  );
}
