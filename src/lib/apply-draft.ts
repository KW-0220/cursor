import type { ApplyDocsState, UploadedMeta } from "@/components/app/apply-documents-upload";
import type { LoanType } from "@/lib/types";

/** 可序列化入 SQL／file store 的草稿欄位（唔含 File binary） */
export type ApplyWizardDraftData = {
  step: number;
  loanType: LoanType | null;
  amount: number | "";
  purpose: string;
  tenureYears: string;
  fundingDate: string;
  targetBank: string;
  extraNotes: string;
  hasExistingLoan: boolean | null;
  lender: string;
  debtType: string;
  facility: string;
  outstanding: string;
  /** 聲明勾選暫存；正式提交仍要主動按掣 */
  consents: Record<string, boolean>;
  docsMeta: {
    br: Omit<UploadedMeta, "file"> | null;
    nar1: Omit<UploadedMeta, "file"> | null;
    identity: Omit<UploadedMeta, "file">[];
    companyOther: Omit<UploadedMeta, "file">[];
    bank: Record<string, Omit<UploadedMeta, "file"> | null>;
    hasAudited: boolean;
  };
};

function stripFile(m: UploadedMeta | null): Omit<UploadedMeta, "file"> | null {
  if (!m) return null;
  return {
    name: m.name,
    size: m.size,
    type: m.type,
    documentId: m.documentId,
  };
}

export function buildDraftData(input: {
  step: number;
  loanType: LoanType | null;
  amount: number | "";
  purpose: string;
  tenureYears: string;
  fundingDate: string;
  targetBank: string;
  extraNotes: string;
  hasExistingLoan: boolean | null;
  lender: string;
  debtType: string;
  facility: string;
  outstanding: string;
  consents: Record<string, boolean>;
  docs: ApplyDocsState;
  bankMonths: string[];
  hasAudited?: boolean;
}): ApplyWizardDraftData {
  return {
    step: input.step,
    loanType: input.loanType,
    amount: input.amount,
    purpose: input.purpose,
    tenureYears: input.tenureYears,
    fundingDate: input.fundingDate,
    targetBank: input.targetBank,
    extraNotes: input.extraNotes,
    hasExistingLoan: input.hasExistingLoan,
    lender: input.lender,
    debtType: input.debtType,
    facility: input.facility,
    outstanding: input.outstanding,
    consents: input.consents,
    docsMeta: {
      br: stripFile(input.docs.br),
      nar1: stripFile(input.docs.nar1),
      identity: input.docs.identity.map((m) => stripFile(m)!),
      companyOther: input.docs.companyOther.map((m) => stripFile(m)!),
      bank: Object.fromEntries(
        input.bankMonths.map((m) => [m, stripFile(input.docs.bank[m] ?? null)]),
      ),
      hasAudited: Boolean(input.hasAudited),
    },
  };
}

export function docsFromMeta(
  meta: ApplyWizardDraftData["docsMeta"] | undefined,
  months: string[],
): ApplyDocsState {
  const emptyBank = Object.fromEntries(months.map((m) => [m, null]));
  if (!meta) {
    return {
      br: null,
      nar1: null,
      identity: [],
      companyOther: [],
      bank: emptyBank,
    };
  }
  return {
    br: meta.br,
    nar1: meta.nar1,
    identity: meta.identity ?? [],
    companyOther: meta.companyOther ?? [],
    bank: {
      ...emptyBank,
      ...(meta.bank ?? {}),
    },
  };
}

export function parseDraftData(
  raw: Record<string, unknown> | null | undefined,
): Partial<ApplyWizardDraftData> {
  if (!raw || typeof raw !== "object") return {};
  return raw as Partial<ApplyWizardDraftData>;
}
