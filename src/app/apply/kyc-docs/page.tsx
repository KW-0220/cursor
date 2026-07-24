"use client";

import { useState } from "react";
import Link from "next/link";
import { MobileShell } from "@/components/app/mobile-shell";
import { Button } from "@/components/ui/button";
import {
  Card,
  Disclaimer,
  PageHeader,
  SectionHeader,
  StateBanner,
} from "@/components/ui/layout";
import { DocStatusTag } from "@/components/ui/status";
import type { DocumentStatus } from "@/lib/types";

type Slot = {
  key: string;
  title: string;
  hint: string;
  status: DocumentStatus;
};

export default function KycDocsPage() {
  const [slots, setSlots] = useState<Slot[]>([
    {
      key: "id_front",
      title: "身份證正面副本",
      hint: "清晰、完整、無反光",
      status: "pending",
    },
    {
      key: "id_back",
      title: "身份證反面副本",
      hint: "需與正面同一證件",
      status: "pending",
    },
    {
      key: "addr_1",
      title: "住址證明｜最近第 1 個月",
      hint: "水電煤／銀行／政府信件",
      status: "pending",
    },
    {
      key: "addr_2",
      title: "住址證明｜最近第 2 個月",
      hint: "需顯示姓名及地址",
      status: "pending",
    },
    {
      key: "addr_3",
      title: "住址證明｜最近第 3 個月",
      hint: "三個月需連續",
      status: "pending",
    },
  ]);

  function markUploaded(key: string) {
    setSlots((list) =>
      list.map((s) =>
        s.key === key ? { ...s, status: "completed" as DocumentStatus } : s,
      ),
    );
  }

  const ready = slots.every((s) => s.status === "completed");

  return (
    <MobileShell>
      <PageHeader
        title="身分及住址證明"
        subtitle="AI 資料收集｜身份證正反面 + 近 3 個月住址證明"
        backHref="/apply"
      />
      <main className="space-y-4 px-4 py-5 pb-28">
        <StateBanner
          tone="info"
          title="AI 只負責收集及檢查文件完整性"
          description="不會根據這些文件直接批出或拒絕貸款。資料交由顧問預審及 Lead 轉介。"
        />
        <SectionHeader title="必須上載" />
        {slots.map((slot) => (
          <Card key={slot.key}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-medium text-navy-900">{slot.title}</p>
                <p className="mt-1 text-xs text-text-muted">{slot.hint}</p>
              </div>
              <DocStatusTag status={slot.status} />
            </div>
            <div className="mt-3 flex gap-2">
              <Button size="sm" variant="outline" onClick={() => markUploaded(slot.key)}>
                上載／拍照
              </Button>
              <Button size="sm" variant="ghost">
                重新上載
              </Button>
            </div>
          </Card>
        ))}
        <Disclaimer>
          敏感資料會預設遮罩顯示。AI 為文件分析引擎，非正式批核系統。
        </Disclaimer>
      </main>
      <div className="fixed inset-x-0 bottom-0 mx-auto max-w-[430px] border-t border-border bg-surface-1 p-4">
        <Link href={ready ? "/apply/company-docs" : "#"}>
          <Button fullWidth size="lg" disabled={!ready}>
            儲存並繼續：公司登記文件
          </Button>
        </Link>
      </div>
    </MobileShell>
  );
}
