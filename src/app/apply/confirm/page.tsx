import Link from "next/link";
import { MobileShell } from "@/components/app/mobile-shell";
import { Button } from "@/components/ui/button";
import {
  Card,
  Disclaimer,
  PageHeader,
  SectionHeader,
} from "@/components/ui/layout";
import { formatHKD } from "@/lib/utils";

export default function ConfirmPage() {
  return (
    <MobileShell>
      <PageHeader
        title="申請資料確認"
        subtitle="N05｜提交前覆核"
        backHref="/apply/declarations"
      />
      <main className="space-y-4 px-4 py-5">
        <SectionHeader title="請確認以下資料正確" />
        {[
          ["公司", "智創科技有限公司"],
          ["貸款類型", "無抵押貸款"],
          ["申請金額", formatHKD(1500000)],
          ["審計報告", "FY2023–FY2025 已上載"],
          ["債務申報", "2 項現有貸款／或已聲明無貸款"],
          ["資格聲明", "Q6–Q10 已完成"],
        ].map(([k, v]) => (
          <Card key={k}>
            <p className="text-xs text-text-muted">{k}</p>
            <p className="mt-1 text-sm font-medium text-navy-900">{v}</p>
          </Card>
        ))}
        <Disclaimer>
          提交後系統會執行：文件識別 → 財務提取 → EBITDA／DSCR／Gearing
          計算 → 十項政策核對 → 三色燈初批 → 人工覆核。AI
          結果只屬初步評估，非正式批核。
        </Disclaimer>
        <Link href="/apply/analyzing">
          <Button fullWidth size="lg">
            確認並提交申請
          </Button>
        </Link>
      </main>
    </MobileShell>
  );
}
