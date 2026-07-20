"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { MobileShell } from "@/components/app/mobile-shell";
import { DocumentAnalyzeForm } from "@/components/app/document-analyze-form";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import {
  Card,
  Disclaimer,
  PageHeader,
  ProgressBar,
  SectionHeader,
  StateBanner,
} from "@/components/ui/layout";
import { DocStatusTag } from "@/components/ui/status";
import {
  checklistIssues,
  checklistOk,
  documentRequirements,
  financialYears,
  bankMonths,
} from "@/lib/mock-data";
import { formatHKD } from "@/lib/utils";
import type { LoanType } from "@/lib/types";

const steps = [
  "貸款類型",
  "金額用途",
  "細節",
  "文件",
  "OCR 確認",
  "摘要",
  "聲明",
  "完成",
];

const quickAmounts = [500000, 1000000, 3000000, 5000000];

export default function ApplyWizardPage() {
  const [step, setStep] = useState(0);
  const [loanType, setLoanType] = useState<LoanType | null>(null);
  const [amount, setAmount] = useState(1500000);
  const [purpose, setPurpose] = useState("營運資金");
  const [consents, setConsents] = useState<Record<string, boolean>>({});

  const progress = ((step + 1) / steps.length) * 100;
  const docs = loanType ? documentRequirements[loanType] : [];

  const consentItems = useMemo(
    () => [
      "本人確認所提交資料真實及完整",
      "本人獲授權代表公司提交申請",
      "同意平台處理及分析所上載的商業及財務資料",
      "同意平台按申請需要將資料提供予指定合作機構",
      "明白 AI 分析只供初步評估，並非正式貸款批核",
      "已閱讀私隱政策及使用條款",
    ],
    [],
  );

  const next = () => setStep((s) => Math.min(steps.length - 1, s + 1));
  const back = () => setStep((s) => Math.max(0, s - 1));

  return (
    <MobileShell>
      <PageHeader
        title="貸款申請"
        subtitle={`步驟 ${step + 1}／${steps.length}｜${steps[step]}`}
        backHref={step === 0 ? "/app" : undefined}
      />
      <div className="px-4 pt-3">
        <ProgressBar value={progress} />
      </div>

      <main className="space-y-4 px-4 py-5 pb-28">
        {step === 0 && (
          <>
            <SectionHeader
              title="選擇貸款類型"
              subtitle="以兩張大型選擇卡展示"
            />
            {(
              [
                {
                  type: "secured" as const,
                  title: "有抵押貸款",
                  fit: [
                    "持有香港住宅、商舖、寫字樓或工廈",
                    "希望申請較高貸款額",
                    "可接受以物業作抵押",
                  ],
                  docs: "需準備抵押物業資料、三年審計、六個月結單、營運簡介",
                },
                {
                  type: "unsecured" as const,
                  title: "無抵押貸款",
                  fit: [
                    "沒有物業作抵押",
                    "主要依靠公司營運及現金流",
                    "希望申請營運資金",
                  ],
                  docs: "需準備三年審計、六個月結單、現有銀行授信信",
                },
              ] as const
            ).map((card) => (
              <button
                key={card.type}
                onClick={() => setLoanType(card.type)}
                className={`w-full rounded-2xl border p-4 text-left transition ${
                  loanType === card.type
                    ? "border-teal-500 bg-teal-100/40 ring-2 ring-teal-100"
                    : "border-border bg-surface-1"
                }`}
              >
                <h3 className="text-lg font-semibold text-navy-900">
                  {card.title}
                </h3>
                <p className="mt-2 text-xs font-medium text-text-muted">適合</p>
                <ul className="mt-1 space-y-1 text-sm text-text-secondary">
                  {card.fit.map((f) => (
                    <li key={f}>· {f}</li>
                  ))}
                </ul>
                <p className="mt-3 text-xs text-text-muted">{card.docs}</p>
              </button>
            ))}
          </>
        )}

        {step === 1 && (
          <>
            <SectionHeader title="貸款金額及用途" />
            <Field label="希望申請金額（HKD）" required>
              <Input
                type="number"
                className="tabular"
                value={amount}
                onChange={(e) => setAmount(Number(e.target.value))}
              />
            </Field>
            <div className="flex flex-wrap gap-2">
              {quickAmounts.map((a) => (
                <button
                  key={a}
                  onClick={() => setAmount(a)}
                  className={`rounded-full px-3 py-1.5 text-xs font-medium ${
                    amount === a
                      ? "bg-navy-900 text-white"
                      : "bg-surface-2 text-text-secondary"
                  }`}
                >
                  {formatHKD(a)}
                </button>
              ))}
            </div>
            <Field label="貸款用途" required>
              <Select
                value={purpose}
                onChange={(e) => setPurpose(e.target.value)}
              >
                <option>營運資金</option>
                <option>出糧／支付供應商</option>
                <option>購買貨物</option>
                <option>公司擴充</option>
                <option>購買商業物業</option>
                <option>現有貸款再融資</option>
                <option>其他用途</option>
              </Select>
            </Field>
            <Field label="希望還款年期" required>
              <Select defaultValue="3">
                <option value="1">1 年</option>
                <option value="2">2 年</option>
                <option value="3">3 年</option>
                <option value="5">5 年</option>
                <option value="10">10 年</option>
              </Select>
            </Field>
            <Field label="希望何時取得資金">
              <Input type="date" />
            </Field>
            <Field label="是否已有目標銀行" hint="選填">
              <Input placeholder="例如：某銀行商業貸款部" />
            </Field>
            <Field label="其他補充資料">
              <Textarea placeholder="可補充業務季節性、近期訂單等" />
            </Field>
            <Disclaimer>
              此階段不會顯示「保證批核」或「即時批出」等字眼。AI
              結果只屬初步評估。
            </Disclaimer>
          </>
        )}

        {step === 2 && loanType === "secured" && (
          <>
            <SectionHeader title="抵押物業資料" subtitle="P10A" />
            <Field label="物業類型" required>
              <Select defaultValue="寫字樓">
                <option>住宅</option>
                <option>商舖</option>
                <option>寫字樓</option>
                <option>工廈</option>
                <option>其他</option>
              </Select>
            </Field>
            <Field label="物業地址" required>
              <Input defaultValue="九龍觀塘開源道 72 號宏利金融中心 8 樓" />
            </Field>
            <Field label="物業業權人" required>
              <Input defaultValue="智創科技有限公司" />
            </Field>
            <Field label="公司／個人持有" required>
              <Select defaultValue="公司">
                <option>公司</option>
                <option>個人</option>
              </Select>
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="估計市值" required>
                <Input type="number" defaultValue={9800000} className="tabular" />
              </Field>
              <Field label="現時貸款餘額" required>
                <Input type="number" defaultValue={4200000} className="tabular" />
              </Field>
            </div>
            <Card className="bg-surface-2">
              <p className="text-xs text-text-muted">估計物業淨值</p>
              <p className="mt-1 text-xl font-semibold tabular text-navy-900">
                {formatHKD(5600000)}
              </p>
              <p className="mt-2 text-xs text-text-secondary">
                估計市值 − 現有貸款餘額。不顯示「最高可借金額」為確定結果。
              </p>
            </Card>
          </>
        )}

        {step === 2 && loanType === "unsecured" && (
          <>
            <SectionHeader title="現有貸款情況" subtitle="P10B｜可新增多項" />
            <Field label="現時是否有銀行貸款" required>
              <Select defaultValue="是">
                <option>是</option>
                <option>否</option>
              </Select>
            </Field>
            <Card>
              <p className="text-sm font-semibold text-navy-900">貸款 #1</p>
              <div className="mt-3 space-y-3">
                <Field label="貸款機構" required>
                  <Input defaultValue="香港某銀行" />
                </Field>
                <Field label="貸款類型" required>
                  <Input defaultValue="營運貸款" />
                </Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="獲批額度">
                    <Input type="number" defaultValue={1000000} />
                  </Field>
                  <Field label="未償還金額">
                    <Input type="number" defaultValue={620000} />
                  </Field>
                </div>
                <Field label="是否曾經逾期">
                  <Select defaultValue="否">
                    <option>否</option>
                    <option>是</option>
                  </Select>
                </Field>
              </div>
            </Card>
            <Button variant="outline" fullWidth>
              ＋ 新增另一項現有貸款
            </Button>
          </>
        )}

        {step === 3 && (
          <>
            <SectionHeader title="文件上載及 AI 分析" subtitle="P12–P13 · AI" />
            <StateBanner
              tone="info"
              title="上載方式"
              description="從檔案選擇、拍照、相簿，或貼上文字。系統會讀取內容並做初步資格評估。"
            />
            <div className="space-y-3">
              {docs.map((doc) => (
                <Card key={doc.name}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-navy-900">{doc.name}</p>
                      <p className="mt-1 text-xs text-text-muted">
                        {doc.requirement}
                      </p>
                    </div>
                    <DocStatusTag status={doc.status} />
                  </div>
                </Card>
              ))}
            </div>
            <DocumentAnalyzeForm
              defaultLoanType={loanType ?? "unsecured"}
              defaultAmount={amount}
              defaultPurpose={purpose}
              showInternalTrafficLight={false}
            />
            <Card>
              <p className="font-semibold text-navy-900">示範完整性清單（mock）</p>
              <ul className="mt-3 space-y-2 text-sm">
                {checklistOk.map((item) => (
                  <li key={item} className="text-success-600">
                    ✓ {item}
                  </li>
                ))}
                {checklistIssues.map((item) => (
                  <li key={item} className="text-warning-600">
                    ! {item}
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-xs text-text-secondary">
                系統未能確認此項資料，請由申請人或貸款顧問覆核。不可將低信心
                OCR 結果當作確定資料。
              </p>
            </Card>
          </>
        )}

        {step === 4 && (
          <>
            <SectionHeader title="OCR 資料確認" subtitle="P14｜保留修改審計" />
            <Card>
              <p className="font-semibold text-navy-900">審計報告（按年度）</p>
              <div className="mt-3 space-y-3">
                {financialYears.map((y) => (
                  <div
                    key={y.year}
                    className="rounded-xl bg-surface-2 p-3 text-sm"
                  >
                    <div className="flex justify-between">
                      <span className="font-medium">{y.year}</span>
                      <span className="text-xs text-text-muted">
                        信心度 {(y.confidence * 100).toFixed(0)}% · p.
                        {y.sourcePage}
                      </span>
                    </div>
                    <div className="mt-2 grid grid-cols-2 gap-2 tabular text-xs text-text-secondary">
                      <span>營業額 {formatHKD(y.revenue)}</span>
                      <span>毛利 {formatHKD(y.grossProfit)}</span>
                      <span>淨利潤 {formatHKD(y.netProfit)}</span>
                      <span>股東權益 {formatHKD(y.equity)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
            <Card>
              <p className="font-semibold text-navy-900">銀行結單（按月）</p>
              <div className="mt-3 space-y-2">
                {bankMonths.map((m) => (
                  <div
                    key={m.month}
                    className="flex items-center justify-between rounded-xl bg-surface-2 px-3 py-2 text-xs"
                  >
                    <span className="font-medium">{m.month}</span>
                    <span className="tabular text-text-secondary">
                      入數 {formatHKD(m.totalInflow)}
                    </span>
                  </div>
                ))}
              </div>
              <div className="mt-3 flex gap-2">
                <Button size="sm">確認資料</Button>
                <Button size="sm" variant="outline">
                  修改
                </Button>
                <Button size="sm" variant="ghost">
                  提交人工覆核
                </Button>
              </div>
            </Card>
          </>
        )}

        {step === 5 && (
          <>
            <SectionHeader title="申請摘要" subtitle="P15｜不含內部紅燈" />
            {[
              ["公司資料", "智創科技有限公司 · BR 12345678"],
              [
                "貸款需要",
                `${loanType === "secured" ? "有抵押" : "無抵押"} · ${formatHKD(amount)} · ${purpose}`,
              ],
              [
                "抵押物／現有貸款",
                loanType === "secured"
                  ? "寫字樓 · 估計淨值 HKD 5,600,000"
                  : "現有銀行貸款 2 項",
              ],
              ["文件完成狀態", "78% · 有 1 項待確認"],
              [
                "AI 提取財務摘要",
                "三年營業額上升；近六月平均入數約 HKD 1.51M",
              ],
            ].map(([title, body]) => (
              <Card key={title}>
                <p className="text-xs text-text-muted">{title}</p>
                <p className="mt-1 text-sm font-medium text-navy-900">{body}</p>
              </Card>
            ))}
            <Disclaimer>
              提交前不會向客戶顯示內部三色燈或「高違約風險」等判斷，避免誤解。
            </Disclaimer>
          </>
        )}

        {step === 6 && (
          <>
            <SectionHeader
              title="聲明及授權"
              subtitle="P16｜每項可展開，不可一鍵全勾"
            />
            <div className="space-y-3">
              {consentItems.map((item) => (
                <label
                  key={item}
                  className="flex items-start gap-3 rounded-2xl border border-border bg-surface-1 p-3"
                >
                  <input
                    type="checkbox"
                    className="mt-1 size-4 accent-teal-600"
                    checked={!!consents[item]}
                    onChange={(e) =>
                      setConsents((c) => ({ ...c, [item]: e.target.checked }))
                    }
                  />
                  <span className="text-sm text-text-primary">
                    {item}
                    <button
                      type="button"
                      className="ml-2 text-xs text-teal-600 underline"
                    >
                      查看詳情
                    </button>
                  </span>
                </label>
              ))}
            </div>
          </>
        )}

        {step === 7 && (
          <div className="py-8 text-center">
            <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-success-100 text-2xl text-success-600">
              ✓
            </div>
            <h2 className="mt-4 text-xl font-bold text-navy-900">提交成功</h2>
            <p className="mt-2 text-sm text-text-secondary">
              申請編號 SLF-2026-00499
            </p>
            <p className="mt-1 text-xs text-text-muted">
              2026-07-18 04:30 · 預計下一步：文件檢查
            </p>
            <p className="mx-auto mt-4 max-w-sm text-sm leading-relaxed text-text-secondary">
              請繼續填寫現有債務申報及資格聲明，系統其後會計算 EBITDA／DSCR
              並核對十項政策。
            </p>
            <Link href="/apply/debts" className="mt-6 block">
              <Button fullWidth size="lg">
                繼續：債務申報及政策審批
              </Button>
            </Link>
          </div>
        )}
      </main>

      {step < 7 && (
        <div className="fixed inset-x-0 bottom-0 mx-auto max-w-[430px] border-t border-border bg-surface-1 p-4">
          <div className="flex gap-2">
            {step > 0 && (
              <Button variant="outline" className="flex-1" onClick={back}>
                上一步
              </Button>
            )}
            {step === 6 ? (
              <Link
                href="/apply/debts"
                className="flex-1"
                onClick={(e) => {
                  if (consentItems.some((item) => !consents[item])) {
                    e.preventDefault();
                  }
                }}
              >
                <Button
                  className="w-full"
                  disabled={consentItems.some((item) => !consents[item])}
                >
                  下一步：債務申報
                </Button>
              </Link>
            ) : (
              <Button
                className="flex-1"
                disabled={step === 0 && !loanType}
                onClick={next}
              >
                下一步
              </Button>
            )}
          </div>
        </div>
      )}
    </MobileShell>
  );
}
