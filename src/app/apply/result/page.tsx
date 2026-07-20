import Link from "next/link";
import { MobileShell } from "@/components/app/mobile-shell";
import { Button } from "@/components/ui/button";
import {
  Card,
  Disclaimer,
  PageHeader,
  StateBanner,
} from "@/components/ui/layout";
import { getDemoPolicyEvaluation } from "@/lib/policy-mock";

export default function ResultPage() {
  const evaluation = getDemoPolicyEvaluation();
  const tone =
    evaluation.clientFacing === "pass_review"
      ? "success"
      : evaluation.clientFacing === "need_supplement"
        ? "warning"
        : "info";
  const title =
    evaluation.clientFacing === "pass_review"
      ? "初步資料符合要求"
      : evaluation.clientFacing === "need_supplement"
        ? "需要補充資料"
        : "需要人工覆核";

  return (
    <MobileShell>
      <PageHeader title="初步評估結果" subtitle="P17B｜客戶端" backHref="/app" />
      <main className="space-y-4 px-4 py-5">
        <StateBanner
          tone={tone}
          title={title}
          description={evaluation.clientMessage}
        />
        <Card>
          <p className="text-xs text-text-muted">申請編號</p>
          <p className="mt-1 font-semibold text-navy-900">SLF-2026-00499</p>
          <p className="mt-3 text-sm text-text-secondary">
            內部已產生十項政策核對及財務摘要，供顧問覆核。客戶端不顯示完整紅綠燈或「高風險」字眼。
          </p>
        </Card>
        <div className="flex flex-col gap-2">
          {evaluation.clientFacing === "need_supplement" ? (
            <Link href="/app/supplements">
              <Button fullWidth>查看需要補交的資料</Button>
            </Link>
          ) : (
            <Link href="/app/applications/SLF-2026-00482">
              <Button fullWidth>查看申請進度</Button>
            </Link>
          )}
          <Link href="/app/account">
            <Button fullWidth variant="outline">
              聯絡貸款顧問
            </Button>
          </Link>
          <Link href="/admin/policy/SLF-2026-00482">
            <Button fullWidth variant="ghost">
              （示範）開啟內部政策核對頁
            </Button>
          </Link>
        </div>
        <Disclaimer>
          此建議只供初步參考，實際貸款條件及批核結果由相關貸款機構決定。
        </Disclaimer>
      </main>
    </MobileShell>
  );
}
