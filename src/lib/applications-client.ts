/**
 * 客戶端申請列表（sessionStorage）
 * 狀態：under_review｜approved｜rejected；失敗可附 failureReason
 */

import {
  normalizeClientAppStatus,
  type ClientAppStatus,
} from "@/lib/application-status";

export type StoredApplication = {
  id: string;
  loanType: "secured" | "unsecured" | "personal_mortgage" | "company_mortgage" | null;
  amount: number;
  purpose: string;
  status: ClientAppStatus | string;
  failureReason?: string | null;
  updatedAt: string;
  createdAt?: string;
  docsPct?: number;
  bankCount?: number;
  tenureYears?: number | null;
  fundingDate?: string | null;
  targetBank?: string | null;
};

const KEY = "slf_applications";

export function loadStoredApplications(): StoredApplication[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = sessionStorage.getItem(KEY);
    const list = raw ? (JSON.parse(raw) as StoredApplication[]) : [];
    if (!Array.isArray(list)) return [];
    let changed = false;
    const normalized = list.map((app) => {
      const status = normalizeClientAppStatus(app.status);
      const failureReason =
        status === "rejected"
          ? (app.failureReason?.trim() || null)
          : null;
      if (app.status !== status || app.failureReason !== failureReason) {
        changed = true;
        return { ...app, status, failureReason };
      }
      return { ...app, status };
    });
    if (changed) saveStoredApplications(normalized);
    return normalized;
  } catch {
    return [];
  }
}

export function saveStoredApplications(apps: StoredApplication[]) {
  sessionStorage.setItem(KEY, JSON.stringify(apps));
}

export function getStoredApplication(id: string): StoredApplication | null {
  return loadStoredApplications().find((a) => a.id === id) ?? null;
}

export function upsertStoredApplication(app: StoredApplication) {
  const list = loadStoredApplications().filter((a) => a.id !== app.id);
  saveStoredApplications([
    {
      ...app,
      status: normalizeClientAppStatus(app.status),
      failureReason:
        normalizeClientAppStatus(app.status) === "rejected"
          ? app.failureReason?.trim() || null
          : null,
    },
    ...list,
  ]);
}

/** 更新狀態（例如後台／同步結果寫回） */
export function patchStoredApplicationStatus(
  id: string,
  status: ClientAppStatus | string,
  failureReason?: string | null,
) {
  const list = loadStoredApplications();
  const next = list.map((app) => {
    if (app.id !== id) return app;
    const normalized = normalizeClientAppStatus(status);
    return {
      ...app,
      status: normalized,
      failureReason:
        normalized === "rejected"
          ? (failureReason?.trim() ||
            app.failureReason?.trim() ||
            "未有提供失敗原因")
          : null,
      updatedAt: new Date().toISOString(),
    };
  });
  saveStoredApplications(next);
  return next.find((a) => a.id === id) ?? null;
}
