"use client";

import { useState } from "react";
import type { EligibilityAnalysis } from "@/lib/eligibility";
import type { FinancialExtract } from "@/lib/financial-extract";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import {
  Card,
  Disclaimer,
  SectionHeader,
  StateBanner,
} from "@/components/ui/layout";
import { TrafficLight } from "@/components/ui/status";
import { formatHKD } from "@/lib/utils";

type AnalyzeResponse = {
  ok?: boolean;
  error?: string;
  message?: string;
  detail?: string;
  model?: string;
  fileName?: string;
  extractMethod?: string;
  extract?: FinancialExtract;
  analysis?: EligibilityAnalysis;
  disclaimer?: string;
};

const DOC_TYPE_LABEL: Record<EligibilityAnalysis["documentType"], string> = {
  audit_report: "審計報告",
  bank_statement: "銀行結單",
  facility_letter: "授信信",
  br_certificate: "商業登記證",
  property_doc: "物業文件",
  other: "其他",
  unknown: "未能確定",
};

export function DocumentAnalyzeForm({
  defaultLoanType = "unsecured",
  defaultAmount = 1500000,
  defaultPurpose = "營運資金",
  defaultCompany = "智創科技有限公司",
  showInternalTrafficLight = true,
}: {
  defaultLoanType?: string;
  defaultAmount?: number;
  defaultPurpose?: string;
  defaultCompany?: string;
  /** 客戶端應 false：不顯示內部三色燈 */
  showInternalTrafficLight?: boolean;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [text, setText] = useState("");
  const [loanType, setLoanType] = useState(defaultLoanType);
  const [amountHkd, setAmountHkd] = useState(defaultAmount);
  const [purpose, setPurpose] = useState(defaultPurpose);
  const [companyName, setCompanyName] = useState(defaultCompany);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AnalyzeResponse | null>(null);

  async function onAnalyze() {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const form = new FormData();
      if (file) form.set("file", file);
      if (text.trim()) form.set("text", text.trim());
      form.set("loanType", loanType);
      form.set("amountHkd", String(amountHkd));
      form.set("purpose", purpose);
      form.set("companyName", companyName);

      const res = await fetch("/api/analyze-document", {
        method: "POST",
        body: form,
      });
      const data = (await res.json()) as AnalyzeResponse;
      if (!res.ok || !data.ok || !data.analysis) {
        setError(data.message || data.error || "分析失敗");
        setResult(data);
        return;
      }
      setResult(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "網絡錯誤");
    } finally {
      setLoading(false);
    }
  }

  const analysis = result?.analysis;
  const extract = result?.extract;

  const money = (n: number | null | undefined) =>
    n == null ? "—" : formatHKD(n);

  return (
    <div className="space-y-4">
      <Card className="space-y-3">
        <SectionHeader
          title="上載文件給 AI 分析"
          subtitle="AI 財務助理＋文件分析引擎｜資料提取與預審，不直接批核"
        />
        <Field label="文件" hint="最大 12MB；掃描 PDF 若無文字請改上圖片或貼文">
          <Input
            type="file"
            accept=".pdf,.txt,.md,.csv,.png,.jpg,.jpeg,.webp,application/pdf,image/*"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
        </Field>
        <Field label="或貼上文件文字（可與檔案併用）">
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="例如貼上銀行結單／審計報告重點段落…"
          />
        </Field>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="貸款類型">
            <Select
              value={loanType}
              onChange={(e) => setLoanType(e.target.value)}
            >
              <option value="unsecured">無抵押</option>
              <option value="secured">有抵押</option>
            </Select>
          </Field>
          <Field label="申請金額 HKD">
            <Input
              type="number"
              className="tabular"
              value={amountHkd}
              onChange={(e) => setAmountHkd(Number(e.target.value))}
            />
          </Field>
          <Field label="用途">
            <Input value={purpose} onChange={(e) => setPurpose(e.target.value)} />
          </Field>
          <Field label="公司名稱">
            <Input
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
            />
          </Field>
        </div>
        <Button fullWidth size="lg" disabled={loading} onClick={onAnalyze}>
          {loading ? "正在讀取文件並分析……" : "開始 AI 文件分析"}
        </Button>
        <Disclaimer>
          AI 只作財務助理及文件分析（提取／計算／預審條件），不會直接決定是否批出貸款。
        </Disclaimer>
      </Card>

      {error && (
        <StateBanner tone="error" title="無法完成分析" description={error} />
      )}

      {loading && (
        <StateBanner
          tone="info"
          title="正在處理"
          description="安全讀取文件內容 → 呼叫 AI 結構化初篩，請稍候。"
        />
      )}

      {(extract || analysis) && (
        <div className="space-y-4 animate-fade-up">
          <StateBanner
            tone="success"
            title="文件分析完成"
            description={`${result?.fileName} · ${result?.extractMethod} · ${result?.model}`}
          />

          {extract && (
            <Card>
              <SectionHeader
                title="財務抽取"
                subtitle="缺欄＝文件無資料（不猜測）"
              />
              <dl className="space-y-3">
                {(
                  [
                    ["公司名稱", extract.companyName ?? "—"],
                    ["財政年度", extract.fiscalYear ?? "—"],
                    ["Revenue", money(extract.revenue)],
                    ["EBITDA", money(extract.ebitda)],
                    ["Net Profit", money(extract.netProfit)],
                    ["Existing Debt", money(extract.existingDebt)],
                  ] as const
                ).map(([label, value]) => (
                  <div
                    key={label}
                    className="flex items-baseline justify-between gap-3 border-b border-border/60 pb-2 last:border-0"
                  >
                    <dt className="text-sm text-text-secondary">{label}</dt>
                    <dd className="text-right text-sm font-semibold tabular text-navy-900">
                      {value}
                    </dd>
                  </div>
                ))}
              </dl>
              {extract.notes.length > 0 && (
                <ul className="mt-3 space-y-1 text-xs text-text-muted">
                  {extract.notes.map((n) => (
                    <li key={n}>· {n}</li>
                  ))}
                </ul>
              )}
            </Card>
          )}

          {analysis && (
          <Card>
            <p className="text-xs text-text-muted">文件類型判斷</p>
            <p className="mt-1 font-semibold text-navy-900">
              {DOC_TYPE_LABEL[analysis.documentType]}
            </p>
            <p className="mt-2 text-sm text-text-secondary">{analysis.summary}</p>
            <p className="mt-3 text-sm text-navy-900">
              {analysis.applicantFacingMessage}
            </p>
            {analysis.companyNameGuess && (
              <p className="mt-2 text-xs text-text-muted">
                辨識公司名：{analysis.companyNameGuess}
              </p>
            )}
            <p className="mt-2 text-xs text-text-muted">
              信心度 {(analysis.confidence * 100).toFixed(0)}%
              {analysis.needsHumanReview ? " · 需人工覆核" : ""}
            </p>
          </Card>
          )}

          {analysis && showInternalTrafficLight && (
            <div className="space-y-3">
              <SectionHeader
                title="內部初篩（顧問／控制台）"
                subtitle="客戶端預設不展示三色燈"
              />
              <TrafficLight
                result={analysis.overall}
                label="整體結果"
                detail={analysis.summary}
                suggestion={
                  analysis.needsHumanReview
                    ? "需要由審批人員進一步核實現金流、文件及現有債務安排。"
                    : "可安排顧問跟進，仍須由貸款機構最終評估。"
                }
              />
              {analysis.ruleHits.map((hit) => (
                <TrafficLight
                  key={hit.rule + hit.detail}
                  result={hit.status}
                  label={hit.rule}
                  detail={hit.detail}
                  suggestion={hit.suggestion}
                />
              ))}
            </div>
          )}

          {analysis && (
          <Card>
            <SectionHeader title="完整性檢查" />
            <ul className="space-y-1 text-sm">
              {analysis.completeness.ok.map((item) => (
                <li key={item} className="text-success-600">
                  ✓ {item}
                </li>
              ))}
              {analysis.completeness.issues.map((item) => (
                <li key={item} className="text-warning-600">
                  ! {item}
                </li>
              ))}
            </ul>
          </Card>
          )}

          <Disclaimer>
            {result?.disclaimer ||
              "此建議只供初步參考，實際貸款條件及批核結果由相關貸款機構決定。"}
          </Disclaimer>
        </div>
      )}
    </div>
  );
}
