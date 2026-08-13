"use client";

import Link from "next/link";
import { MobileShell } from "@/components/app/mobile-shell";
import { MortgageLoanRepaymentCalculator } from "@/components/app/mortgage-calculator";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/layout";

/** 獨立按揭計算工具（模式 A） */
export default function MortgageCalculatorPage() {
  return (
    <MobileShell>
      <PageHeader
        title="按揭計算"
        subtitle="Mortgage Loan Repayment Calculator · 初步參考"
        backHref="/app"
      />
      <main className="space-y-4 px-4 py-5 pb-28">
        <MortgageLoanRepaymentCalculator />
        <Link href="/apply" className="block">
          <Button fullWidth>由此開始按揭／貸款申請</Button>
        </Link>
      </main>
    </MobileShell>
  );
}
