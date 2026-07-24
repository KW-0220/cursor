"use client";

import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import {
  Card,
  Disclaimer,
  SectionHeader,
  StateBanner,
} from "@/components/ui/layout";

export type UploadedMeta = {
  name: string;
  size: number;
  type: string;
};

export type ApplyDocsState = {
  br: UploadedMeta | null;
  nar1: UploadedMeta | null;
  identity: UploadedMeta[];
  companyOther: UploadedMeta[];
  bank: Record<string, UploadedMeta | null>;
};

export function lastSixBankMonths(now = new Date()): string[] {
  const d = new Date(now.getFullYear(), now.getMonth(), 1);
  d.setMonth(d.getMonth() - 1); // 至上一個完整月份
  const months: string[] = [];
  for (let i = 0; i < 6; i++) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    months.unshift(`${y}-${m}`);
    d.setMonth(d.getMonth() - 1);
  }
  return months;
}

export function emptyApplyDocs(months: string[]): ApplyDocsState {
  return {
    br: null,
    nar1: null,
    identity: [],
    companyOther: [],
    bank: Object.fromEntries(months.map((m) => [m, null])),
  };
}

export function isApplyDocsComplete(docs: ApplyDocsState, months: string[]) {
  const bankOk = months.every((m) => docs.bank[m] != null);
  return Boolean(docs.br && docs.nar1 && docs.identity.length > 0 && bankOk);
}

export function applyDocsProgress(docs: ApplyDocsState, months: string[]) {
  const bankFilled = months.filter((m) => docs.bank[m]).length;
  const slots = [
    docs.br ? 1 : 0,
    docs.nar1 ? 1 : 0,
    docs.identity.length > 0 ? 1 : 0,
    bankFilled === 6 ? 1 : 0,
  ];
  return {
    done: slots.reduce((a, b) => a + b, 0),
    total: 4,
    bankFilled,
  };
}

function toMeta(file: File): UploadedMeta {
  return { name: file.name, size: file.size, type: file.type || "application/octet-stream" };
}

function formatBytes(n: number) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

function FileRow({
  file,
  onClear,
}: {
  file: UploadedMeta;
  onClear: () => void;
}) {
  return (
    <div className="mt-2 flex items-center justify-between gap-2 rounded-xl bg-surface-2 px-3 py-2 text-sm">
      <div className="min-w-0">
        <p className="truncate font-medium text-navy-900">{file.name}</p>
        <p className="text-xs text-text-muted">{formatBytes(file.size)}</p>
      </div>
      <button
        type="button"
        className="shrink-0 text-xs text-danger-600"
        onClick={onClear}
      >
        移除
      </button>
    </div>
  );
}

function SingleUpload({
  label,
  required,
  hint,
  accept,
  value,
  onChange,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  accept: string;
  value: UploadedMeta | null;
  onChange: (f: UploadedMeta | null) => void;
}) {
  return (
    <Card>
      <Field label={label} required={required} hint={hint}>
        <Input
          type="file"
          accept={accept}
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (!f) return;
            onChange(toMeta(f));
            e.target.value = "";
          }}
        />
      </Field>
      {value ? (
        <FileRow file={value} onClear={() => onChange(null)} />
      ) : (
        <p className="mt-2 text-xs text-warning-600">尚未上載</p>
      )}
    </Card>
  );
}

function MultiUpload({
  label,
  required,
  hint,
  accept,
  values,
  onChange,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  accept: string;
  values: UploadedMeta[];
  onChange: (files: UploadedMeta[]) => void;
}) {
  return (
    <Card>
      <Field label={label} required={required} hint={hint}>
        <Input
          type="file"
          accept={accept}
          multiple
          onChange={(e) => {
            const list = Array.from(e.target.files ?? []);
            if (!list.length) return;
            onChange([...values, ...list.map(toMeta)]);
            e.target.value = "";
          }}
        />
      </Field>
      {values.length === 0 ? (
        <p className="mt-2 text-xs text-warning-600">尚未上載</p>
      ) : (
        values.map((f, i) => (
          <FileRow
            key={`${f.name}-${i}`}
            file={f}
            onClear={() => onChange(values.filter((_, idx) => idx !== i))}
          />
        ))
      )}
    </Card>
  );
}

export function ApplyDocumentsUpload({
  months,
  docs,
  onChange,
}: {
  months: string[];
  docs: ApplyDocsState;
  onChange: (next: ApplyDocsState) => void;
}) {
  const progress = useMemo(
    () => applyDocsProgress(docs, months),
    [docs, months],
  );
  const complete = isApplyDocsComplete(docs, months);

  return (
    <div className="space-y-4">
      <SectionHeader
        title="上載必須文件"
        subtitle="第一階段申請 · 全部於本頁提交"
      />
      <StateBanner
        tone="info"
        title="文件清單"
        description="請上載：商業登記證 BR、NAR1、身份證明，以及最近六個月銀行月結單（必須 6 份 PDF）。"
      />

      <Card className="bg-surface-2">
        <p className="text-sm font-medium text-navy-900">
          完成進度：{progress.done}／{progress.total} 類
          {complete ? " · 已齊備" : " · 尚欠文件"}
        </p>
        <p className="mt-1 text-xs text-text-muted">
          銀行月結單：{progress.bankFilled}／6 份 PDF
        </p>
      </Card>

      <SectionHeader title="1. 公司及身份文件" />
      <MultiUpload
        label="身份證明文件"
        required
        hint="所有董事、股東及個人擔保人：香港身份證或護照（PDF／JPG／PNG）"
        accept="application/pdf,.pdf,image/jpeg,.jpg,.jpeg,image/png,.png"
        values={docs.identity}
        onChange={(identity) => onChange({ ...docs, identity })}
      />
      <MultiUpload
        label="其他公司文件（選填）"
        hint="例如授權書、公司章程副本"
        accept="application/pdf,.pdf,image/jpeg,.jpg,.jpeg,image/png,.png"
        values={docs.companyOther}
        onChange={(companyOther) => onChange({ ...docs, companyOther })}
      />

      <SectionHeader title="2. 六個月銀行月結單" subtitle="必須 6 份 PDF" />
      <StateBanner
        tone="warning"
        title="只接受 PDF"
        description="六個連續月份、同一主要銀行戶口、完整交易頁。不接受 JPG、PNG、截圖或 Excel。"
      />
      <div className="space-y-3">
        {months.map((m) => (
          <Card key={m}>
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-semibold text-navy-900">{m}</p>
              <span
                className={`text-xs ${docs.bank[m] ? "text-teal-700" : "text-warning-600"}`}
              >
                {docs.bank[m] ? "已上載" : "尚未上載"}
              </span>
            </div>
            <Field label="上載 PDF" required>
              <Input
                type="file"
                accept="application/pdf,.pdf"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (!f) return;
                  if (
                    f.type &&
                    f.type !== "application/pdf" &&
                    !f.name.toLowerCase().endsWith(".pdf")
                  ) {
                    return;
                  }
                  onChange({
                    ...docs,
                    bank: { ...docs.bank, [m]: toMeta(f) },
                  });
                  e.target.value = "";
                }}
              />
            </Field>
            {docs.bank[m] && (
              <FileRow
                file={docs.bank[m]!}
                onClear={() =>
                  onChange({
                    ...docs,
                    bank: { ...docs.bank, [m]: null },
                  })
                }
              />
            )}
          </Card>
        ))}
      </div>
      {progress.bankFilled < 6 && (
        <p className="text-xs text-warning-600">
          尚欠 {6 - progress.bankFilled} 份銀行月結單 PDF，齊 6 份後才可繼續。
        </p>
      )}

      <SectionHeader title="3. NAR1" />
      <SingleUpload
        label="最近期公司註冊處周年申報表 NAR1"
        required
        hint="最近期已提交完整頁面；不接受只上載封面"
        accept="application/pdf,.pdf,image/jpeg,.jpg,.jpeg,image/png,.png"
        value={docs.nar1}
        onChange={(nar1) => onChange({ ...docs, nar1 })}
      />

      <SectionHeader title="4. 商業登記證 BR" />
      <SingleUpload
        label="商業登記證 BR"
        required
        hint="最新及有效副本；公司名稱及商業登記號碼須清晰可見"
        accept="application/pdf,.pdf,image/jpeg,.jpg,.jpeg,image/png,.png"
        value={docs.br}
        onChange={(br) => onChange({ ...docs, br })}
      />

      {!complete && (
        <StateBanner
          tone="warning"
          title="文件未齊"
          description="請完成 BR、NAR1、至少一份身份證明，以及 6 份銀行月結單 PDF。"
        />
      )}

      <Disclaimer>
        上載檔案僅用於本申請之初步文件檢查及配對。不會在此頁顯示批核結果或保證利率。
      </Disclaimer>
    </div>
  );
}

/** 摘要用：列出已上載檔名 */
export function summarizeApplyDocs(docs: ApplyDocsState, months: string[]) {
  const bankNames = months
    .map((m) => docs.bank[m]?.name)
    .filter(Boolean) as string[];
  return {
    br: docs.br?.name ?? null,
    nar1: docs.nar1?.name ?? null,
    identity: docs.identity.map((f) => f.name),
    companyOther: docs.companyOther.map((f) => f.name),
    bankCount: bankNames.length,
    bankNames,
  };
}
