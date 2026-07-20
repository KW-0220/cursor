"use client";

import { useState } from "react";
import type { EligibilityAnalysis } from "@/lib/eligibility";
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

      const res = await fetch("/api/documents/analyze", {
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

  return (
    <div className="space-y-4">
      <Card className="space-y-3">
        <SectionHeader
          title="上載文件給 AI 初篩"
          subtitle="PDF／文字／圖片 → 抽出內容 → 初步資格評估"
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
          {loading ? "正在讀取文件並分析……" : "開始 AI 資格初篩"}
        </Button>
        <Disclaimer>
          使用 AI 分析（模型可由 OPENAI_MODEL 設定）。結果只屬初步評估，非正式批核。
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

      {analysis && (
        <div className="space-y-4 animate-fade-up">
          <StateBanner
            tone="success"
            title="文件分析完成"
            description={`${result?.fileName} · ${result?.extractMethod} · ${result?.model}`}
          />

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

          {showInternalTrafficLight && (
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

          {(analysis.extracted.revenueByYear.length > 0 ||
            analysis.extracted.monthlyInflows.length > 0 ||
            analysis.extracted.existingDebts.length > 0) && (
            <Card>
              <SectionHeader title="提取資料（請人工確認）" />
              {analysis.extracted.revenueByYear.length > 0 && (
                <div className="mb-3">
                  <p className="text-xs text-text-muted">營業額</p>
                  {analysis.extracted.revenueByYear.map((r) => (
                    <p key={r.year} className="tabular text-sm">
                      {r.year}：
                      {r.amountHkd != null ? formatHKD(r.amountHkd) : "未能確認"}
                    </p>
                  ))}
                </div>
              )}
              {analysis.extracted.monthlyInflows.length > 0 && (
                <div className="mb-3">
                  <p className="text-xs text-text-muted">月入數</p>
                  {analysis.extracted.monthlyInflows.map((m) => (
                    <p key={m.month} className="tabular text-sm">
                      {m.month}：
                      {m.amountHkd != null ? formatHKD(m.amountHkd) : "未能確認"}
                    </p>
                  ))}
                </div>
              )}
              {analysis.extracted.existingDebts.length > 0 && (
                <div>
                  <p className="text-xs text-text-muted">現有債務</p>
                  {analysis.extracted.existingDebts.map((d) => (
                    <p key={d.lender} className="text-sm">
                      {d.lender}
                      {d.outstandingHkd != null
                        ? ` · 未償還 ${formatHKD(d.outstandingHkd)}`
                        : ""}
                      {d.monthlyPaymentHkd != null
                        ? ` · 月供 ${formatHKD(d.monthlyPaymentHkd)}`
                        : ""}
                    </p>
                  ))}
                </div>
              )}
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
