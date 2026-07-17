"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { Card, Disclaimer, SectionHeader } from "@/components/ui/layout";

const initialRules = [
  {
    id: "r1",
    name: "供款佔入數比例上限",
    value: "50%",
    description: "每月供款佔最近六個月平均入數",
  },
  {
    id: "r2",
    name: "連續彈票次數",
    value: "2",
    description: "超過則觸發黃／紅燈覆核",
  },
  {
    id: "r3",
    name: "最低結餘門檻",
    value: "HKD 100,000",
    description: "近六月最低結餘參考",
  },
  {
    id: "r4",
    name: "公司成立年期",
    value: "2 年",
    description: "低於門檻需人工覆核",
  },
  {
    id: "r5",
    name: "營業額變化幅度",
    value: "-30%",
    description: "按年跌幅觸發覆核",
  },
  {
    id: "r6",
    name: "文件完整度",
    value: "90%",
    description: "低於門檻不可送交貸款機構",
  },
];

export default function RulesPage() {
  const [rules, setRules] = useState(initialRules);
  const [reason, setReason] = useState("");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-navy-900">初篩規則設定</h1>
        <p className="mt-1 text-sm text-text-secondary">
          D08｜僅獲授權管理員 · 變更需寫入審計
        </p>
      </div>

      <Disclaimer>
        任何規則更新都要記錄：修改前數值、修改後數值、修改人、生效日期、修改原因。
      </Disclaimer>

      <div className="grid gap-4 lg:grid-cols-2">
        {rules.map((rule) => (
          <Card key={rule.id}>
            <SectionHeader title={rule.name} subtitle={rule.description} />
            <Field label="目前數值">
              <Input
                value={rule.value}
                onChange={(e) =>
                  setRules((list) =>
                    list.map((r) =>
                      r.id === rule.id ? { ...r, value: e.target.value } : r,
                    ),
                  )
                }
              />
            </Field>
          </Card>
        ))}
      </div>

      <Card>
        <Field label="本次修改原因" required>
          <Input
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="例如：配合合作銀行最新入數覆蓋要求"
          />
        </Field>
        <div className="mt-3 flex gap-2">
          <Button disabled={!reason}>儲存並記錄審計</Button>
          <Button variant="outline">還原草稿</Button>
        </div>
      </Card>
    </div>
  );
}
