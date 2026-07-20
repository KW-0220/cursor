"use client";

import { useState } from "react";
import Link from "next/link";
import { MobileShell } from "@/components/app/mobile-shell";
import { Button } from "@/components/ui/button";
import { Field, Textarea } from "@/components/ui/field";
import {
  Card,
  Disclaimer,
  PageHeader,
  SectionHeader,
  StateBanner,
} from "@/components/ui/layout";
import type { CustomerDeclarations } from "@/lib/policy";

function ChoiceRow({
  options,
  value,
  onChange,
}: {
  options: { value: string; label: string }[];
  value: string | null;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={`rounded-full px-3 py-1.5 text-sm ${
            value === o.value
              ? "bg-navy-900 text-white"
              : "bg-surface-2 text-text-secondary"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export default function DeclarationsPage() {
  const [form, setForm] = useState<CustomerDeclarations>({
    operatingOverOneYear: null,
    restrictedIndustry: null,
    personalGuarantee: null,
    unsecuredLimitAck: null,
    collateralAvailable: null,
  });

  const ready =
    form.operatingOverOneYear &&
    form.restrictedIndustry &&
    form.personalGuarantee &&
    form.unsecuredLimitAck &&
    form.collateralAvailable &&
    (form.restrictedIndustry !== "yes" || !!form.restrictedIndustryNote);

  return (
    <MobileShell>
      <PageHeader
        title="貸款資格聲明"
        subtitle="N04｜項目 6–10"
        backHref="/apply/debts"
      />
      <main className="space-y-4 px-4 py-5 pb-28">
        <StateBanner
          tone="info"
          title="請根據公司實際情況回答"
          description="聲明內容將用於初步貸款資格評估，並可能需要提交證明文件。第九／十項最終仍以系統計算為準。"
        />

        <Card className="space-y-3">
          <SectionHeader title="Q6｜經營資歷" />
          <p className="text-sm text-text-secondary">
            公司是否已完成商業登記，並且實際經營滿一年或以上？
          </p>
          <ChoiceRow
            value={form.operatingOverOneYear}
            onChange={(v) =>
              setForm((f) => ({
                ...f,
                operatingOverOneYear: v as "yes" | "no",
              }))
            }
            options={[
              { value: "yes", label: "是" },
              { value: "no", label: "否" },
            ]}
          />
        </Card>

        <Card className="space-y-3">
          <SectionHeader title="Q7｜行業限制" />
          <p className="text-sm text-text-secondary">
            公司目前的主要業務是否涉及博彩、高污染、高耗能、敏感或禁止行業？
          </p>
          <ChoiceRow
            value={form.restrictedIndustry}
            onChange={(v) =>
              setForm((f) => ({
                ...f,
                restrictedIndustry: v as "yes" | "no",
              }))
            }
            options={[
              { value: "yes", label: "是" },
              { value: "no", label: "否" },
            ]}
          />
          {form.restrictedIndustry === "yes" && (
            <Field label="請說明涉及的業務類型" required>
              <Textarea
                value={form.restrictedIndustryNote ?? ""}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    restrictedIndustryNote: e.target.value,
                  }))
                }
              />
            </Field>
          )}
        </Card>

        <Card className="space-y-3">
          <SectionHeader title="Q8｜個人擔保要求" />
          <p className="text-sm text-text-secondary">
            持有公司百分之二十五或以上股權的核心股東或控制人，是否願意按貸款要求提供個人擔保？
          </p>
          <ChoiceRow
            value={form.personalGuarantee}
            onChange={(v) =>
              setForm((f) => ({
                ...f,
                personalGuarantee: v as CustomerDeclarations["personalGuarantee"],
              }))
            }
            options={[
              { value: "yes", label: "是" },
              { value: "no", label: "否" },
              { value: "no_25pct", label: "沒有單一持股達 25% 的股東" },
            ]}
          />
        </Card>

        <Card className="space-y-3">
          <SectionHeader title="Q9｜無抵押貸款限額" />
          <p className="text-sm text-text-secondary">
            本人明白，無抵押貸款最高金額一般以公司平均月營收兩至三倍及產品上限為準，並同意最終申請金額可能按審批結果調整。
          </p>
          <ChoiceRow
            value={form.unsecuredLimitAck}
            onChange={(v) =>
              setForm((f) => ({
                ...f,
                unsecuredLimitAck: v as CustomerDeclarations["unsecuredLimitAck"],
              }))
            }
            options={[
              { value: "agree", label: "同意" },
              { value: "disagree", label: "不同意" },
              { value: "na_secured", label: "不適用（有抵押）" },
            ]}
          />
          <p className="text-xs text-text-muted">
            系統仍會計算：平均月營收＝最近完整年度營收÷12；倍數＝申請額÷平均月營收。
          </p>
        </Card>

        <Card className="space-y-3">
          <SectionHeader title="Q10｜抵押品及質押率" />
          <p className="text-sm text-text-secondary">
            如申請有抵押貸款，公司或擔保人是否可以提供合資格不動產或定期存單作抵押，並接受指定機構估值？
          </p>
          <ChoiceRow
            value={form.collateralAvailable}
            onChange={(v) =>
              setForm((f) => ({
                ...f,
                collateralAvailable:
                  v as CustomerDeclarations["collateralAvailable"],
              }))
            }
            options={[
              { value: "yes", label: "是" },
              { value: "no", label: "否" },
              { value: "na_unsecured", label: "不適用（無抵押）" },
            ]}
          />
        </Card>

        <Disclaimer>
          第四／五項訴訟與信用：文件未披露 ≠ 已證實沒有；後台會標示待外部核實。
        </Disclaimer>
      </main>

      <div className="fixed inset-x-0 bottom-0 mx-auto max-w-[430px] border-t border-border bg-surface-1 p-4">
        <Link href={ready ? "/apply/confirm" : "#"}>
          <Button fullWidth size="lg" disabled={!ready}>
            繼續確認申請
          </Button>
        </Link>
      </div>
    </MobileShell>
  );
}
