"use client";

import { useRouter } from "next/navigation";
import { ApplyWizardShell } from "@/components/biz/apply-wizard-shell";
import { Button } from "@/components/ui/button";
import {
  DOC_CATEGORY_LABEL,
  DOC_CATEGORY_SHORT,
  COMPANY_AGE_LABEL,
  RELATED_COMPANY_LABEL,
  SHAREHOLDER_IDENTITY_LABEL,
  effectiveCategory,
} from "@/lib/bizdoc/classification";
import { useBizdoc } from "@/lib/bizdoc/client-store";
import { resolveSlotPlan } from "@/lib/bizdoc/documents";
import { DOC_GROUP_LABEL } from "@/lib/bizdoc/classification";

export default function ConfirmClassPage() {
  const router = useRouter();
  const { app, update, saveNow } = useBizdoc();
  if (!app.id) {
    return (
      <div className="flex flex-1 items-center justify-center p-8 text-sm text-[color:var(--biz-muted)]">
        載入申請資料……
      </div>
    );
  }
  const c = app.classification;
  const cat = effectiveCategory(c);
  const ready =
    c.shareholderIdentity && c.companyAge && c.hasRelatedCompany && cat;

  const plans = cat
    ? resolveSlotPlan({
        category: cat,
        identity: c.shareholderIdentity,
        overrides: app.slotOverrides,
      })
    : [];
  const required = plans.filter((p) => p.requirement === "required");
  const groups = [...new Set(required.map((p) => p.slot.group))];

  function confirm() {
    let ok = false;
    update((prev) => {
      const c0 = prev.classification ?? {
        shareholderIdentity: null,
        companyAge: null,
        hasRelatedCompany: null,
        systemCategory: null,
        clientConfirmed: false,
        overrideCategory: null,
      };
      const cat0 = effectiveCategory(c0);
      if (
        !c0.shareholderIdentity ||
        !c0.companyAge ||
        !c0.hasRelatedCompany ||
        !cat0
      ) {
        return prev;
      }
      ok = true;
      return {
        ...prev,
        classification: {
          ...c0,
          systemCategory: cat0,
          clientConfirmed: true,
          confirmedAt: new Date().toISOString(),
        },
      };
    });
    if (!ok) return;
    saveNow();
    router.push("/workspace/apply/applicant");
  }

  return (
    <ApplyWizardShell stepId="confirm-class">
      <div className="mx-auto max-w-3xl space-y-6">
        <div>
          <h2 className="text-2xl font-semibold text-[color:var(--biz-ink)]">
            確認文件類別
          </h2>
          <p className="mt-2 text-sm text-[color:var(--biz-muted)]">
            請確認以下分類結果。確認後系統會生成個人化文件 Checklist。
          </p>
        </div>

        {!ready ? (
          <div className="rounded-2xl border border-dashed border-[color:var(--biz-border)] bg-white px-6 py-10 text-center text-sm text-[color:var(--biz-muted)]">
            請先完成上一頁三個分類問題。
            <div className="mt-4">
              <Button
                variant="outline"
                onClick={() => router.push("/workspace/apply/classify")}
              >
                返回分類問卷
              </Button>
            </div>
          </div>
        ) : (
          <>
            <div className="rounded-2xl border border-[color:var(--biz-border)] bg-white p-6">
              <p className="text-xs text-[color:var(--biz-muted)]">你的申請類別</p>
              <h3 className="mt-2 font-[family-name:var(--font-biz-display)] text-2xl font-semibold text-[color:var(--biz-ink)]">
                {DOC_CATEGORY_SHORT[cat!]}
              </h3>
              <p className="mt-2 text-sm text-[color:var(--biz-muted)]">
                {DOC_CATEGORY_LABEL[cat!]}
              </p>
              <dl className="mt-6 grid gap-3 text-sm sm:grid-cols-3">
                <div>
                  <dt className="text-xs text-[color:var(--biz-muted)]">主要股東身份</dt>
                  <dd className="mt-1 font-medium">
                    {SHAREHOLDER_IDENTITY_LABEL[c.shareholderIdentity!]}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-[color:var(--biz-muted)]">公司年期</dt>
                  <dd className="mt-1 font-medium">
                    {COMPANY_AGE_LABEL[c.companyAge!]}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-[color:var(--biz-muted)]">關聯公司</dt>
                  <dd className="mt-1 font-medium">
                    {RELATED_COMPANY_LABEL[c.hasRelatedCompany!]}
                  </dd>
                </div>
              </dl>
            </div>

            <div className="rounded-2xl border border-[color:var(--biz-border)] bg-white p-6">
              <h4 className="font-semibold">將顯示的文件群組</h4>
              <ul className="mt-3 space-y-2 text-sm">
                {groups.map((g) => (
                  <li key={g} className="flex gap-2">
                    <span className="font-medium text-[color:var(--biz-forest-800)]">
                      群組 {g}
                    </span>
                    <span className="text-[color:var(--biz-muted)]">
                      {DOC_GROUP_LABEL[g]}
                    </span>
                  </li>
                ))}
              </ul>
              <p className="mt-4 text-xs text-[color:var(--biz-muted)]">
                必須項目約 {required.length} 項（三個月流水合併上載可計為完成）。文件已收齊 ≠
                開戶獲批。
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Button
                variant="outline"
                onClick={() => router.push("/workspace/apply/classify")}
              >
                返回修改
              </Button>
              <Button onClick={confirm}>確認分類並繼續</Button>
            </div>
          </>
        )}
      </div>
    </ApplyWizardShell>
  );
}
