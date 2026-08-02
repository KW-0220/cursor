import "server-only";
import type { ApplicationAiAnalysis } from "@/lib/ai-application-decision";
import {
  clientAppStatusLabel,
  normalizeClientAppStatus,
} from "@/lib/application-status";

export type CustomerReportInput = {
  customer: {
    id: string;
    applicantNameZh: string;
    applicantNameEn: string;
    idNumber: string;
    phone: string;
    email: string;
    title: string;
    relation: string;
    companyNameZh: string;
    companyNameEn: string;
    brNumber: string;
    crNumber: string;
    foundedAt: string;
    companyType: string;
    industry: string;
    address: string;
    employees: number;
    website?: string | null;
    contactPerson: string;
    source?: string | null;
    notes?: string | null;
    createdAt: string;
    updatedAt: string;
  };
  applications: Array<{
    id: string;
    status: string;
    failureReason?: string | null;
    amount: number;
    purpose: string;
    loanType: "secured" | "unsecured" | null;
    aiAnalysis?: ApplicationAiAnalysis | null;
    updatedAt: string;
    createdAt: string;
  }>;
  analyses: Array<{
    id: string;
    title: string;
    fileName: string | null;
    docKind: string;
    companyName: string | null;
    summary: string | null;
    overall: string | null;
    archivedAt: string;
    payload?: Record<string, unknown>;
  }>;
  documents: Array<{
    id: string;
    kindLabel: string;
    fileName: string;
    slot: string;
    applicationId?: string;
    createdAt: string;
    source?: string;
  }>;
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

/** 產生可列印／另存為 PDF 的客戶分析報告 HTML */
export function buildCustomerReportHtml(
  input: CustomerReportInput,
  opts?: { autoPrint?: boolean },
) {
  const c = input.customer;
  const generatedAt = new Date().toISOString();

  const appsHtml = input.applications.length
    ? input.applications
        .map((a) => {
          const status = normalizeClientAppStatus(a.status);
          const ai = a.aiAnalysis;
          return `
<section class="block">
  <h3>申請 ${esc(a.id)}</h3>
  <table>
    ${row("狀態", clientAppStatusLabel(status))}
    ${row("金額", money(a.amount))}
    ${row("用途", a.purpose)}
    ${row("貸款類型", a.loanType === "secured" ? "有抵押" : a.loanType === "unsecured" ? "無抵押" : "—")}
    ${row("拒絕原因", a.failureReason || ai?.decisionReason || "—")}
    ${row("AI 摘要", ai?.summary || "—")}
    ${row("銀行還款能力", ai?.bank?.overall || "—")}
    ${row("銀行說明", ai?.bank?.narrative || "—")}
    ${row("BR 公司中文名", ai?.businessRegistration?.companyNameZh || "—")}
    ${row("BR 號碼", ai?.businessRegistration?.brNumber || "—")}
    ${row("Audited 公司", ai?.auditedAccounts?.companyName || "—")}
    ${row("適合度", ai?.suitability?.status || "—")}
    ${row("適合度說明", ai?.suitability?.message || "—")}
  </table>
</section>`;
        })
        .join("")
    : `<p class="muted">尚未有申請決策紀錄。</p>`;

  const analysesHtml = input.analyses.length
    ? input.analyses
        .map((a) => {
          const payload = a.payload || {};
          const br = payload.brExtract as Record<string, unknown> | undefined;
          const bank = payload.bankExtract as Record<string, unknown> | undefined;
          const audited = payload.auditedExtract as
            | Record<string, unknown>
            | undefined;
          const identity = payload.identityExtract as
            | Record<string, unknown>
            | undefined;
          return `
<section class="block">
  <h3>文件分析 ${esc(a.id)} · ${esc(a.docKind)}</h3>
  <table>
    ${row("標題", a.title)}
    ${row("檔名", a.fileName || "—")}
    ${row("公司", a.companyName || "—")}
    ${row("總評", a.overall || "—")}
    ${row("摘要", a.summary || "—")}
    ${row("歸檔時間", a.archivedAt)}
    ${br ? row("BR 抽取", JSON.stringify(br)) : ""}
    ${bank ? row("銀行抽取摘要", JSON.stringify(bank).slice(0, 1200)) : ""}
    ${audited ? row("Audited 抽取", JSON.stringify(audited).slice(0, 1200)) : ""}
    ${identity ? row("身份抽取", JSON.stringify(identity)) : ""}
  </table>
</section>`;
        })
        .join("")
    : `<p class="muted">尚未有 AI 文件分析歸檔。</p>`;

  const docsHtml = input.documents.length
    ? `<table>
  <thead><tr><th>類型</th><th>檔名</th><th>槽位</th><th>申請</th><th>來源</th><th>時間</th></tr></thead>
  <tbody>
  ${input.documents
    .map(
      (d) => `<tr>
    <td>${esc(d.kindLabel)}</td>
    <td>${esc(d.fileName)}</td>
    <td>${esc(d.slot)}</td>
    <td>${esc(d.applicationId || "—")}</td>
    <td>${esc(d.source || "—")}</td>
    <td>${esc(d.createdAt)}</td>
  </tr>`,
    )
    .join("")}
  </tbody></table>`
    : `<p class="muted">尚未有歸檔文件。</p>`;

  return `<!DOCTYPE html>
<html lang="zh-Hant">
<head>
<meta charset="utf-8" />
<title>客戶分析報告 · ${esc(c.companyNameZh || c.id)}</title>
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
  <h1>SME LoanFlow 客戶分析報告</h1>
  <p class="meta">客戶 ${esc(c.id)} · 產生時間 ${esc(generatedAt)}</p>

  <h2>一、登記資料</h2>
  <table>
    ${row("客戶編號", c.id)}
    ${row("公司中文名", c.companyNameZh)}
    ${row("公司英文名", c.companyNameEn)}
    ${row("BR", c.brNumber)}
    ${row("CR", c.crNumber)}
    ${row("成立日期", c.foundedAt)}
    ${row("公司類型", c.companyType)}
    ${row("行業", c.industry)}
    ${row("地址", c.address)}
    ${row("僱員人數", c.employees)}
    ${row("網站", c.website || "—")}
    ${row("聯絡人", c.contactPerson)}
    ${row("申請人中文名", c.applicantNameZh)}
    ${row("申請人英文名", c.applicantNameEn)}
    ${row("身份證／護照", c.idNumber)}
    ${row("職銜", c.title)}
    ${row("關係", c.relation)}
    ${row("電郵", c.email)}
    ${row("電話", c.phone)}
    ${row("來源", c.source || "—")}
    ${row("備註", c.notes || "—")}
    ${row("建立", c.createdAt)}
    ${row("更新", c.updatedAt)}
  </table>

  <h2>二、申請與 AI 批核</h2>
  ${appsHtml}

  <h2>三、文件 AI 分析歸檔</h2>
  ${analysesHtml}

  <h2>四、已收集／歸檔文件</h2>
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
