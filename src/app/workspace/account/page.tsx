"use client";

import Link from "next/link";
import { useBizdoc } from "@/lib/bizdoc/client-store";
import { resetClientApplication } from "@/lib/bizdoc/store";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";

export default function AccountPage() {
  const { app, update, hydrated } = useBizdoc();
  if (!hydrated || !app.id) return null;

  return (
    <main className="flex-1 px-4 py-6 md:px-8 md:py-8">
      <h1 className="font-[family-name:var(--font-biz-display)] text-3xl font-semibold text-[color:var(--biz-forest-900)]">
        帳戶設定
      </h1>
      <div className="mx-auto mt-8 max-w-lg space-y-4">
        <Field label="電郵">
          <Input
            value={app.applicant.email}
            onChange={(e) =>
              update((p) => ({
                ...p,
                applicant: { ...p.applicant, email: e.target.value },
              }))
            }
          />
        </Field>
        <Field label="電話">
          <Input
            value={app.applicant.phone}
            onChange={(e) =>
              update((p) => ({
                ...p,
                applicant: { ...p.applicant, phone: e.target.value },
              }))
            }
          />
        </Field>
        <Field label="WhatsApp 號碼">
          <Input
            value={app.applicant.whatsapp}
            onChange={(e) =>
              update((p) => ({
                ...p,
                applicant: { ...p.applicant, whatsapp: e.target.value },
              }))
            }
          />
        </Field>
        <p className="text-xs text-[color:var(--biz-muted)]">
          更改密碼請使用登入頁的重設流程（電郵驗證）。
        </p>
        <div className="flex flex-wrap gap-2 pt-4">
          <Link href="/auth/login">
            <Button variant="outline">登出／切換帳戶</Button>
          </Link>
          <Button
            variant="danger"
            onClick={() => {
              if (confirm("確定重設本機示範申請？")) {
                resetClientApplication();
                window.location.reload();
              }
            }}
          >
            重設示範申請
          </Button>
        </div>
      </div>
    </main>
  );
}
