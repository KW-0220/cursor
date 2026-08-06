import { INTERVIEW_CHECKLIST_BASE } from "./documents";
import { computeCompleteness, createEmptyApplication } from "./completeness";
import {
  emptyClassification,
  emptyProofMeta,
  emptyRelatedCompany,
  type BizApplication,
} from "./types";

/** 相容舊 localStorage／Supabase payload */
export function normalizeApplication(raw: BizApplication): BizApplication {
  const base = createEmptyApplication({ id: raw.id });
  const merged: BizApplication = {
    ...base,
    ...raw,
    classification: {
      ...emptyClassification(),
      ...(raw.classification ?? {}),
    },
    relatedCompany: {
      ...emptyRelatedCompany(),
      ...(raw.relatedCompany ?? {}),
    },
    slotOverrides: raw.slotOverrides ?? {},
    interviewChecklist: {
      ...Object.fromEntries(
        INTERVIEW_CHECKLIST_BASE.map((i) => [i.id, "needed" as const]),
      ),
      ...(raw.interviewChecklist ?? {}),
    },
    extraDocRequests: raw.extraDocRequests ?? [],
    hkBusinessProofs: raw.hkBusinessProofs ?? [
      emptyProofMeta(),
      emptyProofMeta(),
      emptyProofMeta(),
    ],
    relatedInvoices: raw.relatedInvoices ?? [
      emptyProofMeta(),
      emptyProofMeta(),
      emptyProofMeta(),
    ],
    files: raw.files ?? [],
  };
  merged.completeness = computeCompleteness(merged);
  return merged;
}
