"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { Card, SectionHeader, StateBanner } from "@/components/ui/layout";
import { supplements } from "@/lib/mock-data";

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
        <p className="mt-1 text-sm text-text-secondary">D07｜模板減少重複輸入</p>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <SectionHeader title="建立補件要求" />
          <div className="space-y-3">
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
              <Textarea defaultValue="請補交 2026 年 3 月完整銀行結單。現有文件缺少第 4 至第 6 頁。" />
            </Field>
            <Field label="截止日期" required>
              <Input type="date" defaultValue="2026-07-22" />
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
          <StateBanner
            tone="warning"
            title={supplements[0].documentType}
            description={supplements[0].detail}
          />
          <div className="mt-4 space-y-2 text-sm text-text-secondary">
            <p>案件：SLF-2026-00482</p>
            <p>截止日期：{supplements[0].dueDate}</p>
            <p>必要文件：是</p>
            <p>顧問備註：{supplements[0].advisorNote}</p>
          </div>
        </Card>
      </div>
    </div>
  );
}
