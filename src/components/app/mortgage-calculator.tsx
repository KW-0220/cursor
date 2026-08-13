"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import {
  Card,
  Disclaimer,
  SectionHeader,
  StateBanner,
} from "@/components/ui/layout";
import {
  computeMortgageCalc,
  dsrToneClasses,
  emptyMortgageCalcInput,
  syncLoanAmountFromLtv,
  type MortgageCalcInput,
  type MortgageCalcResult,
} from "@/lib/mortgage";
import { formatHKD } from "@/lib/utils";

const LS_KEY = "slf_mortgage_calc_v1";

function loadRemembered(): Partial<MortgageCalcInput> | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as Partial<MortgageCalcInput>;
  } catch {
    return null;
  }
}

function saveRemembered(input: MortgageCalcInput) {
  if (!input.rememberInputs) {
    localStorage.removeItem(LS_KEY);
    return;
  }
  localStorage.setItem(
    LS_KEY,
    JSON.stringify({
      propertyValueHkd: input.propertyValueHkd,
      loanAmountHkd: input.loanAmountHkd,
      ltvPct: input.ltvPct,
      tenureYears: input.tenureYears,
      annualRatePct: input.annualRatePct,
      monthlyIncomeHkd: input.monthlyIncomeHkd,
      existingMonthlyDebtsHkd: input.existingMonthlyDebtsHkd,
      rememberInputs: true,
    }),
  );
}

function parseNum(raw: string): number | null {
  if (raw.trim() === "") return null;
  const n = Number(raw.replace(/[,]/g, ""));
  return Number.isFinite(n) ? n : null;
}

export function MortgageLoanRepaymentCalculator({
  value,
  onChange,
  onResult,
  embedded = false,
  initialFromApplication,
}: {
  value?: MortgageCalcInput;
  onChange?: (next: MortgageCalcInput) => void;
  onResult?: (result: MortgageCalcResult | null) => void;
  embedded?: boolean;
  initialFromApplication?: Partial<MortgageCalcInput>;
}) {
  const [internal, setInternal] = useState<MortgageCalcInput>(() =>
    emptyMortgageCalcInput({
      ...loadRemembered(),
      ...initialFromApplication,
    }),
  );
  const [result, setResult] = useState<MortgageCalcResult | null>(null);
  const [loanManual, setLoanManual] = useState(false);

  const input = value ?? internal;

  function patch(partial: Partial<MortgageCalcInput>) {
    const next = { ...input, ...partial };
    if (!value) setInternal(next);
    onChange?.(next);
  }

  useEffect(() => {
    if (value) return;
    const remembered = loadRemembered();
    if (remembered) {
      setInternal((prev) => ({ ...prev, ...remembered }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const livePreview = useMemo(() => computeMortgageCalc(input), [input]);

  function handlePropertyChange(raw: string) {
    const propertyValueHkd = parseNum(raw);
    const next = { ...input, propertyValueHkd };
    if (!loanManual) {
      next.loanAmountHkd = syncLoanAmountFromLtv(next);
    }
    patch(next);
  }

  function handleLtvChange(ltvPct: number) {
    const next = { ...input, ltvPct };
    if (!loanManual) {
      next.loanAmountHkd = syncLoanAmountFromLtv(next);
    }
    patch(next);
  }

  function handleLoanChange(raw: string) {
    setLoanManual(true);
    patch({ loanAmountHkd: parseNum(raw) });
  }

  function handleCalculate() {
    const r = computeMortgageCalc(input);
    setResult(r);
    onResult?.(r);
    saveRemembered(input);
  }

  function handleReset() {
    setLoanManual(false);
    const next = emptyMortgageCalcInput({
      rememberInputs: input.rememberInputs,
    });
    if (!value) setInternal(next);
    onChange?.(next);
    setResult(null);
    onResult?.(null);
  }

  const shown = result ?? (embedded ? livePreview : null);

  return (
    <div className="space-y-4">
      {!embedded && <SectionHeader title="按揭計算" />}
      <StateBanner
        tone="info"
        title="初步供款能力計算工具"
        description="結果只供參考，並非批核結果，亦不會顯示「必定批核／必定不批核」。"
      />

      <Card className="space-y-4">
        <Field label="物業價值（HKD）" required>
          <Input
            type="number"
            className="tabular"
            value={input.propertyValueHkd ?? ""}
            placeholder="例如：5000000"
            onChange={(e) => handlePropertyChange(e.target.value)}
          />
        </Field>

        <Field
          label="貸款比率（LTV）"
          hint={`目前 ${input.ltvPct}%`}
        >
          <input
            type="range"
            min={10}
            max={90}
            step={1}
            value={input.ltvPct}
            onChange={(e) => handleLtvChange(Number(e.target.value))}
            className="w-full accent-teal-600"
          />
        </Field>

        <Field
          label="貸款額（HKD）"
          hint={loanManual ? "已手動輸入；調 LTV 不會覆寫" : "可跟 LTV 自動計算，亦可手動改"}
          required
        >
          <Input
            type="number"
            className="tabular"
            value={input.loanAmountHkd ?? ""}
            placeholder="例如：3000000"
            onChange={(e) => handleLoanChange(e.target.value)}
          />
        </Field>

        <Field label="按揭還款期" hint={`${input.tenureYears} 年`}>
          <input
            type="range"
            min={5}
            max={30}
            step={1}
            value={input.tenureYears}
            onChange={(e) => patch({ tenureYears: Number(e.target.value) })}
            className="w-full accent-teal-600"
          />
        </Field>

        <Field label="按揭年息" hint={`${input.annualRatePct.toFixed(1)}%`}>
          <input
            type="range"
            min={0.5}
            max={8}
            step={0.1}
            value={input.annualRatePct}
            onChange={(e) =>
              patch({ annualRatePct: Number(e.target.value) })
            }
            className="w-full accent-teal-600"
          />
        </Field>

        <Field
          label="每月總收入（Total Monthly Income）"
          required
          hint="薪金／租金／其他穩定每月收入合計"
        >
          <Input
            type="number"
            className="tabular"
            value={input.monthlyIncomeHkd ?? ""}
            placeholder="例如：50000"
            onChange={(e) =>
              patch({ monthlyIncomeHkd: parseNum(e.target.value) })
            }
          />
        </Field>

        <Field
          label="現有每月總債務供款（Total Monthly Debts Repayment）"
          required
          hint="信用卡、私人貸款、汽車貸款、現有按揭及其他每月債務"
        >
          <Input
            type="number"
            className="tabular"
            value={input.existingMonthlyDebtsHkd ?? ""}
            placeholder="例如：8000"
            onChange={(e) =>
              patch({ existingMonthlyDebtsHkd: parseNum(e.target.value) })
            }
          />
        </Field>

        <label className="flex items-center justify-between gap-3 rounded-xl border border-border bg-surface-2 px-3 py-2.5">
          <span className="text-sm text-text-primary">保留資料以便下次使用</span>
          <input
            type="checkbox"
            className="size-4 accent-teal-600"
            checked={input.rememberInputs}
            onChange={(e) => patch({ rememberInputs: e.target.checked })}
          />
        </label>

        <div className="flex gap-2">
          <Button type="button" className="flex-1" onClick={handleCalculate}>
            計算
          </Button>
          <Button
            type="button"
            variant="outline"
            className="flex-1"
            onClick={handleReset}
          >
            重設
          </Button>
        </div>
      </Card>

      {shown && (
        <Card className="space-y-3">
          <SectionHeader title="計算結果" />
          <div className="grid gap-2 sm:grid-cols-2">
            <ResultTile
              label="新申請按揭每月供款"
              value={
                shown.newMonthlyRepaymentHkd == null
                  ? "—"
                  : formatHKD(Math.round(shown.newMonthlyRepaymentHkd))
              }
            />
            <ResultTile
              label="總每月債務供款"
              value={
                shown.totalMonthlyDebtsHkd == null
                  ? "—"
                  : formatHKD(Math.round(shown.totalMonthlyDebtsHkd))
              }
            />
            <ResultTile
              label="每月總收入"
              value={
                shown.monthlyIncomeHkd == null
                  ? "—"
                  : formatHKD(Math.round(shown.monthlyIncomeHkd))
              }
            />
            <div
              className={`rounded-xl border px-3 py-3 ${dsrToneClasses(shown.dsrTone)}`}
            >
              <p className="text-xs opacity-80">DSR／供款比率</p>
              <p className="mt-1 text-xl font-semibold tabular">
                {shown.dsrPct == null ? "—" : `${shown.dsrPct.toFixed(2)}%`}
              </p>
              <p className="mt-1 text-[11px] opacity-80">
                {shown.dsrTone === "green"
                  ? "比率較健康"
                  : shown.dsrTone === "amber"
                    ? "接近上限"
                    : shown.dsrTone === "red"
                      ? "偏高，需要人工審核"
                      : "資料不足"}
              </p>
            </div>
          </div>
          <p className="text-sm leading-relaxed text-text-secondary">
            {shown.narrative}
          </p>
          <Disclaimer>
            {shown.formulaNotes.map((n) => (
              <span key={n} className="block">
                {n}
              </span>
            ))}
          </Disclaimer>
        </Card>
      )}
    </div>
  );
}

function ResultTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-surface-2 px-3 py-3">
      <p className="text-xs text-text-muted">{label}</p>
      <p className="mt-1 text-lg font-semibold tabular text-navy-900">{value}</p>
    </div>
  );
}
