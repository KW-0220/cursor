"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { MobileShell } from "@/components/app/mobile-shell";
import { PageHeader, StateBanner } from "@/components/ui/layout";

const steps = [
  "檢查文件完整性",
  "識別審計報告數據",
  "計算 EBITDA及財務比率",
  "核對現有債務支出",
  "檢查貸款政策條件",
  "建立初步審批摘要",
];

export default function AnalyzingPage() {
  const router = useRouter();
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    if (idx >= steps.length) {
      const t = setTimeout(() => router.push("/apply/result"), 600);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => setIdx((v) => v + 1), 700);
    return () => clearTimeout(t);
  }, [idx, router]);

  return (
    <MobileShell>
      <PageHeader title="正在分析你的貸款申請" subtitle="P17A｜AI 審批分析中" />
      <main className="space-y-4 px-4 py-8">
        <StateBanner
          tone="info"
          title="系統正在分析你的財務文件"
          description="部分申請可能需要貸款顧問進一步覆核或要求補充資料。"
        />
        <ol className="space-y-3">
          {steps.map((step, i) => {
            const done = i < idx;
            const active = i === idx;
            return (
              <li
                key={step}
                className={`rounded-2xl border px-4 py-3 text-sm ${
                  done
                    ? "border-success-600/20 bg-success-100 text-success-600"
                    : active
                      ? "border-teal-500/30 bg-teal-100 text-teal-600 animate-pulse-soft"
                      : "border-border bg-surface-1 text-text-muted"
                }`}
              >
                {done ? "✓ " : active ? "… " : `${i + 1}. `}
                {step}
              </li>
            );
          })}
        </ol>
        <p className="text-center text-xs text-text-muted">
          不會顯示「AI 正在決定是否批出貸款」等過度確定文案。
        </p>
      </main>
    </MobileShell>
  );
}
