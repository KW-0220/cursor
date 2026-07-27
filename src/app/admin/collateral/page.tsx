"use client";

import { useEffect, useState } from "react";
import { Card, SectionHeader, StateBanner } from "@/components/ui/layout";
import {
  analyzeCollateral,
  displayTitle,
  itemCompleteness,
  lightLabel,
  loadCollateralItems,
  preliminaryNetValue,
  type CollateralItem,
} from "@/lib/collateral";
import { formatHKD } from "@/lib/utils";

/** C18 後台抵押品審批摘要（讀取客戶端示範資料；正式環境接案件 API） */
export default function AdminCollateralPage() {
  const [items, setItems] = useState<CollateralItem[]>([]);

  useEffect(() => {
    setItems(loadCollateralItems("anon"));
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-navy-900">抵押品審批摘要</h1>
        <p className="mt-1 text-sm text-text-secondary">
          C18 · 文件完整度、初步淨值、三色燈、正式估值狀態（示範讀取本機
          anon 資料）
        </p>
      </div>

      <StateBanner
        tone="warning"
        title="AI 不直接拒絕"
        description="紅燈只代表需要進一步審批。正式可接受抵押價值以指定估值及貸款機構為準。"
      />

      <SectionHeader title={`案件抵押品（${items.length}）`} />
      {items.length === 0 ? (
        <Card className="text-sm text-text-muted">
          尚未有本機抵押品示範資料。請於申請流程選擇「有抵押貸款」新增後重新整理。
        </Card>
      ) : (
        <div className="space-y-4">
          {items.map((item) => {
            const a = analyzeCollateral(item);
            const c = itemCompleteness(item);
            return (
              <Card key={item.id} className="space-y-2 text-sm">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-xs text-text-muted">{item.subtype}</p>
                    <p className="font-semibold text-navy-900">
                      {displayTitle(item)}
                    </p>
                    <p className="text-xs text-text-muted">{item.id}</p>
                  </div>
                  <span className="rounded-full bg-surface-2 px-2 py-0.5 text-xs">
                    {lightLabel(a.light)}
                  </span>
                </div>
                <dl className="grid gap-1 text-xs text-text-secondary sm:grid-cols-2">
                  <div>業權／持有人：{a.ownerOrHolder}</div>
                  <div>申報價值：{formatHKD(a.declaredValue)}</div>
                  <div>現有融資：{formatHKD(a.existingCharge)}</div>
                  <div>初步淨值：{formatHKD(preliminaryNetValue(item))}</div>
                  <div>
                    文件：{c.done}／{c.total}
                  </div>
                  <div>信心度：{a.confidence}</div>
                  <div>正式估值：尚未完成</div>
                  <div>押記：{a.chargeStatus}</div>
                </dl>
                <ul className="list-inside list-disc text-xs text-text-secondary">
                  {a.risks.map((r) => (
                    <li key={r}>{r}</li>
                  ))}
                </ul>
              </Card>
            );
          })}
        </div>
      )}

      <SectionHeader title="正式估值狀態（C20 佔位）" />
      <Card className="text-sm text-text-secondary">
        <p>狀態：待安排指定估值服務商</p>
        <p className="mt-1 text-xs text-text-muted">
          估值結果、估值日期、估值公司、認可 LTN／LTV
          將於接駁後台後顯示於此。
        </p>
      </Card>
    </div>
  );
}
