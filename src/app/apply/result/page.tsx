"use client";

import Link from "next/link";
import { MobileShell } from "@/components/app/mobile-shell";
import { Button } from "@/components/ui/button";
import {
  Card,
  Disclaimer,
  PageHeader,
  StateBanner,
} from "@/components/ui/layout";
import { getDemoCashflowAnalysis } from "@/lib/bank-cashflow-mock";
import { DEFAULT_WHATSAPP_URL } from "@/lib/suitability";
import { formatHKD } from "@/lib/utils";

export default function ResultPage() {
  const analysis = getDemoCashflowAnalysis();
  const tone =
    analysis.clientFacing === "pass_review"
      ? "success"
      : analysis.clientFacing === "need_supplement"
        ? "warning"
        : "error";
  const title =
    analysis.clientFacing === "pass_review"
      ? "初步符合基本資料要求"
      : analysis.clientFacing === "need_supplement"
        ? "需要補充資料"
        : "需要人工覆核";

  return (
    <MobileShell>
      <PageHeader
        title="初步資格評估結果"
        subtitle="第一階段｜非正式批核"
        backHref="/apply/cashflow"
      />
      <main className="space-y-5 px-4 py-6 pb-32">
        <StateBanner
          tone={tone}
          title={title}
          description={analysis.clientMessage}
        />

        <Card className="space-y-3">
          <p className="text-sm font-semibold text-navy-900">
            已完成初步資格評估，申請將進入下一階段文件及信貸審批。
          </p>
          <p className="text-xs text-text-secondary">
            客戶端不顯示「貸款已批核／正式拒絕」。完整綠／黃／紅燈僅供內部控制台。
          </p>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-xs text-text-muted">六個月 ADB</p>
              <p className="font-semibold tabular">
                {analysis.sixMonthAdbHkd != null
                  ? formatHKD(Math.round(analysis.sixMonthAdbHkd))
                  : "—"}
              </p>
            </div>
            <div>
              <p className="text-xs text-text-muted">每月平均進帳</p>
              <p className="font-semibold tabular">
                {formatHKD(Math.round(analysis.monthlyAvgCreditsHkd))}
              </p>
            </div>
          </div>
        </Card>

        <div className="flex flex-col gap-2.5">
          <Link href="/apply/confirm">
            <Button fullWidth>提交申請（進入顧問覆核）</Button>
          </Link>
          <a href={DEFAULT_WHATSAPP_URL} target="_blank" rel="noreferrer">
            <Button fullWidth variant="outline">
              WhatsApp 聯絡
            </Button>
          </a>
          <Link href="/apply/documents">
            <Button fullWidth variant="ghost">
              返回文件清單
            </Button>
          </Link>
        </div>

        <Disclaimer>
          第一階段：公司／身份核對＋六個月銀行現金流。EBITDA、Gearing、DSCR
          等屬第二階段，需額外財務文件。AI 不直接決定批出貸款。
        </Disclaimer>
      </main>
    </MobileShell>
  );
}
