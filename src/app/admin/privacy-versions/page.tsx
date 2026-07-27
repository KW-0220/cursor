import { Card, SectionHeader } from "@/components/ui/layout";
import {
  AUTH_VERSION_CHANGES,
  PRIVACY_POLICY_VERSION,
  THIRD_PARTY_AUTH_POLICY_VERSION,
} from "@/lib/third-party-share";

export default function PrivacyVersionsAdminPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-navy-900">授權版本管理</h1>
        <p className="mt-1 text-sm text-text-secondary">
          A03 · 重大改動須重新取得同意；舊授權不可自動套用新用途
        </p>
      </div>
      <SectionHeader title="現行版本" />
      <Card className="space-y-1 text-sm">
        <p>
          分享授權條款：
          <span className="font-semibold text-navy-900">
            {THIRD_PARTY_AUTH_POLICY_VERSION}
          </span>
        </p>
        <p>
          私隱政策：
          <span className="font-semibold text-navy-900">
            {PRIVACY_POLICY_VERSION}
          </span>
        </p>
      </Card>
      <SectionHeader title="版本變更紀錄" />
      <div className="space-y-3">
        {AUTH_VERSION_CHANGES.map((v) => (
          <Card key={v.version}>
            <p className="text-sm font-semibold text-navy-900">{v.version}</p>
            <ul className="mt-2 list-inside list-disc text-sm text-text-secondary">
              {v.changes.map((c) => (
                <li key={c}>{c}</li>
              ))}
            </ul>
          </Card>
        ))}
      </div>
      <p className="text-xs text-text-muted">
        觸發重新確認的例子：新增資料用途、新增第三方類別、新增分享資料種類、身份文件新驗證用途、銀行交易新分析目的、私隱政策重大修改。
      </p>
    </div>
  );
}
