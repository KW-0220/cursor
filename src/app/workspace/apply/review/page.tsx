"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ApplyWizardShell } from "@/components/biz/apply-wizard-shell";
import { Button } from "@/components/ui/button";
import { buildChecklist } from "@/lib/bizdoc/completeness";
import { useBizdoc } from "@/lib/bizdoc/client-store";
import type { BizConsent } from "@/lib/bizdoc/types";
import { CheckCircle2, Circle } from "lucide-react";

const CONSENT_ITEMS: { key: keyof BizConsent; label: string }[] = [
  { key: "privacy", label: "我已閱讀並同意私隱政策" },
  { key: "terms", label: "我已閱讀並同意使用條款" },
  { key: "dataUse", label: "我同意平台處理及保存本申請資料與文件" },
  { key: "whatsapp", label: "我同意透過 WhatsApp 接收申請進度通知" },
  { key: "electronic", label: "我同意以電子方式接收通訊" },
  { key: "thirdParty", label: "我同意在有需要時將資料轉交予指定合作機構" },
  {
    key: "bankTransfer",
    label: "我同意將資料轉交予銀行或合作機構以處理商業戶口相關事宜",
  },
  {
    key: "truthfulness",
    label:
      "我確認所提交資料真實完整；並明白提交資料／文件收齊不代表商業戶口必定獲批，最終決定由銀行或相關機構作出",
  },
];

export default function ReviewStepPage() {
  const router = useRouter();
  const { app, update, submit, hydrated, saveNow } = useBizdoc();
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  if (!hydrated || !app.id) return null;
  const checklist = buildChecklist(app);
  const allDone = checklist.every((c) => c.done);

  return (
    <ApplyWizardShell stepId="review">
      <div className="mx-auto max-w-3xl space-y-8">
        <div>
          <h1 className="font-[family-name:var(--font-biz-display)] text-2xl font-semibold text-[color:var(--biz-forest-900)]">
            檢查及提交
          </h1>
          <p className="mt-1 text-sm text-[color:var(--biz-muted)]">
            請確認所有項目完成後正式提交。提交後將鎖定版本並發送 WhatsApp 通知。
          </p>
        </div>

        {done ? (
          <div className="rounded-2xl border border-success-600/20 bg-success-100 px-5 py-8 text-center">
            <CheckCircle2 className="mx-auto size-10 text-success-600" />
            <h2 className="mt-3 text-lg font-semibold text-success-600">
              申請已成功提交
            </h2>
            <p className="mt-2 text-sm text-[color:var(--biz-muted)]">
              狀態已更新為「已提交，處理中」。請留意 WhatsApp 通知。
            </p>
            <div className="mt-6 flex justify-center gap-2">
              <Link href="/workspace/progress">
                <Button>查看進度</Button>
              </Link>
              <Link href="/workspace">
                <Button variant="outline">返回概覽</Button>
              </Link>
            </div>
          </div>
        ) : (
          <>
            <section className="rounded-2xl border border-[color:var(--biz-border)] bg-[color:var(--biz-surface)] p-5">
              <h2 className="text-sm font-semibold">提交前檢查清單</h2>
              <ul className="mt-3 space-y-2">
                {checklist.map((item) => (
                  <li
                    key={item.id}
                    className="flex items-center justify-between gap-3 text-sm"
                  >
                    <span className="inline-flex items-center gap-2">
                      {item.done ? (
                        <CheckCircle2 className="size-4 text-success-600" />
                      ) : (
                        <Circle className="size-4 text-[color:var(--biz-muted)]" />
                      )}
                      {item.label}
                    </span>
                    {!item.done && item.href && (
                      <Link
                        href={item.href}
                        className="text-[color:var(--biz-forest-700)] hover:underline"
                      >
                        返回填寫
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </section>

            <section className="space-y-3 rounded-2xl border border-[color:var(--biz-border)] bg-[color:var(--biz-surface)] p-5">
              <h2 className="text-sm font-semibold">聲明及同意</h2>
              <p className="text-xs text-[color:var(--biz-muted)]">
                以下項目不可預先勾選，請逐項確認。
              </p>
              {CONSENT_ITEMS.map((c) => (
                <label
                  key={c.key}
                  className="flex items-start gap-3 text-sm leading-relaxed"
                >
                  <input
                    type="checkbox"
                    className="mt-1"
                    checked={app.consents[c.key]}
                    onChange={(e) =>
                      update((p) => ({
                        ...p,
                        consents: {
                          ...p.consents,
                          [c.key]: e.target.checked,
                        },
                      }))
                    }
                  />
                  <span>{c.label}</span>
                </label>
              ))}
            </section>

            {error && (
              <p className="text-sm text-danger-600" role="alert">
                {error}
              </p>
            )}

            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                disabled={!allDone}
                onClick={() => {
                  saveNow();
                  const result = submit();
                  if (!result.ok) {
                    setError(result.error);
                    return;
                  }
                  setDone(true);
                  router.refresh();
                }}
              >
                正式提交
              </Button>
              {!allDone && (
                <p className="self-center text-xs text-[color:var(--biz-gold-800)]">
                  尚有未完成項目，系統不允許提交
                </p>
              )}
            </div>
          </>
        )}
      </div>
    </ApplyWizardShell>
  );
}
