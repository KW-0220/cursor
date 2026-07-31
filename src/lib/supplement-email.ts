/**
 * 補件通知電郵 — 按表單選項逐欄客製化
 * 必含：申請編號、常用原因模板、文件類型、補交原因、截止日期
 */

export type SupplementEmailFields = {
  applicationId: string;
  documentType: string;
  /** 常用原因模板（下拉選項原文） */
  reasonTemplate: string;
  /** 補交原因（可人手修改） */
  reason: string;
  detail?: string | null;
  dueDate: string;
  required?: boolean;
  needOcr?: boolean;
  applicantNameZh?: string | null;
  companyNameZh?: string | null;
};

function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatDueDateLabel(dueDate: string) {
  const raw = dueDate.trim();
  // YYYY-MM-DD → 較易讀
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(raw);
  if (m) return `${m[1]} 年 ${Number(m[2])} 月 ${Number(m[3])} 日`;
  return raw;
}

export function buildSupplementEmailSubject(fields: SupplementEmailFields) {
  const id = fields.applicationId.trim() || "—";
  const doc = fields.documentType.trim() || "文件";
  return `【SME LoanFlow 補件通知】${id}｜${doc}｜截止 ${fields.dueDate.trim()}`;
}

export function buildSupplementEmailText(fields: SupplementEmailFields) {
  const name = fields.applicantNameZh?.trim() || "客戶";
  const company = fields.companyNameZh?.trim();
  const lines = [
    `${name} 您好${company ? `（${company}）` : ""}，`,
    "",
    "我們需要您為以下貸款申請補交文件。本電郵內容已按顧問選項自動生成：",
    "",
    `申請編號：${fields.applicationId.trim() || "—"}`,
    `文件類型：${fields.documentType.trim() || "—"}`,
    `常用原因模板：${fields.reasonTemplate.trim() || "—"}`,
    `補交原因：${fields.reason.trim() || "—"}`,
    `截止日期：${formatDueDateLabel(fields.dueDate)}`,
  ];
  if (fields.detail?.trim()) {
    lines.push(`詳細說明：${fields.detail.trim()}`);
  }
  if (fields.required != null) {
    lines.push(`是否必要文件：${fields.required ? "是" : "否"}`);
  }
  if (fields.needOcr != null) {
    lines.push(`是否需重新 OCR：${fields.needOcr ? "是" : "否"}`);
  }
  lines.push(
    "",
    "請登入 SME LoanFlow 客戶端，於申請詳情頁上載補件。",
    "",
    "此郵件由系統根據補件管理選項自動發送。",
  );
  return lines.join("\n");
}

export function buildSupplementEmailHtml(fields: SupplementEmailFields) {
  const name = fields.applicantNameZh?.trim() || "客戶";
  const company = fields.companyNameZh?.trim();
  const dueLabel = formatDueDateLabel(fields.dueDate);

  const rows: Array<[string, string]> = [
    ["申請編號", fields.applicationId.trim() || "—"],
    ["文件類型", fields.documentType.trim() || "—"],
    ["常用原因模板", fields.reasonTemplate.trim() || "—"],
    ["補交原因", fields.reason.trim() || "—"],
    ["截止日期", dueLabel],
  ];
  if (fields.detail?.trim()) {
    rows.push(["詳細說明", fields.detail.trim()]);
  }
  if (fields.required != null) {
    rows.push(["是否必要文件", fields.required ? "是" : "否"]);
  }
  if (fields.needOcr != null) {
    rows.push(["是否需重新 OCR", fields.needOcr ? "是" : "否"]);
  }

  const tableRows = rows
    .map(
      ([label, value]) => `
      <tr>
        <td style="padding:10px 12px;border-bottom:1px solid #e2e8f0;color:#64748b;width:34%;vertical-align:top;font-size:13px;">${escapeHtml(label)}</td>
        <td style="padding:10px 12px;border-bottom:1px solid #e2e8f0;color:#0f172a;font-size:14px;font-weight:600;vertical-align:top;">${escapeHtml(value).replace(/\n/g, "<br/>")}</td>
      </tr>`,
    )
    .join("");

  return `<!DOCTYPE html>
<html lang="zh-Hant">
<head><meta charset="utf-8" /></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI','Noto Sans TC',sans-serif;color:#0f172a;">
  <div style="max-width:640px;margin:24px auto;background:#ffffff;border:1px solid #e2e8f0;border-radius:16px;overflow:hidden;">
    <div style="background:#0b1f33;color:#ffffff;padding:20px 24px;">
      <p style="margin:0;font-size:12px;letter-spacing:0.08em;opacity:0.8;">SME LOANFLOW</p>
      <h1 style="margin:6px 0 0;font-size:20px;font-weight:700;">補件通知</h1>
    </div>
    <div style="padding:24px;">
      <p style="margin:0 0 12px;font-size:15px;line-height:1.7;">
        ${escapeHtml(name)} 您好${company ? `（${escapeHtml(company)}）` : ""}，
      </p>
      <p style="margin:0 0 16px;font-size:14px;line-height:1.7;color:#334155;">
        我們需要您為貸款申請補交文件。以下內容已根據顧問於後台選擇的選項自動生成：
      </p>
      <table style="width:100%;border-collapse:collapse;background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;">
        ${tableRows}
      </table>
      <p style="margin:18px 0 0;font-size:14px;line-height:1.7;">
        請登入 <strong>SME LoanFlow</strong> 客戶端，於申請詳情頁上載補件。逾期可能影響審批進度。
      </p>
    </div>
    <div style="padding:14px 24px;background:#f1f5f9;color:#64748b;font-size:12px;line-height:1.6;">
      此郵件由補件管理系統按選項客製化發送（Resend）。如有疑問請聯絡跟進顧問。
    </div>
  </div>
</body>
</html>`;
}
