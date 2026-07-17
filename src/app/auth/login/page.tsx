"use client";

import Link from "next/link";
import { useState } from "react";
import { MobileShell } from "@/components/app/mobile-shell";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { PageHeader, Disclaimer } from "@/components/ui/layout";

export default function LoginPage() {
  const [mode, setMode] = useState<"phone" | "email">("phone");

  return (
    <MobileShell>
      <PageHeader title="登入／註冊" subtitle="SME LoanFlow" backHref="/" />
      <main className="flex flex-1 flex-col gap-5 px-4 py-5">
        <div className="grid grid-cols-2 rounded-xl bg-surface-2 p-1">
          <button
            className={`rounded-lg py-2 text-sm font-medium ${mode === "phone" ? "bg-surface-1 text-navy-900 shadow-sm" : "text-text-secondary"}`}
            onClick={() => setMode("phone")}
          >
            手機驗證碼
          </button>
          <button
            className={`rounded-lg py-2 text-sm font-medium ${mode === "email" ? "bg-surface-1 text-navy-900 shadow-sm" : "text-text-secondary"}`}
            onClick={() => setMode("email")}
          >
            電郵密碼
          </button>
        </div>

        {mode === "phone" ? (
          <div className="space-y-4">
            <Field label="手機號碼" required hint="將發送一次性驗證碼">
              <Input placeholder="+852 9123 4567" inputMode="tel" />
            </Field>
            <Field label="驗證碼" required>
              <Input placeholder="6 位數字" inputMode="numeric" />
            </Field>
          </div>
        ) : (
          <div className="space-y-4">
            <Field label="電郵" required>
              <Input type="email" placeholder="you@company.com" />
            </Field>
            <Field label="密碼" required>
              <Input type="password" placeholder="••••••••" />
            </Field>
          </div>
        )}

        <Disclaimer>
          登入即表示你已閱讀並同意
          <a className="mx-1 text-teal-600 underline" href="#">
            私隱政策
          </a>
          、
          <a className="mx-1 text-teal-600 underline" href="#">
            使用條款
          </a>
          及資料處理／第三方分享說明。
        </Disclaimer>

        <Link href="/register/identity">
          <Button fullWidth size="lg">
            繼續
          </Button>
        </Link>
        <Button fullWidth variant="outline">
          啟用 Face ID／Touch ID（首次登入後）
        </Button>
      </main>
    </MobileShell>
  );
}
