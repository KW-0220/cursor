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
import {
  evaluateSuitability,
  type SuitabilityStatus,
} from "@/lib/suitability";
import { formatHKD } from "@/lib/utils";

const SCENARIOS = {
  suitable: {
    label: "Suitable",
    companyAge: 3,
    monthlyRevenue: 180_000,
    debtRatio: 35,
  },
  not: {
    label: "未達標",
    companyAge: 1,
    monthlyRevenue: 80_000,
    debtRatio: 62,
  },
  incomplete: {
    label: "缺資料",
    companyAge: 4,
    monthlyRevenue: null as number | null,
    debtRatio: 40,
  },
} as const;

function statusTone(status: SuitabilityStatus) {
  if (status === "Suitable") return "success" as const;
  if (status === "Incomplete") return "warning" as const;
  return "info" as const;
}

function statusTitle(status: SuitabilityStatus) {
  if (status === "Suitable") return "Suitable｜初步適合";
  if (status === "Incomplete") return "Incomplete｜資料未齊";
  return "NotSuitable｜暫未達初步門檻";
}

export default function ResultPage() {
  const [scenario, setScenario] =
    useState<keyof typeof SCENARIOS>("suitable");
  const input = SCENARIOS[scenario];
  const result = useMemo(
    () =>
      evaluateSuitability({
        companyAge: input.companyAge,
        monthlyRevenue: input.monthlyRevenue,
        debtRatio: input.debtRatio,
      }),
    [input],
  );

  return (
    <MobileShell>
      <PageHeader title="初步評估結果" subtitle="適合度規則｜非正式批核" backHref="/app" />
      <main className="space-y-4 px-4 py-5 pb-28">
        <div className="flex flex-wrap gap-2">
          {(Object.keys(SCENARIOS) as (keyof typeof SCENARIOS)[]).map((key) => (
            <button
              key={key}
              onClick={() => setScenario(key)}
              className={`rounded-full px-3 py-1.5 text-xs font-medium ${
                scenario === key
                  ? "bg-navy-900 text-white"
                  : "bg-surface-2 text-text-secondary"
              }`}
            >
              {SCENARIOS[key].label}
            </button>
          ))}
        </div>

        <StateBanner
          tone={statusTone(result.status)}
          title={statusTitle(result.status)}
          description={result.clientMessage}
        />

        <Card>
          <p className="font-mono text-sm text-navy-900">
            {`if (companyAge >= 2 && monthlyRevenue >= 100000 && debtRatio < 50) status = "Suitable"`}
          </p>
          <p className="mt-2 text-xs text-text-muted">
            status = <span className="font-semibold text-teal-600">{result.status}</span>
          </p>
        </Card>

        <SectionHeader title="條件核對" />
        <div className="space-y-2">
          {result.checks.map((c) => (
            <Card key={c.id} className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-navy-900">{c.label}</p>
                <p className="text-xs text-text-secondary">要求：{c.requirement}</p>
                <p className="mt-1 text-sm tabular text-text-primary">
                  實際：
                  {c.id === "monthlyRevenue" && result.input.monthlyRevenue != null
                    ? formatHKD(Math.round(result.input.monthlyRevenue))
                    : c.actual}
                </p>
              </div>
              <span
                className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${
                  c.pass === true
                    ? "bg-teal-100 text-teal-700"
                    : c.pass === false
                      ? "bg-amber-100 text-amber-800"
                      : "bg-surface-2 text-text-muted"
                }`}
              >
                {c.pass === true ? "PASS" : c.pass === false ? "FAIL" : "—"}
              </span>
            </Card>
          ))}
        </div>

        <div className="flex flex-col gap-2">
          <Link href="/apply/prescreen">
            <Button fullWidth variant="outline">
              返回預審條件
            </Button>
          </Link>
          <Link href="/app/account">
            <Button fullWidth>聯絡貸款顧問</Button>
          </Link>
        </div>

        <Disclaimer>{result.disclaimer}</Disclaimer>
      </main>
    </MobileShell>
  );
}
