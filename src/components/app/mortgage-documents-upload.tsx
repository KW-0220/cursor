"use client";

import { useMemo, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, SectionHeader, StateBanner } from "@/components/ui/layout";
import {
  MORTGAGE_SECTION_LABEL,
  mortgageDocSlots,
  type MortgageDocSkipReason,
  type MortgageDocSlotDef,
  type MortgageDocSlotId,
  type MortgageKind,
} from "@/lib/mortgage";

export type MortgageUploadedFile = {
  name: string;
  size: number;
  type: string;
  file: File;
  uploadedAt: string;
};

export type MortgageDocSlotState = {
  file: MortgageUploadedFile | null;
  skip: MortgageDocSkipReason;
};

export type MortgageDocsState = Record<
  MortgageDocSlotId,
  MortgageDocSlotState
>;

export function emptyMortgageDocs(
  kind: MortgageKind,
  includeShellCompany: boolean,
): MortgageDocsState {
  const slots = mortgageDocSlots({ kind, includeShellCompany });
  const out = {} as MortgageDocsState;
  for (const s of slots) {
    out[s.id] = { file: null, skip: null };
  }
  return out;
}

export function mergeMortgageDocsState(
  kind: MortgageKind,
  includeShellCompany: boolean,
  prev: MortgageDocsState | null | undefined,
): MortgageDocsState {
  const next = emptyMortgageDocs(kind, includeShellCompany);
  if (!prev) return next;
  for (const id of Object.keys(next) as MortgageDocSlotId[]) {
    if (prev[id]) next[id] = prev[id]!;
  }
  return next;
}

export function isMortgageDocsComplete(
  kind: MortgageKind,
  includeShellCompany: boolean,
  docs: MortgageDocsState,
): boolean {
  const slots = mortgageDocSlots({ kind, includeShellCompany });
  return slots.every((s) => {
    const st = docs[s.id];
    if (!st) return false;
    if (st.file) return true;
    if (!s.required && (st.skip === "none" || st.skip === "later")) return true;
    return false;
  });
}

export function mortgageDocsProgress(
  kind: MortgageKind,
  includeShellCompany: boolean,
  docs: MortgageDocsState,
) {
  const slots = mortgageDocSlots({ kind, includeShellCompany });
  const required = slots.filter((s) => s.required);
  const done = required.filter((s) => Boolean(docs[s.id]?.file)).length;
  return { done, total: required.length };
}

export function summarizeMortgageDocs(
  kind: MortgageKind,
  includeShellCompany: boolean,
  docs: MortgageDocsState,
) {
  return mortgageDocSlots({ kind, includeShellCompany }).map((s) => {
    const st = docs[s.id];
    return {
      id: s.id,
      title: s.title,
      required: s.required,
      fileName: st?.file?.name ?? null,
      skip: st?.skip ?? null,
      status: slotStatusLabel(s, st),
    };
  });
}

function slotStatusLabel(
  def: MortgageDocSlotDef,
  st: MortgageDocSlotState | undefined,
) {
  if (st?.file) return "已上載";
  if (st?.skip === "none") return "沒有此文件";
  if (st?.skip === "later") return "稍後補交";
  return def.required ? "未上載" : "選填・未上載";
}

export function MortgageDocumentsUpload({
  kind,
  includeShellCompany = false,
  docs,
  onChange,
}: {
  kind: MortgageKind;
  includeShellCompany?: boolean;
  docs: MortgageDocsState;
  onChange: (next: MortgageDocsState) => void;
}) {
  const slots = useMemo(
    () => mortgageDocSlots({ kind, includeShellCompany }),
    [kind, includeShellCompany],
  );
  const sections = useMemo(() => {
    const order: Array<MortgageDocSlotDef["section"]> = [
      "identity",
      "income",
      "property",
      "existing_mortgage",
      "assets",
      "company",
    ];
    return order
      .map((section) => ({
        section,
        label: MORTGAGE_SECTION_LABEL[section],
        items: slots.filter((s) => s.section === section),
      }))
      .filter((g) => g.items.length > 0);
  }, [slots]);

  const progress = mortgageDocsProgress(kind, includeShellCompany, docs);

  function setSlot(id: MortgageDocSlotId, partial: Partial<MortgageDocSlotState>) {
    onChange({
      ...docs,
      [id]: {
        file: docs[id]?.file ?? null,
        skip: docs[id]?.skip ?? null,
        ...partial,
      },
    });
  }

  return (
    <div className="space-y-4">
      <SectionHeader
        title={kind === "new_buy" ? "新買按揭文件上載" : "轉按文件上載"}
        subtitle={`必須文件 ${progress.done}／${progress.total}；每份文件獨立上載位置`}
      />
      <StateBanner
        tone="info"
        title="獨立文件卡片"
        description="不可把所有文件塞入「其他」。每項有獨立標題、說明、上載、狀態與刪除／重傳。"
      />

      {includeShellCompany && (
        <StateBanner
          tone="warning"
          title="公司按揭｜空殼公司額外資料"
          description="已啟用空殼／SPV／Holding Company 額外文件區塊。"
        />
      )}

      {sections.map((g) => (
        <div key={g.section} className="space-y-3">
          <h3 className="text-sm font-semibold text-navy-900">{g.label}</h3>
          {g.items.map((slot) => (
            <MortgageDocCard
              key={slot.id}
              def={slot}
              state={docs[slot.id] ?? { file: null, skip: null }}
              onUpload={(file) =>
                setSlot(slot.id, {
                  file: {
                    name: file.name,
                    size: file.size,
                    type: file.type,
                    file,
                    uploadedAt: new Date().toISOString(),
                  },
                  skip: null,
                })
              }
              onClear={() => setSlot(slot.id, { file: null })}
              onSkip={(skip) => setSlot(slot.id, { file: null, skip })}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

function MortgageDocCard({
  def,
  state,
  onUpload,
  onClear,
  onSkip,
}: {
  def: MortgageDocSlotDef;
  state: MortgageDocSlotState;
  onUpload: (file: File) => void;
  onClear: () => void;
  onSkip: (skip: MortgageDocSkipReason) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const status = slotStatusLabel(def, state);

  return (
    <Card className="space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-navy-900">
            {def.title}
            {def.required ? (
              <span className="ml-1 text-danger-600">*</span>
            ) : (
              <span className="ml-1 text-xs font-normal text-text-muted">
                選填
              </span>
            )}
          </p>
          <p className="mt-1 text-xs leading-relaxed text-text-secondary">
            {def.description}
          </p>
          <p className="mt-1 text-[11px] text-text-muted">用途：{def.purpose}</p>
          <p className="mt-1 text-[11px] text-text-muted">
            格式：{def.formatsHint} · AI 重點：{def.aiFocus.join("、")}
          </p>
        </div>
        <span
          className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium ${
            state.file
              ? "bg-success-100 text-success-600"
              : def.required
                ? "bg-warning-100 text-warning-600"
                : "bg-surface-2 text-text-muted"
          }`}
        >
          {status}
        </span>
      </div>

      {state.file ? (
        <div className="rounded-xl border border-border bg-surface-2 px-3 py-2">
          <p className="truncate text-sm font-medium text-navy-900">
            {state.file.name}
          </p>
          <p className="mt-0.5 text-[11px] text-text-muted">
            {(state.file.size / 1024).toFixed(0)} KB ·{" "}
            {new Date(state.file.uploadedAt).toLocaleString("zh-HK", {
              hour12: false,
            })}
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => inputRef.current?.click()}
            >
              重新上載
            </Button>
            <Button type="button" size="sm" variant="outline" onClick={onClear}>
              刪除
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          <Button
            type="button"
            variant="outline"
            fullWidth
            onClick={() => inputRef.current?.click()}
          >
            上載此文件
          </Button>
          {def.allowSkip && (
            <div className="flex gap-2">
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="flex-1"
                onClick={() => onSkip("none")}
              >
                沒有此文件
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="flex-1"
                onClick={() => onSkip("later")}
              >
                稍後補交
              </Button>
            </div>
          )}
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept={def.accept}
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onUpload(f);
          e.target.value = "";
        }}
      />
    </Card>
  );
}
