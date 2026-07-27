import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, Disclaimer, SectionHeader } from "@/components/ui/layout";

function PurposeBlock({
  title,
  collected,
  purposes,
  callout,
}: {
  title: string;
  collected: string[];
  purposes: string[];
  callout?: { title: string; body: string };
}) {
  return (
    <Card className="space-y-3">
      <h2 className="text-base font-semibold text-navy-900">{title}</h2>
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">
          收集資料
        </p>
        <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-text-secondary">
          {collected.map((x) => (
            <li key={x}>{x}</li>
          ))}
        </ul>
      </div>
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">
          使用目的
        </p>
        <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-text-secondary">
          {purposes.map((x) => (
            <li key={x}>{x}</li>
          ))}
        </ul>
      </div>
      {callout && (
        <div className="rounded-xl border border-teal-200 bg-teal-50/60 px-3 py-2 text-sm text-navy-900">
          <p className="font-medium">{callout.title}</p>
          <p className="mt-1 text-text-secondary">{callout.body}</p>
        </div>
      )}
    </Card>
  );
}

export default function DataUsePage() {
  return (
    <main className="px-4 py-5 pb-28">
      <Link
        href="/app/account"
        className="text-sm text-teal-700 hover:underline"
      >
        ← 返回我的帳戶
      </Link>
      <h1 className="mt-3 text-xl font-bold text-navy-900">
        我們將如何使用你的資料
      </h1>
      <p className="mt-2 text-sm leading-relaxed text-text-secondary">
        為協助處理貸款申請、分析公司現金流及進行初步資格評估，SME LoanFlow
        需要收集及分析你所提交的公司、銀行及身份資料。請在繼續前了解每類資料的使用目的。
      </p>

      <SectionHeader title="1. 公司資料用途" />
      <PurposeBlock
        title="公司及登記文件"
        collected={[
          "公司名稱",
          "商業登記號碼",
          "公司註冊編號",
          "公司地址",
          "業務性質",
          "董事及股東資料",
          "公司成立及周年申報資料",
        ]}
        purposes={[
          "確認申請公司的身份",
          "核對申請資料與 BR、NAR1 是否一致",
          "確認申請人是否有權代表公司申請",
          "建立公司、董事、股東及擔保人資料",
          "檢查文件是否完整及有效",
          "支援貸款初步資格評估及人工審核",
        ]}
      />

      <SectionHeader title="2. 銀行月結單用途" />
      <PurposeBlock
        title="銀行戶口及交易"
        collected={[
          "銀行名稱",
          "戶口持有人",
          "戶口號碼",
          "交易日期",
          "入帳及出帳金額",
          "交易描述",
          "戶口結餘",
          "透支資料",
          "退票及扣款失敗紀錄",
        ]}
        purposes={[
          "計算每日平均餘額",
          "分析每月進帳金額及頻率",
          "分析主要進帳來源",
          "評估現金流穩定性",
          "識別退票、Autopay 失敗及透支異常",
          "支援初步還款能力及貸款資格評估",
          "讓貸款顧問覆核相關交易及風險",
        ]}
        callout={{
          title: "必須顯示",
          body: "系統可能利用 AI 讀取及分類銀行交易，但 AI 未能確認的交易不會自動視為營業收入，並可能需要由你或貸款顧問進一步確認。",
        }}
      />

      <SectionHeader title="3. 身份證明文件用途" />
      <PurposeBlock
        title="董事／股東／擔保人身份"
        collected={[
          "姓名",
          "身份證或護照號碼",
          "出生日期，如文件有列出",
          "證件有效日期",
          "證件相片",
          "國籍或簽發地，如文件有列出",
        ]}
        purposes={[
          "核對董事、股東及個人擔保人身份",
          "對照 NAR1 所列人士",
          "支援客戶身份識別及 KYC 流程",
          "符合合作貸款機構的身份驗證要求",
          "防止冒認及未經授權申請",
        ]}
        callout={{
          title: "重要提示",
          body: "SME LoanFlow 的 AI 文件分析只會協助讀取及比對資料，不代表已完成正式身份真偽驗證。正式 KYC 可能由指定身份驗證服務或合作貸款機構另外進行。",
        }}
      />

      <SectionHeader title="4. 其他補充文件用途" />
      <PurposeBlock
        title="財務及營運補件"
        collected={[
          "Audited Report",
          "管理帳目",
          "稅務文件",
          "現有貸款還款表",
          "授信信",
          "銷售合約",
          "訂單",
          "發票",
        ]}
        purposes={[
          "補充公司財務及營運資料",
          "計算 EBITDA、DSCR、Gearing Ratio 等指標",
          "核對現有債務",
          "支援正式信貸審批",
          "回應貸款顧問或金融機構的補件要求",
        ]}
      />

      <SectionHeader title="5. 有抵押貸款｜抵押品資料用途" />
      <PurposeBlock
        title="抵押品資料及文件"
        collected={[
          "物業業權證明（樓契／查冊）",
          "現有按揭合約及還款月結",
          "差餉、地租、管理費等開支文件",
          "租約及租金收入證明",
          "車輛／設備／定期存款／證券相關證明",
        ]}
        purposes={[
          "核對資產業權",
          "估算未償還負債",
          "分析初步抵押價值及質押空間",
          "安排正式估值",
          "支援有抵押貸款審批",
        ]}
        callout={{
          title: "必須另行授權的第三方",
          body: "銀行或貸款機構、土地註冊處查冊服務商、物業／車輛／設備估值服務商、證券或資產核實服務商、法律及合規服務商。分享前須顯示接收機構、目的、抵押品文件範圍及是否包括身份／銀行月結。",
        }}
      />

      <SectionHeader title="6. AI 處理說明" />
      <Card className="space-y-3">
        <p className="text-sm text-text-secondary">
          系統可能利用 AI 執行：文件分類；OCR
          文字及數據提取；公司及人士資料核對；銀行交易分類；現金流及每日平均餘額計算；異常交易識別；初步信貸政策核對；生成財務及申請摘要。
        </p>
        <div className="rounded-xl border border-border bg-surface-2 px-3 py-2 text-sm text-navy-900">
          AI
          分析結果只供資料整理及初步評估使用，可能存在識別錯誤或資料不足。所有重要結果均可能由貸款顧問、信貸審批人員或合作貸款機構進一步覆核。AI
          不會單獨作出最終貸款批核決定。
        </div>
      </Card>

      <Disclaimer>
        請同時完成「資料用途分項同意」。向銀行或其他服務商分享資料時，須另行個案授權。
      </Disclaimer>

      <div className="mt-4 space-y-2">
        <Link href="/app/account/consents">
          <Button fullWidth>前往分項同意</Button>
        </Link>
        <Link href="/app/account">
          <Button fullWidth variant="outline">
            返回帳戶
          </Button>
        </Link>
      </div>
    </main>
  );
}
