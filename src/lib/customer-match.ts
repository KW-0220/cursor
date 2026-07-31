/** 客戶／申請／分析歸檔對應用的輕量比對 */

export function normalizeMatchKey(raw: string | null | undefined) {
  return String(raw || "")
    .trim()
    .toLowerCase()
    .replace(/[\s\-_.　]+/g, "")
    .replace(/(有限公司|有限責任公司|limited|ltd\.?|co\.?,?\s*ltd\.?)/gi, "");
}

export function keysOverlap(
  a: string | null | undefined,
  b: string | null | undefined,
) {
  const ka = normalizeMatchKey(a);
  const kb = normalizeMatchKey(b);
  if (!ka || !kb) return false;
  return ka === kb || ka.includes(kb) || kb.includes(ka);
}

export type MatchableCustomer = {
  id: string;
  email?: string | null;
  companyNameZh?: string | null;
  companyNameEn?: string | null;
  applicantNameZh?: string | null;
  applicantNameEn?: string | null;
  brNumber?: string | null;
};

export type MatchableArchive = {
  customerId?: string | null;
  companyName?: string | null;
  title?: string | null;
  summary?: string | null;
  fileName?: string | null;
  payload?: Record<string, unknown> | null;
};

function payloadBrNumber(payload: Record<string, unknown> | null | undefined) {
  const br = payload?.brExtract;
  if (br && typeof br === "object" && br !== null) {
    const n = (br as { br_number?: unknown }).br_number;
    if (typeof n === "string" && n.trim()) return n.trim();
  }
  return null;
}

function payloadCompanyNames(
  payload: Record<string, unknown> | null | undefined,
) {
  const names: string[] = [];
  const br = payload?.brExtract;
  if (br && typeof br === "object" && br !== null) {
    const o = br as { company_name_zh?: unknown; company_name_en?: unknown };
    if (typeof o.company_name_zh === "string") names.push(o.company_name_zh);
    if (typeof o.company_name_en === "string") names.push(o.company_name_en);
  }
  const audited = payload?.auditedExtract;
  if (audited && typeof audited === "object" && audited !== null) {
    const n = (audited as { company_name?: unknown }).company_name;
    if (typeof n === "string") names.push(n);
  }
  const analysis = payload?.analysis;
  if (analysis && typeof analysis === "object" && analysis !== null) {
    const n = (analysis as { companyNameGuess?: unknown }).companyNameGuess;
    if (typeof n === "string") names.push(n);
  }
  return names;
}

/** 分析歸檔是否屬於此客戶 */
export function archiveMatchesCustomer(
  archive: MatchableArchive,
  customer: MatchableCustomer,
) {
  if (archive.customerId && archive.customerId === customer.id) return true;

  const customerNames = [
    customer.companyNameZh,
    customer.companyNameEn,
    customer.applicantNameZh,
    customer.applicantNameEn,
  ];
  const archiveNames = [
    archive.companyName,
    archive.title,
    ...(payloadCompanyNames(archive.payload ?? null) || []),
  ];
  for (const cn of customerNames) {
    for (const an of archiveNames) {
      if (keysOverlap(cn, an)) return true;
    }
  }

  const br = customer.brNumber?.trim();
  if (br) {
    if (archive.summary?.includes(br)) return true;
    if (payloadBrNumber(archive.payload ?? null) === br) return true;
  }

  return false;
}

/** 申請是否屬於此客戶 */
export function applicationMatchesCustomer(
  app: {
    customerId?: string | null;
    email?: string | null;
    companyNameZh?: string | null;
    applicantNameZh?: string | null;
  },
  customer: MatchableCustomer,
) {
  if (app.customerId && app.customerId === customer.id) return true;
  if (
    app.email &&
    customer.email &&
    app.email.trim().toLowerCase() === customer.email.trim().toLowerCase()
  ) {
    return true;
  }
  if (keysOverlap(app.companyNameZh, customer.companyNameZh)) return true;
  if (keysOverlap(app.companyNameZh, customer.companyNameEn)) return true;
  if (keysOverlap(app.applicantNameZh, customer.applicantNameZh)) return true;
  return false;
}

/** 由公司名／BR 猜客戶 id */
export function resolveCustomerIdForArchive(
  customers: MatchableCustomer[],
  hint: {
    customerId?: string | null;
    companyName?: string | null;
    payload?: Record<string, unknown> | null;
    summary?: string | null;
  },
) {
  if (hint.customerId) {
    const hit = customers.find((c) => c.id === hint.customerId);
    if (hit) return hit.id;
  }
  for (const c of customers) {
    if (
      archiveMatchesCustomer(
        {
          customerId: hint.customerId,
          companyName: hint.companyName,
          payload: hint.payload,
          summary: hint.summary,
        },
        c,
      )
    ) {
      return c.id;
    }
  }
  return null;
}
