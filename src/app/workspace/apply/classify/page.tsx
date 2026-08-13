"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ApplyWizardShell } from "@/components/biz/apply-wizard-shell";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import {
  COMPANY_AGE_LABEL,
  DOC_CATEGORY_LABEL,
  DOC_CATEGORY_SHORT,
  RELATED_COMPANY_LABEL,
  SHAREHOLDER_IDENTITY_LABEL,
  emptyClassification,
  inferCompanyAgeBand,
  resolveDocCategory,
  type BizClassification,
  type CompanyAgeBand,
  type RelatedCompanyFlag,
  type ShareholderIdentity,
} from "@/lib/bizdoc/classification";
import { useBizdoc } from "@/lib/bizdoc/client-store";
import { cn } from "@/lib/utils";

function ChoiceCard({
  selected,
  title,
  onClick,
}: {
  selected: boolean;
  title: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-2xl border px-4 py-4 text-left text-sm transition",
        selected
          ? "border-[color:var(--biz-forest-700)] bg-[color:var(--biz-forest-100)] text-[color:var(--biz-forest-900)]"
          : "border-[color:var(--biz-border)] bg-white text-[color:var(--biz-ink)] hover:border-[color:var(--biz-forest-600)]",
      )}
    >
      {title}
    </button>
  );
}

function patchClassification(
  prev: BizClassification | undefined,
  patch: Partial<BizClassification>,
): BizClassification {
  const next: BizClassification = {
    ...emptyClassification(),
    ...prev,
    ...patch,
    clientConfirmed: false,
    confirmedAt: undefined,
  };
  if (next.shareholderIdentity && next.companyAge && next.hasRelatedCompany) {
    next.systemCategory = resolveDocCategory(
      next.shareholderIdentity,
      next.companyAge,
      next.hasRelatedCompany,
    );
  } else {
    next.systemCategory = null;
  }
  return next;
}

export default function ClassifyPage() {
  const router = useRouter();
  const { app, update, saveNow } = useBizdoc();
  const [error, setError] = useState<string | null>(null);

  const c = app.classification ?? emptyClassification();

  const answersReady = Boolean(
    c.shareholderIdentity && c.companyAge && c.hasRelatedCompany && c.systemCategory,
  );

  const previewLabel = useMemo(() => {
    if (!c.systemCategory) return null;
    return DOC_CATEGORY_SHORT[c.systemCategory];
  }, [c.systemCategory]);

  function setIdentity(v: ShareholderIdentity) {
    setError(null);
    update((prev) => ({
      ...prev,
      classification: patchClassification(prev.classification, {
        shareholderIdentity: v,
      }),
    }));
  }

  function setAge(v: CompanyAgeBand) {
    setError(null);
    update((prev) => ({
      ...prev,
      classification: patchClassification(prev.classification, {
        companyAge: v,
      }),
    }));
  }

  function setRelated(v: RelatedCompanyFlag) {
    setError(null);
    update((prev) => ({
      ...prev,
      classification: patchClassification(prev.classification, {
        hasRelatedCompany: v,
      }),
    }));
  }

  function goGenerateChecklist() {
    let blockedReason: string | null = null;
    update((prev) => {
      const latest = prev.classification ?? emptyClassification();
      if (
        !latest.shareholderIdentity ||
        !latest.companyAge ||
        !latest.hasRelatedCompany
      ) {
        blockedReason = "請先完成以上三題，才能生成專屬 Checklist。";
        return prev;
      }
      const category =
        latest.systemCategory ??
        resolveDocCategory(
          latest.shareholderIdentity,
          latest.companyAge,
          latest.hasRelatedCompany,
        );
      return {
        ...prev,
        classification: {
          ...emptyClassification(),
          ...latest,
          systemCategory: category,
          clientConfirmed: false,
        },
      };
    });
    if (blockedReason) {
      setError(blockedReason);
      return;
    }
    setError(null);
    saveNow();
    router.push("/workspace/apply/confirm-class");
  }

  const inferred = inferCompanyAgeBand(app.company?.foundedAt ?? "");

  if (!app.id) {
    return (
      <div className="flex flex-1 items-center justify-center p-8 text-sm text-[color:var(--biz-muted)]">
        載入申請資料……
      </div>
    );
  }

  return (
    <ApplyWizardShell
      stepId="classify"
      onNext={goGenerateChecklist}
      nextLabel="儲存答案，生成專屬 Checklist"
    >
      <div className="mx-auto max-w-3xl space-y-8">
        <div>
          <h2 className="text-2xl font-semibold text-[color:var(--biz-ink)]">
            申請分類
          </h2>
          <p className="mt-2 text-sm text-[color:var(--biz-muted)]">
            系統不會向所有客戶顯示同一份文件清單。請先回答以下三題，我們會配對專屬文件類別。
          </p>
        </div>

        <section className="space-y-3">
          <Field label="問題 1：申請人或主要股東身份">
            <p className="mb-3 text-xs text-[color:var(--biz-muted)]">
              如有多名股東，以主要股東或最終實益擁有人情況作初步分類；後台可再按個案調整。
            </p>
            <div className="grid gap-3 sm:grid-cols-3">
              {(
                Object.entries(SHAREHOLDER_IDENTITY_LABEL) as [
                  ShareholderIdentity,
                  string,
                ][]
              ).map(([k, label]) => (
                <ChoiceCard
                  key={k}
                  title={label}
                  selected={c.shareholderIdentity === k}
                  onClick={() => setIdentity(k)}
                />
              ))}
            </div>
          </Field>
        </section>

        <section className="space-y-3">
          <Field label="問題 2：香港公司成立時間">
            {inferred && (
              <p className="mb-3 text-xs text-[color:var(--biz-forest-700)]">
                根據公司成立日期推算：{COMPANY_AGE_LABEL[inferred]}（請確認）
              </p>
            )}
            <div className="grid gap-3 sm:grid-cols-2">
              {(
                Object.entries(COMPANY_AGE_LABEL) as [CompanyAgeBand, string][]
              ).map(([k, label]) => (
                <ChoiceCard
                  key={k}
                  title={label}
                  selected={c.companyAge === k}
                  onClick={() => setAge(k)}
                />
              ))}
            </div>
            {inferred && c.companyAge !== inferred && (
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="mt-2"
                onClick={() => setAge(inferred)}
              >
                採用系統推算結果
              </Button>
            )}
          </Field>
        </section>

        <section className="space-y-3">
          <Field label="問題 3：是否有其他正在營運的關聯公司">
            <p className="mb-3 text-xs text-[color:var(--biz-muted)]">
              關聯公司：由相同股東、董事、最終實益擁有人或管理團隊持有或控制，並已經有實際業務營運的公司。
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              {(
                Object.entries(RELATED_COMPANY_LABEL) as [
                  RelatedCompanyFlag,
                  string,
                ][]
              ).map(([k, label]) => (
                <ChoiceCard
                  key={k}
                  title={label}
                  selected={c.hasRelatedCompany === k}
                  onClick={() => setRelated(k)}
                />
              ))}
            </div>
          </Field>
        </section>

        {answersReady && previewLabel && (
          <div className="rounded-2xl border border-[color:var(--biz-forest-600)] bg-[color:var(--biz-forest-100)] px-4 py-4 text-sm">
            <p className="text-xs text-[color:var(--biz-muted)]">初步配對結果</p>
            <p className="mt-1 text-lg font-semibold text-[color:var(--biz-forest-900)]">
              {previewLabel}
            </p>
            <p className="mt-1 text-[color:var(--biz-muted)]">
              {DOC_CATEGORY_LABEL[c.systemCategory!]}
            </p>
          </div>
        )}

        {error && (
          <p className="rounded-xl bg-danger-100 px-3 py-2 text-sm text-danger-600">
            {error}
          </p>
        )}

        <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-[color:var(--biz-border)] bg-[color:var(--biz-surface-2)] px-4 py-4">
          <p className="flex-1 text-sm text-[color:var(--biz-muted)]">
            儲存後會進入確認頁，顯示你的專屬文件 Checklist；確認後才正式生效。
          </p>
          <Button type="button" onClick={goGenerateChecklist}>
            儲存答案，生成專屬 Checklist
          </Button>
        </div>
      </div>
    </ApplyWizardShell>
  );
}
