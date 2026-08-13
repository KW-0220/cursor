import "server-only";
import type { ApplicationAiAnalysis } from "@/lib/ai-application-decision";
import {
  clientAppStatusLabel,
  normalizeClientAppStatus,
} from "@/lib/application-status";

export type ApplicationAiReportInput = {
  application: {
    id: string;
    status: string;
    failureReason?: string | null;
    amount: number;
    purpose: string;
    loanType: "secured" | "unsecured" | "personal_mortgage" | "company_mortgage" | null;
    companyNameZh?: string | null;
    applicantNameZh?: string | null;
    email?: string | null;
    phone?: string | null;
    customerId?: string | null;
    aiAnalysis?: ApplicationAiAnalysis | null;
    createdAt: string;
    updatedAt: string;
  };
  documents: Array<{
    id: string;
    kindLabel: string;
    fileName: string;
    slot: string;
    createdAt: string;
  }>;
  archives: Array<{
    id: string;
    title: string;
    fileName: string | null;
    docKind: string;
    summary: string | null;
    overall: string | null;
    archivedAt: string;
  }>;
  /** 舊案件可由歸檔 payload 補齊 */
  ebitdaOverride?: ApplicationAiAnalysis["ebitda"];
};

function esc(s: unknown) {
  return String(s ?? "—")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function money(n: number | null | undefined) {
  if (n == null || !Number.isFinite(n)) return "—";
  return `HK$ ${Math.round(n).toLocaleString("en-HK")}`;
}

function row(label: string, value: unknown) {
  return `<tr><th>${esc(label)}</th><td>${esc(value)}</td></tr>`;
}

function overallLabel(o?: string | null) {
  if (o === "adequate") return "尚可";
  if (o === "tight") return "偏緊";
  if (o === "weak") return "偏弱";
  return o || "—";
}

function coverLabel(v?: boolean | null) {
  if (v == null) return "資料不足，未能判斷";
  return v ? "通過（EBITDA > Total Debt payments）" : "不通過（EBITDA ≤ Total Debt payments）";
}

function ebitdaSourceLabel(s?: string | null) {
  if (s === "computed") return "系統重算";
  if (s === "disclosed") return "報表披露";
  return "未能計算";
}

/** 案件 AI 分析報告（可列印／另存 PDF） */
export function buildApplicationAiReportHtml(
  input: ApplicationAiReportInput,
  opts?: { autoPrint?: boolean },
) {
  const a = input.application;
  const ai = a.aiAnalysis;
  const ebitda = ai?.ebitda ?? input.ebitdaOverride ?? null;
  const status = normalizeClientAppStatus(a.status);
  const generatedAt = new Date().toISOString();

  const ebitdaSection = `
<section class="block">
  <h3>EBITDA</h3>
  ${
    ebitda
      ? `<table>
    ${row("公式", ebitda.formula)}
    ${row("硬規則", ebitda.coverageRule)}
    ${row("Earning before tax", money(ebitda.components.earningBeforeTax))}
    ${row("Interest", money(ebitda.components.interest))}
    ${row("Tax", money(ebitda.components.tax))}
    ${row("Depreciation", money(ebitda.components.depreciation))}
    ${row("Amortisation", money(ebitda.components.amortisation))}
    ${row("Net Profit（參考）", money(ebitda.components.netProfit))}
    ${row("EBITDA", money(ebitda.ebitdaHkd))}
    ${row("EBITDA 來源", ebitdaSourceLabel(ebitda.ebitdaSource))}
    ${row("Total Debt payments", money(ebitda.totalDebtPaymentsHkd))}
    ${row("覆蓋結果", coverLabel(ebitda.coversDebtPayments))}
    ${row(
      "DSCR",
      ebitda.dscr == null ? "—" : ebitda.dscr.toFixed(2),
    )}
  </table>`
      : `<p class="muted">尚未有 EBITDA 組成資料（需經審計報表抽取 EBT／Interest／Tax／D／A）。</p>`
  }
</section>`;

  const aiSection = !ai
    ? `<p class="muted">此申請尚未附帶 AI 分析快照。</p>${ebitdaSection}`
    : `
<section class="block">
  <h3>AI 決策摘要</h3>
  <table>
    ${row("建議決策", ai.decision || "—")}
    ${row("決策原因", ai.decisionReason || a.failureReason || "—")}
    ${row("摘要", ai.summary || "—")}
    ${row("分析時間", ai.analyzedAt || "—")}
  </table>
</section>
<section class="block">
  <h3>銀行月結</h3>
  <table>
    ${row("已分析", ai.bank?.analyzed ? "是" : "否")}
    ${row("月數", ai.bank?.monthsAnalyzed ?? "—")}
    ${row("還款能力", overallLabel(ai.bank?.overall))}
    ${row("說明", ai.bank?.narrative || "—")}
    ${row("月均營運進帳", money(ai.bank?.monthlyAvgOperating))}
    ${row("六個月淨現金流", money(ai.bank?.sixMonthNet))}
    ${row("六個月平均日結", money(ai.bank?.sixMonthAvgDaily))}
  </table>
</section>
<section class="block">
  <h3>商業登記證</h3>
  <table>
    ${row("已分析", ai.businessRegistration?.analyzed ? "是" : "否")}
    ${row("中文名", ai.businessRegistration?.companyNameZh || "—")}
    ${row("英文名", ai.businessRegistration?.companyNameEn || "—")}
    ${row("BR 號碼", ai.businessRegistration?.brNumber || "—")}
    ${row("業務性質", ai.businessRegistration?.businessNature || "—")}
    ${row("地址", ai.businessRegistration?.businessAddress || "—")}
    ${row("生效", ai.businessRegistration?.effectiveDate || "—")}
    ${row("屆滿", ai.businessRegistration?.expiryDate || "—")}
    ${row("錯誤", ai.businessRegistration?.error || "—")}
  </table>
</section>
<section class="block">
  <h3>經審計報表</h3>
  <table>
    ${row("已分析", ai.auditedAccounts?.analyzed ? "是" : "否")}
    ${row("公司", ai.auditedAccounts?.companyName || "—")}
    ${row("年結", ai.auditedAccounts?.yearEndDate || "—")}
    ${row("核數師", ai.auditedAccounts?.auditorName || "—")}
    ${row("意見", ai.auditedAccounts?.auditOpinionType || "—")}
    ${row("錯誤", ai.auditedAccounts?.error || "—")}
  </table>
  ${
    ai.auditedAccounts?.years?.length
      ? `<table><thead><tr><th>年度</th><th>營業額</th><th>淨利</th></tr></thead><tbody>${ai.auditedAccounts.years
          .map(
            (y, i) =>
              `<tr><td>${esc(y.financialYear || `年度${i + 1}`)}</td><td>${esc(money(y.revenue))}</td><td>${esc(money(y.netProfit))}</td></tr>`,
          )
          .join("")}</tbody></table>`
      : ""
  }
</section>
${ebitdaSection}
<section class="block">
  <h3>適合度</h3>
  <table>
    ${row("狀態", ai.suitability?.status || "—")}
    ${row("說明", ai.suitability?.message || "—")}
  </table>
</section>`;

  const docsHtml = input.documents.length
    ? `<table><thead><tr><th>類型</th><th>檔名</th><th>槽位</th><th>時間</th></tr></thead><tbody>${input.documents
        .map(
          (d) =>
            `<tr><td>${esc(d.kindLabel)}</td><td>${esc(d.fileName)}</td><td>${esc(d.slot)}</td><td>${esc(d.createdAt)}</td></tr>`,
        )
        .join("")}</tbody></table>`
    : `<p class="muted">尚未有上載文件清單。</p>`;

  const archivesHtml = input.archives.length
    ? input.archives
        .map(
          (x) => `
<section class="block">
  <h3>${esc(x.title)} · ${esc(x.docKind)}</h3>
  <table>
    ${row("檔名", x.fileName || "—")}
    ${row("總評", x.overall || "—")}
    ${row("摘要", x.summary || "—")}
    ${row("歸檔時間", x.archivedAt)}
  </table>
</section>`,
        )
        .join("")
    : `<p class="muted">尚未有文件分析歸檔。</p>`;

  return `<!DOCTYPE html>
<html lang="zh-Hant">
<head>
<meta charset="utf-8" />
<title>AI 分析報告 · ${esc(a.id)}</title>
<style>
  @page { size: A4; margin: 14mm; }
  body { font-family: "Noto Sans TC", "PingFang TC", "Microsoft JhengHei", sans-serif; color: #243447; font-size: 12px; line-height: 1.45; }
  h1 { font-size: 20px; margin: 0 0 4px; color: #12304a; }
  h2 { font-size: 14px; margin: 22px 0 8px; color: #12304a; border-bottom: 1px solid #d5dde6; padding-bottom: 4px; }
  h3 { font-size: 13px; margin: 0 0 8px; color: #12304a; }
  .meta { color: #5b6b7c; margin-bottom: 16px; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 8px; }
  th, td { border: 1px solid #d5dde6; padding: 6px 8px; vertical-align: top; text-align: left; }
  th { width: 28%; background: #f5f7fa; font-weight: 600; }
  .block { margin-bottom: 14px; page-break-inside: avoid; }
  .muted { color: #7a8794; }
  .toolbar { margin-bottom: 16px; }
  .toolbar button { background: #12304a; color: #fff; border: 0; border-radius: 8px; padding: 8px 14px; cursor: pointer; font-size: 13px; }
  @media print { .toolbar { display: none; } }
</style>
</head>
<body>
  <div class="toolbar">
    <button type="button" onclick="window.print()">列印／另存 PDF</button>
  </div>
  <h1>SME LoanFlow AI 分析報告</h1>
  <p class="meta">申請 ${esc(a.id)} · 產生時間 ${esc(generatedAt)}</p>

  <h2>一、案件資料</h2>
  <table>
    ${row("申請編號", a.id)}
    ${row("目前狀態", clientAppStatusLabel(status))}
    ${row("公司", a.companyNameZh || "—")}
    ${row("申請人", a.applicantNameZh || "—")}
    ${row("電郵", a.email || "—")}
    ${row("電話", a.phone || "—")}
    ${row("客戶編號", a.customerId || "—")}
    ${row("貸款類型", a.loanType === "secured" ? "有抵押" : a.loanType === "unsecured" ? "無抵押" : a.loanType === "personal_mortgage" ? "個人按揭" : a.loanType === "company_mortgage" ? "公司按揭" : "—")}
    ${row("金額", money(a.amount))}
    ${row("用途", a.purpose)}
    ${row("拒絕原因", a.failureReason || "—")}
    ${row("建立", a.createdAt)}
    ${row("更新", a.updatedAt)}
  </table>

  <h2>二、AI 分析內容</h2>
  ${aiSection}

  <h2>三、文件分析歸檔</h2>
  ${archivesHtml}

  <h2>四、已收集文件</h2>
  ${docsHtml}

  <p class="muted" style="margin-top:24px">本報告由 SME LoanFlow 後台產生，僅供內部審批參考。</p>
  ${
    opts?.autoPrint
      ? `<script>window.addEventListener("load",function(){setTimeout(function(){window.print()},200)});</script>`
      : ""
  }
</body>
</html>`;
}
