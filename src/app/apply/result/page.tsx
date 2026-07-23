"use client";

import Link from "next/link";
import { Check } from "lucide-react";
import { MobileShell } from "@/components/app/mobile-shell";
import { Button } from "@/components/ui/button";
import {
  Card,
  Disclaimer,
  PageHeader,
} from "@/components/ui/layout";
import {
  DEFAULT_WHATSAPP_URL,
  getDemoSuitable,
} from "@/lib/suitability";

export default function ResultPage() {
  // Demo：公司 3 年 · 月營業額 50 萬 · 負債 20 萬 → Suitable
  const result = getDemoSuitable();
  const view = result.clientView;

  return (
    <MobileShell>
      <PageHeader
        title={view.title}
        subtitle="根據你提供資料 · 非正式批核"
        backHref="/apply/analyzing"
      />
      <main className="space-y-5 px-4 py-6 pb-32">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-navy-900">
            {view.title}
          </h2>
          <p className="mt-2 text-sm text-text-secondary">{view.intro}</p>
        </div>

        <Card className="space-y-4">
          {view.facts.map((f) => (
            <div
              key={f.label}
              className="flex items-baseline justify-between gap-4 border-b border-border/70 pb-3 last:border-0 last:pb-0"
            >
              <p className="text-sm text-text-secondary">{f.label}</p>
              <p className="text-right text-base font-semibold tabular text-navy-900">
                {f.value}
              </p>
            </div>
          ))}
        </Card>

        <section>
          <p className="text-sm font-medium text-navy-900">初步符合：</p>
          <ul className="mt-3 space-y-2.5">
            {view.highlights.map((h) => (
              <li key={h.label} className="flex items-center gap-2.5 text-sm">
                <span
                  className={`flex h-6 w-6 items-center justify-center rounded-full ${
                    h.ok
                      ? "bg-teal-100 text-teal-700"
                      : "bg-surface-2 text-text-muted"
                  }`}
                  aria-hidden
                >
                  {h.ok ? <Check className="h-3.5 w-3.5" strokeWidth={3} /> : "–"}
                </span>
                <span
                  className={
                    h.ok ? "text-navy-900" : "text-text-muted line-through"
                  }
                >
                  {h.label}
                </span>
              </li>
            ))}
          </ul>
        </section>

        <Card className="border-teal-500/20 bg-teal-100/40">
          <p className="text-xs font-medium uppercase tracking-wide text-teal-700">
            建議下一步
          </p>
          <p className="mt-1.5 text-base font-semibold text-navy-900">
            {view.nextStep}
          </p>
        </Card>

        <div className="flex flex-col gap-2.5">
          <Link href="/apply/confirm">
            <Button fullWidth>{view.submitLabel}</Button>
          </Link>
          <a href={DEFAULT_WHATSAPP_URL} target="_blank" rel="noreferrer">
            <Button fullWidth variant="outline">
              {view.whatsappLabel}
            </Button>
          </a>
        </div>

        <Disclaimer>{result.disclaimer}</Disclaimer>
      </main>
    </MobileShell>
  );
}
