import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, Disclaimer, SectionHeader } from "@/components/ui/layout";

export default function RetentionPage() {
  return (
    <main className="px-4 py-5 pb-28">
      <Link
        href="/app/account"
        className="text-sm text-teal-700 hover:underline"
      >
        ← 返回我的帳戶
      </Link>
      <h1 className="mt-3 text-xl font-bold text-navy-900">資料保留期限</h1>
      <p className="mt-2 text-sm text-text-secondary">
        以下為申請相關資料保存安排概要，實際期限以最新私隱政策及合作機構要求為準。
      </p>

      <SectionHeader title="一般安排" />
      <Card className="space-y-2 text-sm text-text-secondary">
        <p>
          申請進行期間：保留處理貸款申請、補件、顧問覆核及合規所需的公司、銀行、身份及評估資料。
        </p>
        <p>
          申請完結或撤回後：在合理期間內刪除、匿名化或限制使用，除非法例、爭議處理或合作機構要求更長保存。
        </p>
        <p>
          第三方接收機構：按其私隱政策及監管要求保存；SME LoanFlow
          無法單方面更改對方保存安排。
        </p>
      </Card>

      <Disclaimer>
        若需行使查閱、更正或刪除個人資料的權利，請聯絡貸款顧問或透過正式私隱查詢渠道處理。
      </Disclaimer>

      <div className="mt-4 space-y-2">
        <Link href="/app/account/data-use">
          <Button fullWidth variant="outline">
            查看資料使用目的
          </Button>
        </Link>
        <Link href="/app/account">
          <Button fullWidth>返回帳戶</Button>
        </Link>
      </div>
    </main>
  );
}
