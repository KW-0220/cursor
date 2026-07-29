"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { Card, EmptyState, SectionHeader } from "@/components/ui/layout";

const templates = [
  "缺頁：銀行結單不完整",
  "影像模糊，請重新上載",
  "公司名稱與申請資料不一致",
  "審計報告未見核數師簽署",
  "銀行結單月份不連續",
];

export default function AdminSupplementsPage() {
  const [reason, setReason] = useState(templates[0]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-navy-900">補件管理</h1>
        <p className="mt-1 text-sm text-text-secondary">
          建立補件要求 · 僅追蹤真實案件
        </p>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <SectionHeader title="建立補件要求" />
          <div className="space-y-3">
            <Field label="申請編號" required>
              <Input placeholder="例如 SLF-…" />
            </Field>
            <Field label="文件類型" required>
              <Select defaultValue="銀行結單">
                <option>銀行結單</option>
                <option>審計報告</option>
                <option>授信信</option>
                <option>物業證明</option>
                <option>其他</option>
              </Select>
            </Field>
            <Field label="常用原因模板">
              <Select
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              >
                {templates.map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </Select>
            </Field>
            <Field label="補件原因" required>
              <Input value={reason} onChange={(e) => setReason(e.target.value)} />
            </Field>
            <Field label="詳細說明" required>
              <Textarea placeholder="請說明需要補交的文件內容…" />
            </Field>
            <Field label="截止日期" required>
              <Input type="date" />
            </Field>
            <Field label="是否屬必要文件">
              <Select defaultValue="是">
                <option>是</option>
                <option>否</option>
              </Select>
            </Field>
            <Field label="是否需要重新進行 OCR">
              <Select defaultValue="是">
                <option>是</option>
                <option>否</option>
              </Select>
            </Field>
            <Field label="通知方式">
              <Select defaultValue="App Push + 電郵 + SMS">
                <option>App Push + 電郵 + SMS</option>
                <option>App Push + 電郵</option>
                <option>僅 App Push</option>
              </Select>
            </Field>
            <Button fullWidth>發送補件要求</Button>
          </div>
        </Card>

        <Card>
          <SectionHeader title="進行中補件" />
          <EmptyState
            title="暫無進行中補件"
            description="尚未有真實補件要求。"
          />
        </Card>
      </div>
    </div>
  );
}
