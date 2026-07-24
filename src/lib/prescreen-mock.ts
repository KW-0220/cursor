import type {
  BankStatementMonth,
  BrCertificate,
  IdDocuments,
  Nar1Return,
  PrescreenResult,
} from "./prescreen";
import { evaluatePrescreen } from "./prescreen";

export const demoIdDocs: IdDocuments = {
  front: "ok",
  back: "ok",
  addressProofMonths: ["2026-04", "2026-05", "2026-06"],
  addressProofStatus: "ok",
  maskedId: "A123***（*）",
};

export const demoStatements: BankStatementMonth[] = [
  { month: "2026-01", totalCreditsHkd: 1390000, sourcePages: [1, 2], confidence: 0.9 },
  { month: "2026-02", totalCreditsHkd: 1460000, sourcePages: [1, 2], confidence: 0.88 },
  { month: "2026-03", totalCreditsHkd: 1500000, sourcePages: [1, 3], confidence: 0.86 },
  { month: "2026-04", totalCreditsHkd: 1480000, sourcePages: [1], confidence: 0.91 },
  { month: "2026-05", totalCreditsHkd: 1520000, sourcePages: [1, 2], confidence: 0.9 },
  { month: "2026-06", totalCreditsHkd: 1550000, sourcePages: [1, 2], confidence: 0.92 },
];

export const demoBr: BrCertificate = {
  brNumber: "12345678",
  companyNameZh: "智創科技有限公司",
  expiryDate: "2027-03-12",
  status: "ok",
  sourcePages: [1],
};

export const demoNar1: Nar1Return = {
  filingDate: "2025-11-20",
  status: "ok",
  sourcePages: [2, 3],
  directorsAndShareholders: [
    { name: "陳大文", role: "董事兼股東", sharePercent: 60 },
    { name: "李美華", role: "股東", sharePercent: 40 },
  ],
};

export function getDemoPrescreen(overrides?: {
  expiredBr?: boolean;
  missingId?: boolean;
  thinStatements?: boolean;
}): PrescreenResult {
  return evaluatePrescreen({
    idDocs: overrides?.missingId
      ? { ...demoIdDocs, front: "missing", back: "missing" }
      : demoIdDocs,
    statements: overrides?.thinStatements
      ? demoStatements.slice(0, 1)
      : demoStatements,
    br: overrides?.expiredBr
      ? { ...demoBr, expiryDate: "2024-01-01", status: "expired" }
      : demoBr,
    nar1: demoNar1,
    requiredStatementMonths: 3,
  });
}
