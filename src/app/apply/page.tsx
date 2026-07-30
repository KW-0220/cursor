"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { MobileShell } from "@/components/app/mobile-shell";
import {
  ApplyDocumentsUpload,
  applyDocsProgress,
  emptyApplyDocs,
  isApplyDocsComplete,
  lastSixBankMonths,
  summarizeApplyDocs,
  type ApplyAnalysisSnapshot,
  type ApplyDocsState,
} from "@/components/app/apply-documents-upload";
import {
  buildApplicationAiDecision,
  emptyApplyAnalysisSnapshot,
} from "@/lib/ai-application-decision";
import {
  CollateralAnalysisCard,
  CollateralDocsSection,
  CollateralManager,
} from "@/components/app/collateral-manager";
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
import {
  buildApplyDraft,
  clearApplyDraft,
  formatDraftSavedAt,
  loadApplyDraft,
  persistApplyDraft,
  restoreApplyDocs,
} from "@/lib/apply-draft";
import {
  COLLATERAL_DATA_USE_NOTE,
  displayTitle,
  hasUsableCollateral,
  itemCompleteness,
  loadCollateralItems,
  preliminaryNetValue,
  saveCollateralItems,
  type CollateralItem,
} from "@/lib/collateral";
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
  const [amount, setAmount] = useState<number | "">("");
  const [purpose, setPurpose] = useState("");
  const [tenureYears, setTenureYears] = useState("");
  const [fundingDate, setFundingDate] = useState("");
  const [targetBank, setTargetBank] = useState("");
  const [extraNotes, setExtraNotes] = useState("");
  const [hasExistingLoan, setHasExistingLoan] = useState<boolean | null>(null);
  const [lender, setLender] = useState("");
  const [debtType, setDebtType] = useState("");
  const [facility, setFacility] = useState("");
  const [outstanding, setOutstanding] = useState("");
  const [collateralItems, setCollateralItems] = useState<CollateralItem[]>([]);
  const [userKey, setUserKey] = useState("anon");
  const [docs, setDocs] = useState<ApplyDocsState>(() =>
    emptyApplyDocs(BANK_MONTHS),
  );
  const [consents, setConsents] = useState<Record<string, boolean>>({});
  const [applicationId, setApplicationId] = useState<string | null>(null);
  const [submittedAt, setSubmittedAt] = useState<string | null>(null);
  const [draftReady, setDraftReady] = useState(false);
  const [draftRestoredAt, setDraftRestoredAt] = useState<string | null>(null);
  const [savingDraft, setSavingDraft] = useState(false);
  const [saveFlash, setSaveFlash] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [analysisSnap, setAnalysisSnap] = useState<ApplyAnalysisSnapshot>(() =>
    emptyApplyAnalysisSnapshot(),
  );

  useEffect(() => {
    void (async () => {
      let key = "anon";
      try {
        const res = await fetch("/api/auth/me");
        const data = await res.json();
        if (res.ok && data.user?.id) key = data.user.id as string;
      } catch {
        /* anon */
      }
      setUserKey(key);
      setCollateralItems(loadCollateralItems(key));

      const draft = loadApplyDraft(key);
      if (draft && draft.step < 7) {
        setStep(Math.min(Math.max(0, draft.step), steps.length - 2));
        setLoanType(draft.loanType);
        setAmount(draft.amount);
        setPurpose(draft.purpose || "");
        setTenureYears(draft.tenureYears || "");
        setFundingDate(draft.fundingDate || "");
        setTargetBank(draft.targetBank || "");
        setExtraNotes(draft.extraNotes || "");
        setHasExistingLoan(draft.hasExistingLoan);
        setLender(draft.lender || "");
        setDebtType(draft.debtType || "");
        setFacility(draft.facility || "");
        setOutstanding(draft.outstanding || "");
        setConsents(draft.consents || {});
        try {
          const restored = await restoreApplyDocs(key, draft, BANK_MONTHS);
          setDocs(restored);
        } catch {
          /* keep empty docs */
        }
        setDraftRestoredAt(draft.savedAt);
      }
      setDraftReady(true);
    })();
  }, []);

  function updateCollateral(next: CollateralItem[]) {
    setCollateralItems(next);
    saveCollateralItems(next, userKey);
  }

  async function handleSaveDraft() {
    if (step >= 7) return;
    setSavingDraft(true);
    setSaveFlash(null);
    try {
      const draft = buildApplyDraft({
        step,
        loanType,
        amount,
        purpose,
        tenureYears,
        fundingDate,
        targetBank,
        extraNotes,
        hasExistingLoan,
        lender,
        debtType,
        facility,
        outstanding,
        consents,
        bankMonths: BANK_MONTHS,
        docs,
      });
      await persistApplyDraft(userKey, draft, docs, BANK_MONTHS);
      setDraftRestoredAt(draft.savedAt);
      setSaveFlash(`已保存草稿（${formatDraftSavedAt(draft.savedAt)}）`);
      window.setTimeout(() => setSaveFlash(null), 4000);
    } catch (e) {
      setSaveFlash(
        e instanceof Error ? `保存失敗：${e.message}` : "保存失敗，請重試",
      );
    } finally {
      setSavingDraft(false);
    }
  }

  const amountHkd = typeof amount === "number" ? amount : 0;
  const step1Ok =
    amountHkd > 0 && purpose.trim().length > 0 && tenureYears !== "";

  const progress = ((step + 1) / steps.length) * 100;
  const docsComplete = isApplyDocsComplete(docs, BANK_MONTHS);
  const collateralOk =
    loanType !== "secured" || hasUsableCollateral(collateralItems);
  const docsSummary = useMemo(
    () => summarizeApplyDocs(docs, BANK_MONTHS),
    [docs],
  );
  const docsPct = useMemo(() => {
    const p = applyDocsProgress(docs, BANK_MONTHS);
    return Math.round((p.done / p.total) * 100);
  }, [docs]);

  const totalCollateralNet = useMemo(
    () => collateralItems.reduce((s, i) => s + preliminaryNetValue(i), 0),
    [collateralItems],
  );

  const consentItems = useMemo(
    () => [
      "本人確認所提交資料真實及完整",
      "本人獲授權代表公司提交申請",
      "同意平台處理及分析所上載的商業及財務資料",
      "同意平台按申請需要將資料提供予指定合作機構",
      "明白 AI 分析只供初步評估，並非正式貸款批核",
      "已閱讀私隱政策及使用條款",
      ...(loanType === "secured"
        ? [
            "明白抵押品估值及淨值只屬初步計算，正式價值須由指定估值及貸款機構確認",
          ]
        : []),
    ],
    [loanType],
  );

  const allConsented = consentItems.every((item) => consents[item]);

  const next = () => setStep((s) => Math.min(steps.length - 1, s + 1));
  const back = () => setStep((s) => Math.max(0, s - 1));

  async function submitApplication() {
    if (!allConsented || submitting) return;
    setSubmitting(true);
    setSubmitError(null);
    const id = `SLF-${new Date().getFullYear()}-${String(Date.now()).slice(-5)}`;
    const at = new Date().toISOString();
    setApplicationId(id);
    setSubmittedAt(new Date().toLocaleString("zh-HK", { hour12: false }));

    let profile: {
      email?: string | null;
      nameZh?: string | null;
      phone?: string | null;
    } = {};
    try {
      const me = await fetch("/api/auth/me");
      const meData = await me.json();
      if (me.ok && meData.user) {
        profile = {
          email: meData.user.email ?? null,
          nameZh: meData.user.nameZh ?? null,
          phone: meData.user.phone ?? null,
        };
      }
    } catch {
      /* anon */
    }

    try {
      const existingDebtHkd =
        hasExistingLoan && outstanding
          ? Number(String(outstanding).replace(/[,]/g, ""))
          : null;
      const aiAnalysis = buildApplicationAiDecision(analysisSnap, {
        existingDebtHkd:
          existingDebtHkd != null && Number.isFinite(existingDebtHkd)
            ? existingDebtHkd
            : null,
      });
      const status = aiAnalysis.decision;
      const failureReason =
        status === "rejected"
          ? aiAnalysis.decisionReason || "AI 分析未達批核標準"
          : null;
      const companyNameZh =
        aiAnalysis.businessRegistration.companyNameZh ||
        aiAnalysis.auditedAccounts.companyName ||
        null;

      const prev = JSON.parse(
        sessionStorage.getItem("slf_applications") || "[]",
      ) as unknown[];
      const record = {
        id,
        loanType,
        amount: amountHkd,
        purpose,
        tenureYears: tenureYears ? Number(tenureYears) : null,
        fundingDate: fundingDate || null,
        targetBank: targetBank || null,
        hasExistingLoan,
        docsPct,
        bankCount: docsSummary.bankCount,
        collateralCount: collateralItems.length,
        collateralNet: totalCollateralNet,
        collateralSummary: collateralItems.map((i) => ({
          id: i.id,
          subtype: i.subtype,
          title: displayTitle(i),
          completeness: itemCompleteness(i),
          net: preliminaryNetValue(i),
        })),
        status,
        failureReason,
        aiAnalysis,
        companyNameZh,
        applicantNameZh: profile.nameZh ?? null,
        email: profile.email ?? null,
        phone: profile.phone ?? null,
        createdAt: at,
        updatedAt: at,
      };
      sessionStorage.setItem(
        "slf_applications",
        JSON.stringify([record, ...prev]),
      );

      const appRes = await fetch("/api/applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id,
          loanType,
          amount: amountHkd,
          purpose,
          docsPct,
          bankCount: docsSummary.bankCount,
          status,
          failureReason,
          aiAnalysis,
          companyNameZh,
          applicantNameZh: profile.nameZh ?? null,
          email: profile.email ?? null,
          phone: profile.phone ?? null,
        }),
      });
      const appData = await appRes.json().catch(() => ({}));
      if (!appRes.ok) {
        throw new Error(appData.message || appData.error || "申請同步失敗");
      }
      const customerId =
        (appData.application?.customerId as string | null | undefined) ?? null;

      // 上載已收集文件 → 後台客戶登記／案件
      const form = new FormData();
      if (customerId) form.append("customerId", customerId);
      const pushFile = (file: File, kind: string, slot: string) => {
        form.append("files", file, file.name);
        form.append("kinds", kind);
        form.append("slots", slot);
      };
      if (docs.br?.file) pushFile(docs.br.file, "br", "br");
      docs.audited.forEach((f, i) => {
        if (f?.file) pushFile(f.file, "audited", `audited:${i}`);
      });
      docs.identity.forEach((f, i) => {
        if (f?.file) pushFile(f.file, "identity", `identity:${i}`);
      });
      docs.companyOther.forEach((f, i) => {
        if (f?.file) pushFile(f.file, "company_other", `companyOther:${i}`);
      });
      for (const [month, meta] of Object.entries(docs.bank)) {
        if (meta?.file) pushFile(meta.file, "bank", `bank:${month}`);
      }

      const fileCount = form.getAll("files").length;
      if (fileCount > 0) {
        const docRes = await fetch(`/api/applications/${id}/documents`, {
          method: "POST",
          body: form,
        });
        const docData = await docRes.json().catch(() => ({}));
        if (!docRes.ok) {
          throw new Error(
            docData.message || docData.error || "文件上載失敗，請重試",
          );
        }
      }

      clearApplyDraft(userKey);
      setStep(7);
    } catch (err) {
      setSubmitError(
        err instanceof Error ? err.message : "提交失敗，請重試",
      );
    } finally {
      setSubmitting(false);
    }
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

      <main className="space-y-4 px-4 py-5 pb-44">
        {draftReady && draftRestoredAt && step < 7 && (
          <StateBanner
            tone="info"
            title="已載入草稿"
            description={`上次保存：${formatDraftSavedAt(draftRestoredAt)}。可繼續填寫，或撳底部「保存」再離開。`}
          />
        )}
        {step === 0 && (
          <>
            <SectionHeader title="選擇貸款類型" />
            {(
              [
                {
                  type: "secured" as const,
                  title: "有抵押貸款",
                  fit: [
                    "持有香港住宅、商舖、寫字樓、工廈、車位或其他資產",
                    "希望申請較高貸款額",
                    "可接受以抵押品作擔保",
                  ],
                  docs: "必須：BR、最近三年 Audited Report、六個月銀行月結單 PDF、董事／股東／擔保人身份證明，以及按抵押品類型上載專屬文件",
                },
                {
                  type: "unsecured" as const,
                  title: "無抵押貸款",
                  fit: [
                    "沒有物業作抵押",
                    "主要依靠公司營運及現金流",
                    "希望申請營運資金",
                  ],
                  docs: "必須：BR、最近三年 Audited Report、六個月銀行月結單 PDF、董事／股東／擔保人身份證明",
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
                placeholder="請輸入金額"
                onChange={(e) =>
                  setAmount(
                    e.target.value === "" ? "" : Number(e.target.value),
                  )
                }
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
                <option value="">請選擇</option>
                <option value="營運資金">營運資金</option>
                <option value="出糧／支付供應商">出糧／支付供應商</option>
                <option value="購買貨物">購買貨物</option>
                <option value="公司擴充">公司擴充</option>
                <option value="購買商業物業">購買商業物業</option>
                <option value="現有貸款再融資">現有貸款再融資</option>
                <option value="其他用途">其他用途</option>
              </Select>
            </Field>
            <Field label="希望還款年期" required>
              <Select
                value={tenureYears}
                onChange={(e) => setTenureYears(e.target.value)}
              >
                <option value="">請選擇</option>
                <option value="1">1 年</option>
                <option value="2">2 年</option>
                <option value="3">3 年</option>
                <option value="5">5 年</option>
                <option value="10">10 年</option>
              </Select>
            </Field>
            <Field label="希望何時取得資金">
              <Input
                type="date"
                value={fundingDate}
                onChange={(e) => setFundingDate(e.target.value)}
              />
            </Field>
            <Field label="是否已有目標銀行" hint="選填">
              <Input
                value={targetBank}
                onChange={(e) => setTargetBank(e.target.value)}
                placeholder="例如：某銀行商業貸款部"
              />
            </Field>
            <Field label="其他補充資料">
              <Textarea
                value={extraNotes}
                onChange={(e) => setExtraNotes(e.target.value)}
                placeholder="可補充業務季節性、近期訂單等"
              />
            </Field>
            <Disclaimer>
              此階段不會顯示「保證批核」或「即時批出」等字眼。AI
              結果只屬初步評估。
            </Disclaimer>
          </>
        )}

        {step === 2 && loanType === "secured" && (
          <>
            <StateBanner
              tone="info"
              title="抵押品管理模組"
              description={COLLATERAL_DATA_USE_NOTE}
            />
            <CollateralManager
              items={collateralItems}
              onChange={updateCollateral}
              newLoanAmount={amountHkd}
              showDocs
              showAnalysis
            />
          </>
        )}

        {step === 2 && loanType === "unsecured" && (
          <>
            <SectionHeader title="現有貸款情況" subtitle="可新增多項" />
            <Field label="現時是否有銀行貸款" required>
              <Select
                value={
                  hasExistingLoan === null ? "" : hasExistingLoan ? "是" : "否"
                }
                onChange={(e) => {
                  if (e.target.value === "") {
                    setHasExistingLoan(null);
                    return;
                  }
                  setHasExistingLoan(e.target.value === "是");
                }}
              >
                <option value="">請選擇</option>
                <option value="是">是</option>
                <option value="否">否</option>
              </Select>
            </Field>
            {hasExistingLoan === true && (
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
                        placeholder="例如：營運貸款"
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
          <>
            {loanType === "secured" && (
              <StateBanner
                tone="info"
                title="區塊一：共同必須文件"
                description="BR、最近三年 Audited Report、六個月銀行月結單、身份證明。區塊二為抵押品專屬文件。"
              />
            )}
            <ApplyDocumentsUpload
              months={BANK_MONTHS}
              docs={docs}
              onChange={setDocs}
              onAnalysisChange={setAnalysisSnap}
              loanType={loanType ?? "unsecured"}
              amountHkd={amountHkd}
              purpose={purpose || "營運資金"}
            />
            {loanType === "secured" && (
              <CollateralDocsSection
                items={collateralItems}
                onChange={updateCollateral}
                newLoanAmount={amountHkd}
              />
            )}
          </>
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
              <p className="text-xs text-text-muted">Audited Report</p>
              <ul className="mt-1 space-y-1 text-sm font-medium text-navy-900">
                {docsSummary.audited.length === 0 ? (
                  <li>—</li>
                ) : (
                  docsSummary.audited.map((n) => <li key={n}>· {n}</li>)
                )}
              </ul>
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
            {loanType === "secured" && (
              <>
                <SectionHeader title="抵押品文件完整度" />
                {collateralItems.length === 0 ? (
                  <Card className="text-sm text-text-muted">尚未新增抵押品</Card>
                ) : (
                  collateralItems.map((item) => {
                    const c = itemCompleteness(item);
                    return (
                      <Card key={item.id}>
                        <p className="text-xs text-text-muted">{item.subtype}</p>
                        <p className="mt-1 text-sm font-medium text-navy-900">
                          {displayTitle(item)}
                        </p>
                        <p className="mt-1 text-xs text-text-secondary">
                          文件 {c.done}／{c.total} · 初步淨值{" "}
                          {formatHKD(preliminaryNetValue(item))}
                        </p>
                      </Card>
                    );
                  })
                )}
              </>
            )}
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
                `${loanType === "secured" ? "有抵押" : "無抵押"} · ${amountHkd > 0 ? formatHKD(amountHkd) : "—"} · ${purpose || "—"}`,
              ],
              [
                "抵押物／現有貸款",
                loanType === "secured"
                  ? collateralItems.length
                    ? `${collateralItems.length} 項抵押品 · 初步合計淨值 ${formatHKD(totalCollateralNet)}`
                    : "尚未新增抵押品"
                  : hasExistingLoan === true
                    ? `已申報現有銀行貸款${lender ? `（${lender}）` : ""}`
                    : hasExistingLoan === false
                      ? "沒有現有銀行貸款"
                      : "尚未選擇",
              ],
              [
                "文件完成狀態",
                `${docsPct}% · BR／Audited Report／身份／銀行月結單 ${docsSummary.bankCount}/6`,
              ],
            ].map(([title, body]) => (
              <Card key={title}>
                <p className="text-xs text-text-muted">{title}</p>
                <p className="mt-1 text-sm font-medium text-navy-900">{body}</p>
              </Card>
            ))}
            {loanType === "secured" &&
              collateralItems.map((item) => (
                <CollateralAnalysisCard
                  key={item.id}
                  item={item}
                  newLoanAmount={amountHkd}
                />
              ))}
            <Disclaimer>
              提交前不會向客戶顯示內部評分或「保證批核」等字眼，避免誤解。
            </Disclaimer>
          </>
        )}

        {step === 6 && (
          <>
            <SectionHeader title="聲明及授權" subtitle="每項須分別確認" />
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
            {submitError && (
              <StateBanner
                tone="error"
                title="提交未完成"
                description={submitError}
              />
            )}
            {submitting && (
              <p className="text-center text-sm text-text-secondary">
                正在同步後台案件並上載文件，請稍候…
              </p>
            )}
          </>
        )}

        {step === 7 && (
          <div className="py-8 text-center">
            <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-success-100 text-2xl text-success-600">
              ✓
            </div>
            <h2 className="mt-4 text-xl font-bold text-navy-900">申請已進入審批</h2>
            <p className="mt-2 text-sm text-text-secondary">
              申請編號 {applicationId}
            </p>
            <p className="mt-2 inline-flex rounded-full bg-navy-900/10 px-2.5 py-1 text-xs font-medium text-navy-800">
              審批中
            </p>
            {submittedAt && (
              <p className="mt-2 text-xs text-text-muted">
                提交時間 {submittedAt}
              </p>
            )}
            <p className="mx-auto mt-4 max-w-sm text-sm leading-relaxed text-text-secondary">
              我們已收到你的申請資料及必須文件
              {loanType === "secured" ? "（含抵押品資料）" : ""}
              。目前狀態為「審批中」；結果稍後會更新為「成功批核」或「申請失敗」。
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
        <div className="fixed inset-x-0 bottom-0 z-40 mx-auto max-w-[430px] border-t border-border bg-surface-1 p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <Button
            type="button"
            variant="outline"
            fullWidth
            disabled={savingDraft || !draftReady}
            onClick={() => void handleSaveDraft()}
          >
            {savingDraft ? "保存中……" : "保存"}
          </Button>
          {saveFlash && (
            <p className="mt-2 text-center text-xs text-teal-700">{saveFlash}</p>
          )}
          <div className="mt-2 flex gap-2">
            {step > 0 && (
              <Button variant="outline" className="flex-1" onClick={back}>
                上一步
              </Button>
            )}
            {step === 6 ? (
              <Button
                className="flex-1"
                disabled={!allConsented || submitting}
                onClick={() => void submitApplication()}
              >
                {submitting ? "提交及上載文件中…" : "提交申請"}
              </Button>
            ) : (
              <Button
                className="flex-1"
                disabled={
                  (step === 0 && !loanType) ||
                  (step === 1 && !step1Ok) ||
                  (step === 2 && loanType === "secured" && !collateralOk) ||
                  (step === 3 && !docsComplete)
                }
                onClick={next}
              >
                {step === 1 && !step1Ok
                  ? "請先填寫金額、用途及年期"
                  : step === 2 && loanType === "secured" && !collateralOk
                    ? "請先完成抵押品基本資料"
                    : step === 3 && !docsComplete
                      ? "請先完成必須文件"
                      : "下一步"}
              </Button>
            )}
          </div>
        </div>
      )}
    </MobileShell>
  );
}
