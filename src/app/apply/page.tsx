"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { MobileShell } from "@/components/app/mobile-shell";
import {
  ApplyDocumentsUpload,
  applyDocsProgress,
  emptyApplyDocs,
  isApplyDocsComplete,
  lastSixBankMonths,
  summarizeApplyDocs,
  type ApplyDocsState,
} from "@/components/app/apply-documents-upload";
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
import { formatHKD } from "@/lib/utils";
import type { LoanType } from "@/lib/types";

const steps = [
  "貸款類型",
  "金額用途",
  "細節",
  "文件",
  "文件確認",
  "摘要",
  "聲明",
  "完成",
];

const quickAmounts = [500000, 1000000, 3000000, 5000000];
const BANK_MONTHS = lastSixBankMonths();

export default function ApplyWizardPage() {
  const [step, setStep] = useState(0);
  const [loanType, setLoanType] = useState<LoanType | null>(null);
  const [amount, setAmount] = useState(1500000);
  const [purpose, setPurpose] = useState("營運資金");
  const [hasExistingLoan, setHasExistingLoan] = useState(false);
  const [lender, setLender] = useState("");
  const [debtType, setDebtType] = useState("營運貸款");
  const [facility, setFacility] = useState("");
  const [outstanding, setOutstanding] = useState("");
  const [propertyType, setPropertyType] = useState("寫字樓");
  const [propertyAddress, setPropertyAddress] = useState("");
  const [propertyOwner, setPropertyOwner] = useState("");
  const [propertyHolder, setPropertyHolder] = useState("公司");
  const [propertyValue, setPropertyValue] = useState("");
  const [propertyMortgage, setPropertyMortgage] = useState("");
  const [docs, setDocs] = useState<ApplyDocsState>(() =>
    emptyApplyDocs(BANK_MONTHS),
  );
  const [consents, setConsents] = useState<Record<string, boolean>>({});
  const [applicationId, setApplicationId] = useState<string | null>(null);
  const [submittedAt, setSubmittedAt] = useState<string | null>(null);

  const progress = ((step + 1) / steps.length) * 100;
  const docsComplete = isApplyDocsComplete(docs, BANK_MONTHS);
  const docsSummary = useMemo(
    () => summarizeApplyDocs(docs, BANK_MONTHS),
    [docs],
  );
  const docsPct = useMemo(() => {
    const p = applyDocsProgress(docs, BANK_MONTHS);
    return Math.round((p.done / p.total) * 100);
  }, [docs]);

  const propertyEquity = useMemo(() => {
    const v = Number(propertyValue) || 0;
    const m = Number(propertyMortgage) || 0;
    return Math.max(0, v - m);
  }, [propertyValue, propertyMortgage]);

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

  const allConsented = consentItems.every((item) => consents[item]);

  const next = () => setStep((s) => Math.min(steps.length - 1, s + 1));
  const back = () => setStep((s) => Math.max(0, s - 1));

  function submitApplication() {
    if (!allConsented) return;
    const id = `SLF-${new Date().getFullYear()}-${String(Date.now()).slice(-5)}`;
    const at = new Date().toISOString();
    setApplicationId(id);
    setSubmittedAt(new Date().toLocaleString("zh-HK", { hour12: false }));
    try {
      const prev = JSON.parse(
        sessionStorage.getItem("slf_applications") || "[]",
      ) as unknown[];
      const record = {
        id,
        loanType,
        amount,
        purpose,
        hasExistingLoan,
        docsPct,
        bankCount: docsSummary.bankCount,
        status: "submitted" as const,
        createdAt: at,
        updatedAt: at,
      };
      sessionStorage.setItem(
        "slf_applications",
        JSON.stringify([record, ...prev]),
      );
    } catch {
      // ignore
    }
    setStep(7);
  }

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
            <SectionHeader title="選擇貸款類型" />
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
                  docs: "必須：BR、NAR1、六個月銀行月結單 PDF、董事／股東／擔保人身份證明，以及抵押物業資料",
                },
                {
                  type: "unsecured" as const,
                  title: "無抵押貸款",
                  fit: [
                    "沒有物業作抵押",
                    "主要依靠公司營運及現金流",
                    "希望申請營運資金",
                  ],
                  docs: "必須：BR、NAR1、六個月銀行月結單 PDF、董事／股東／擔保人身份證明",
                },
              ] as const
            ).map((card) => (
              <button
                key={card.type}
                type="button"
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
                  type="button"
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
            <SectionHeader title="抵押物業資料" />
            <Field label="物業類型" required>
              <Select
                value={propertyType}
                onChange={(e) => setPropertyType(e.target.value)}
              >
                <option>住宅</option>
                <option>商舖</option>
                <option>寫字樓</option>
                <option>工廈</option>
                <option>其他</option>
              </Select>
            </Field>
            <Field label="物業地址" required>
              <Input
                value={propertyAddress}
                onChange={(e) => setPropertyAddress(e.target.value)}
                placeholder="請輸入物業地址"
              />
            </Field>
            <Field label="物業業權人" required>
              <Input
                value={propertyOwner}
                onChange={(e) => setPropertyOwner(e.target.value)}
                placeholder="公司或個人名稱"
              />
            </Field>
            <Field label="公司／個人持有" required>
              <Select
                value={propertyHolder}
                onChange={(e) => setPropertyHolder(e.target.value)}
              >
                <option>公司</option>
                <option>個人</option>
              </Select>
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="估計市值（HKD）" required>
                <Input
                  type="number"
                  className="tabular"
                  value={propertyValue}
                  onChange={(e) => setPropertyValue(e.target.value)}
                  placeholder="0"
                />
              </Field>
              <Field label="現時貸款餘額（HKD）" required>
                <Input
                  type="number"
                  className="tabular"
                  value={propertyMortgage}
                  onChange={(e) => setPropertyMortgage(e.target.value)}
                  placeholder="0"
                />
              </Field>
            </div>
            <Card className="bg-surface-2">
              <p className="text-xs text-text-muted">估計物業淨值</p>
              <p className="mt-1 text-xl font-semibold tabular text-navy-900">
                {formatHKD(propertyEquity)}
              </p>
              <p className="mt-2 text-xs text-text-secondary">
                估計市值 − 現有貸款餘額。不顯示「最高可借金額」為確定結果。
              </p>
            </Card>
          </>
        )}

        {step === 2 && loanType === "unsecured" && (
          <>
            <SectionHeader title="現有貸款情況" subtitle="可新增多項" />
            <Field label="現時是否有銀行貸款" required>
              <Select
                value={hasExistingLoan ? "是" : "否"}
                onChange={(e) => setHasExistingLoan(e.target.value === "是")}
              >
                <option>是</option>
                <option>否</option>
              </Select>
            </Field>
            {hasExistingLoan && (
              <>
                <Card>
                  <p className="text-sm font-semibold text-navy-900">貸款 #1</p>
                  <div className="mt-3 space-y-3">
                    <Field label="貸款機構" required>
                      <Input
                        value={lender}
                        onChange={(e) => setLender(e.target.value)}
                        placeholder="例如：香港某銀行"
                      />
                    </Field>
                    <Field label="貸款類型" required>
                      <Input
                        value={debtType}
                        onChange={(e) => setDebtType(e.target.value)}
                        placeholder="營運貸款"
                      />
                    </Field>
                    <div className="grid grid-cols-2 gap-3">
                      <Field label="獲批額度">
                        <Input
                          type="number"
                          value={facility}
                          onChange={(e) => setFacility(e.target.value)}
                          placeholder="0"
                        />
                      </Field>
                      <Field label="未償還金額">
                        <Input
                          type="number"
                          value={outstanding}
                          onChange={(e) => setOutstanding(e.target.value)}
                          placeholder="0"
                        />
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
                <Button variant="outline" fullWidth type="button">
                  ＋ 新增另一項現有貸款
                </Button>
              </>
            )}
          </>
        )}

        {step === 3 && (
          <ApplyDocumentsUpload
            months={BANK_MONTHS}
            docs={docs}
            onChange={setDocs}
          />
        )}

        {step === 4 && (
          <>
            <SectionHeader
              title="確認已上載文件"
              subtitle="請核對檔名；之後可交由系統初步讀取"
            />
            <StateBanner
              tone="info"
              title="本頁不顯示批核結果"
              description="只確認你已提交的檔案。AI 讀取後如有資料不清，會另行要求你確認或補件。"
            />
            <Card>
              <p className="text-xs text-text-muted">商業登記證 BR</p>
              <p className="mt-1 text-sm font-medium text-navy-900">
                {docsSummary.br ?? "—"}
              </p>
            </Card>
            <Card>
              <p className="text-xs text-text-muted">NAR1</p>
              <p className="mt-1 text-sm font-medium text-navy-900">
                {docsSummary.nar1 ?? "—"}
              </p>
            </Card>
            <Card>
              <p className="text-xs text-text-muted">身份證明</p>
              <ul className="mt-1 space-y-1 text-sm font-medium text-navy-900">
                {docsSummary.identity.length === 0 ? (
                  <li>—</li>
                ) : (
                  docsSummary.identity.map((n) => <li key={n}>· {n}</li>)
                )}
              </ul>
            </Card>
            <Card>
              <p className="text-xs text-text-muted">
                銀行月結單（{docsSummary.bankCount}／6）
              </p>
              <ul className="mt-1 space-y-1 text-sm text-navy-900">
                {BANK_MONTHS.map((m) => (
                  <li key={m} className="flex justify-between gap-2">
                    <span className="text-text-secondary">{m}</span>
                    <span className="truncate font-medium">
                      {docs.bank[m]?.name ?? "缺"}
                    </span>
                  </li>
                ))}
              </ul>
            </Card>
            {docsSummary.companyOther.length > 0 && (
              <Card>
                <p className="text-xs text-text-muted">其他公司文件</p>
                <ul className="mt-1 space-y-1 text-sm font-medium text-navy-900">
                  {docsSummary.companyOther.map((n) => (
                    <li key={n}>· {n}</li>
                  ))}
                </ul>
              </Card>
            )}
            <Button
              variant="outline"
              fullWidth
              type="button"
              onClick={() => setStep(3)}
            >
              返回修改文件
            </Button>
          </>
        )}

        {step === 5 && (
          <>
            <SectionHeader title="申請摘要" subtitle="提交前請核對" />
            {[
              [
                "貸款需要",
                `${loanType === "secured" ? "有抵押" : "無抵押"} · ${formatHKD(amount)} · ${purpose}`,
              ],
              [
                "抵押物／現有貸款",
                loanType === "secured"
                  ? `${propertyType}${propertyAddress ? ` · ${propertyAddress}` : ""} · 估計淨值 ${formatHKD(propertyEquity)}`
                  : hasExistingLoan
                    ? `已申報現有銀行貸款${lender ? `（${lender}）` : ""}`
                    : "沒有現有銀行貸款",
              ],
              [
                "文件完成狀態",
                `${docsPct}% · BR／NAR1／身份／銀行月結單 ${docsSummary.bankCount}/6`,
              ],
            ].map(([title, body]) => (
              <Card key={title}>
                <p className="text-xs text-text-muted">{title}</p>
                <p className="mt-1 text-sm font-medium text-navy-900">{body}</p>
              </Card>
            ))}
            <Disclaimer>
              提交前不會向客戶顯示內部評分或「保證批核」等字眼，避免誤解。
            </Disclaimer>
          </>
        )}

        {step === 6 && (
          <>
            <SectionHeader
              title="聲明及授權"
              subtitle="每項須分別確認，不可一鍵全勾"
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
                  <span className="text-sm text-text-primary">{item}</span>
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
            <h2 className="mt-4 text-xl font-bold text-navy-900">已提交申請</h2>
            <p className="mt-2 text-sm text-text-secondary">
              申請編號 {applicationId}
            </p>
            {submittedAt && (
              <p className="mt-1 text-xs text-text-muted">提交時間 {submittedAt}</p>
            )}
            <p className="mx-auto mt-4 max-w-sm text-sm leading-relaxed text-text-secondary">
              我們已收到你的申請資料及必須文件。下一步為文件檢查與現金流初步分析；不會在此顯示最終批核結果。
            </p>
            <Link href="/app/applications" className="mt-6 block">
              <Button fullWidth size="lg">
                返回我的申請
              </Button>
            </Link>
            <Link href="/app" className="mt-2 block">
              <Button fullWidth variant="outline">
                返回主頁
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
              <Button
                className="flex-1"
                disabled={!allConsented}
                onClick={submitApplication}
              >
                提交申請
              </Button>
            ) : (
              <Button
                className="flex-1"
                disabled={
                  (step === 0 && !loanType) || (step === 3 && !docsComplete)
                }
                onClick={next}
              >
                {step === 3 && !docsComplete ? "請先完成必須文件" : "下一步"}
              </Button>
            )}
          </div>
        </div>
      )}
    </MobileShell>
  );
}
