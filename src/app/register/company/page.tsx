import Link from "next/link";
import { MobileShell } from "@/components/app/mobile-shell";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/field";
import { PageHeader, StateBanner } from "@/components/ui/layout";

export default function CompanyPage() {
  return (
    <MobileShell>
      <PageHeader
        title="公司基本資料"
        subtitle="P05｜可 OCR 商業登記證"
        backHref="/register/identity"
      />
      <main className="space-y-4 px-4 py-5">
        <StateBanner
          tone="info"
          title="可選：上載商業登記證"
          description="系統可自動填寫公司名稱、商業登記號碼及地址，再由你確認。"
        />
        <Field label="公司中文名稱" required>
          <Input defaultValue="智創科技有限公司" />
        </Field>
        <Field label="公司英文名稱" required>
          <Input defaultValue="SmartCreate Technology Ltd." />
        </Field>
        <Field label="商業登記號碼" required>
          <Input defaultValue="12345678" />
        </Field>
        <Field label="公司註冊編號" required>
          <Input defaultValue="7890123" />
        </Field>
        <Field label="公司成立日期" required>
          <Input type="date" defaultValue="2018-03-12" />
        </Field>
        <Field label="公司類型" required>
          <Select defaultValue="有限公司">
            <option>有限公司</option>
            <option>獨資</option>
            <option>合夥</option>
          </Select>
        </Field>
        <Field label="業務性質" required>
          <Input defaultValue="資訊科技服務" />
        </Field>
        <Field label="主要營運地址" required>
          <Input defaultValue="香港九龍觀塘成業街 27 號日昇中心 12 樓 A 室" />
        </Field>
        <Field label="員工人數" required>
          <Input type="number" defaultValue={28} />
        </Field>
        <Field label="公司網站" hint="選填">
          <Input defaultValue="https://smartcreate.example" />
        </Field>
        <Field label="主要聯絡人" required>
          <Input defaultValue="陳大文" />
        </Field>
        <Link href="/app">
          <Button fullWidth size="lg">
            完成並進入首頁
          </Button>
        </Link>
      </main>
    </MobileShell>
  );
}
