"use client";

import { ApplyWizardShell } from "@/components/biz/apply-wizard-shell";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import {
  COMPANY_AGE_LABEL,
  RELATED_COMPANY_LABEL,
  SHAREHOLDER_IDENTITY_LABEL,
  inferCompanyAgeBand,
  resolveDocCategory,
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

export default function ClassifyPage() {
  const { app, update, saveNow } = useBizdoc();
  const c = app.classification;

  function setIdentity(v: ShareholderIdentity) {
    update((prev) => {
      const next = {
        ...prev.classification,
        shareholderIdentity: v,
        clientConfirmed: false,
      };
      if (next.companyAge && next.hasRelatedCompany) {
        next.systemCategory = resolveDocCategory(
          v,
          next.companyAge,
          next.hasRelatedCompany,
        );
      }
      return { ...prev, classification: next };
    });
  }

  function setAge(v: CompanyAgeBand) {
    update((prev) => {
      const next = {
        ...prev.classification,
        companyAge: v,
        clientConfirmed: false,
      };
      if (next.shareholderIdentity && next.hasRelatedCompany) {
        next.systemCategory = resolveDocCategory(
          next.shareholderIdentity,
          v,
          next.hasRelatedCompany,
        );
      }
      return { ...prev, classification: next };
    });
  }

  function setRelated(v: RelatedCompanyFlag) {
    update((prev) => {
      const next = {
        ...prev.classification,
        hasRelatedCompany: v,
        clientConfirmed: false,
      };
      if (next.shareholderIdentity && next.companyAge) {
        next.systemCategory = resolveDocCategory(
          next.shareholderIdentity,
          next.companyAge,
          v,
        );
      }
      return { ...prev, classification: next };
    });
  }

  const inferred = inferCompanyAgeBand(app.company.foundedAt);

  return (
    <ApplyWizardShell stepId="classify">
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

        <div className="rounded-2xl border border-[color:var(--biz-border)] bg-[color:var(--biz-surface-2)] px-4 py-3 text-sm text-[color:var(--biz-muted)]">
          下一步將顯示系統配對的文件類別，請確認後才生成專屬 Checklist。
          <Button
            type="button"
            size="sm"
            className="ml-3"
            onClick={() => saveNow()}
          >
            儲存答案
          </Button>
        </div>
      </div>
    </ApplyWizardShell>
  );
}
