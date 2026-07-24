"use client";

import { useState } from "react";
import Link from "next/link";
import { MobileShell } from "@/components/app/mobile-shell";
import { Button } from "@/components/ui/button";
import {
  Card,
  Disclaimer,
  PageHeader,
  SectionHeader,
} from "@/components/ui/layout";
import { Field, Input, Select, Textarea } from "@/components/ui/field";

const TYPES = [
  "公司組織架構圖",
  "最新管理帳目",
  "Audited Report",
  "稅務報表",
  "銀行授信信",
  "現有貸款還款表",
  "合約或訂單",
  "強積金供款紀錄",
  "發票或銷售紀錄",
  "抵押品資料",
  "個人擔保文件",
  "其他",
];

export default function SupplementsPage() {
  const [items, setItems] = useState<
    { id: string; type: string; note: string; file?: string }[]
  >([]);
  const [type, setType] = useState(TYPES[0]);
  const [note, setNote] = useState("");

  return (
    <MobileShell>
      <PageHeader
        title="其他補充文件"
        subtitle="選擇性上載"
        backHref="/apply/documents"
      />
      <main className="space-y-4 px-4 py-5 pb-28">
        <p className="text-sm text-text-secondary">
          補充文件並非必須，但可以協助貸款顧問更全面了解公司的財務及營運情況。第二階段正式信貸審批可能要求
          Audited Report、管理帳目等。
        </p>

        <Card className="space-y-3">
          <SectionHeader title="新增其他文件" />
          <Field label="文件類型">
            <Select value={type} onChange={(e) => setType(e.target.value)}>
              {TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="文件說明">
            <Textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="例如：FY2025 審計報告"
            />
          </Field>
          <Field label="上載">
            <Input type="file" />
          </Field>
          <Button
            fullWidth
            onClick={() => {
              setItems((list) => [
                ...list,
                {
                  id: crypto.randomUUID(),
                  type,
                  note: note || "—",
                },
              ]);
              setNote("");
            }}
          >
            新增補充文件
          </Button>
        </Card>

        {items.length > 0 && (
          <div className="space-y-2">
            {items.map((it) => (
              <Card key={it.id}>
                <p className="font-medium text-navy-900">{it.type}</p>
                <p className="text-xs text-text-secondary">{it.note}</p>
              </Card>
            ))}
          </div>
        )}

        <Link href="/apply/documents">
          <Button fullWidth variant="outline">
            返回文件清單
          </Button>
        </Link>
        <Disclaimer>
          單靠第一階段四項必須文件不能可靠計算 EBITDA、Gearing、DSCR
          等；該等指標屬第二階段正式信貸審批。
        </Disclaimer>
      </main>
    </MobileShell>
  );
}
