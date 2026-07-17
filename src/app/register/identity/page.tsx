"use client";

import { useState } from "react";
import Link from "next/link";
import { MobileShell } from "@/components/app/mobile-shell";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/field";
import { PageHeader, Disclaimer } from "@/components/ui/layout";
import { maskId } from "@/lib/utils";

export default function IdentityPage() {
  const [id, setId] = useState("A123456(7)");

  return (
    <MobileShell>
      <PageHeader
        title="申請人身份確認"
        subtitle="P04｜敏感資料預設遮罩"
        backHref="/auth/login"
      />
      <main className="space-y-4 px-4 py-5">
        <Field label="中文姓名" required>
          <Input defaultValue="陳大文" />
        </Field>
        <Field label="英文姓名" required>
          <Input defaultValue="Chan Tai Man" />
        </Field>
        <Field label="香港身份證／護照號碼" required hint={`顯示：${maskId(id)}`}>
          <Input value={id} onChange={(e) => setId(e.target.value)} />
        </Field>
        <Field label="聯絡電話" required>
          <Input defaultValue="+852 9123 4567" />
        </Field>
        <Field label="電郵" required>
          <Input defaultValue="tm.chan@smartcreate.example" />
        </Field>
        <Field label="公司職位" required>
          <Input defaultValue="董事" />
        </Field>
        <Field label="與申請公司的關係" required>
          <Select defaultValue="董事">
            <option>董事</option>
            <option>股東</option>
            <option>獲授權代表</option>
            <option>其他</option>
          </Select>
        </Field>
        <div className="rounded-2xl border border-dashed border-border bg-surface-2/60 p-4 text-sm text-text-secondary">
          上載：身份證明文件；如非董事，請另加授權書。
        </div>
        <Disclaimer>
          資料僅用於貸款申請核實及與合作機構分享（經你明確授權）。
        </Disclaimer>
        <Link href="/register/company">
          <Button fullWidth size="lg">
            下一步：公司資料
          </Button>
        </Link>
      </main>
    </MobileShell>
  );
}
