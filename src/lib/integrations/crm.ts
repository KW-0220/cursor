import "server-only";

/**
 * CRM API 接口（預留）
 * 前端不可直連 CRM；一律經 Backend /api/crm/* 或 server lib 呼叫。
 */

export type CrmLeadStatus =
  | "new"
  | "prescreen_ready"
  | "referred"
  | "in_review"
  | "won"
  | "lost"
  | "nurture";

export interface CrmLead {
  externalId?: string;
  companyName: string;
  contactName?: string;
  phone?: string;
  email?: string;
  loanType?: "secured" | "unsecured";
  amountHkd?: number;
  suitabilityStatus?: "Suitable" | "NotSuitable" | "Incomplete";
  readyForLeadReferral?: boolean;
  notes?: string;
  source?: string;
  metadata?: Record<string, string | number | boolean | null>;
}

export interface CrmLeadRecord extends CrmLead {
  id: string;
  status: CrmLeadStatus;
  createdAt: string;
  updatedAt: string;
  provider: string;
  mode: "stub" | "live";
}

export interface CrmApplicationSyncInput {
  applicationId: string;
  companyName: string;
  status: string;
  amountHkd?: number;
  suitabilityStatus?: string;
  advisorNote?: string;
}

export interface CrmClient {
  readonly provider: string;
  upsertLead(lead: CrmLead): Promise<CrmLeadRecord>;
  getLead(id: string): Promise<CrmLeadRecord | null>;
  syncApplication(
    input: CrmApplicationSyncInput,
  ): Promise<{ ok: boolean; crmRef: string; mode: "stub" | "live" }>;
}

const stubStore = new Map<string, CrmLeadRecord>();

class StubCrmClient implements CrmClient {
  readonly provider = "stub-memory-crm";

  async upsertLead(lead: CrmLead): Promise<CrmLeadRecord> {
    const now = new Date().toISOString();
    const existing = lead.externalId
      ? [...stubStore.values()].find((r) => r.externalId === lead.externalId)
      : undefined;
    const id = existing?.id ?? `CRM-STUB-${Date.now()}`;
    const record: CrmLeadRecord = {
      ...lead,
      id,
      status:
        lead.readyForLeadReferral || lead.suitabilityStatus === "Suitable"
          ? "prescreen_ready"
          : "new",
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
      provider: this.provider,
      mode: "stub",
    };
    stubStore.set(id, record);
    return record;
  }

  async getLead(id: string) {
    return stubStore.get(id) ?? null;
  }

  async syncApplication(input: CrmApplicationSyncInput) {
    const crmRef = `STUB-APP-${input.applicationId}`;
    return { ok: true, crmRef, mode: "stub" as const };
  }
}

/**
 * 工廠：之後可用 CRM_PROVIDER=hubspot|salesforce|custom 切換。
 * Env 預留：CRM_API_URL / CRM_API_KEY / CRM_PIPELINE_ID
 */
export function getCrmClient(): CrmClient {
  const provider = process.env.CRM_PROVIDER?.trim() || "stub";
  void provider;
  return new StubCrmClient();
}
