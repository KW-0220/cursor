"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type SaveUiStatus =
  | "idle"
  | "dirty"
  | "saving"
  | "saved"
  | "error"
  | "conflict"
  | "offline";

export type DraftApplication = {
  id: string;
  versionNumber: number;
  currentStep: number;
  status: string;
  loanType: "secured" | "unsecured" | null;
  requestedAmount: number | null;
  purpose: string | null;
  completionPercentage: number;
  missingItems: string[];
  nextStepLabel: string | null;
  lastSavedAt: string;
  draftData: Record<string, unknown>;
};

type SaveBody = {
  versionNumber: number;
  loanType?: "secured" | "unsecured" | null;
  requestedAmount?: number | null;
  purpose?: string | null;
  currentStep?: number;
  completionPercentage?: number;
  missingItems?: string[];
  nextStepLabel?: string | null;
  draftData?: Record<string, unknown>;
  mergeDraft?: boolean;
};

/**
 * Auto-save（debounce）＋ Manual save
 * 同意／提交唔經呢度自動做。
 */
export function useApplicationDraft(opts?: {
  debounceMs?: number;
  enabled?: boolean;
}) {
  const debounceMs = opts?.debounceMs ?? 2500;
  const enabled = opts?.enabled ?? true;

  const [app, setApp] = useState<DraftApplication | null>(null);
  const [status, setStatus] = useState<SaveUiStatus>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const [booting, setBooting] = useState(true);
  const [conflictApp, setConflictApp] = useState<DraftApplication | null>(null);

  const versionRef = useRef(1);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingRef = useRef<Partial<SaveBody> | null>(null);
  const appIdRef = useRef<string | null>(null);
  const savingRef = useRef<Promise<boolean> | null>(null);

  const applyServerApp = useCallback((raw: DraftApplication) => {
    setApp(raw);
    appIdRef.current = raw.id;
    versionRef.current = raw.versionNumber;
    setLastSavedAt(raw.lastSavedAt);
  }, []);

  const ensureDraft = useCallback(
    async (resume = true) => {
      if (!enabled) {
        setBooting(false);
        return null;
      }
      try {
        const res = await fetch("/api/applications", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ resume }),
        });
        if (res.status === 401) {
          setBooting(false);
          return null;
        }
        const data = await res.json();
        if (!res.ok || !data.application) {
          setBooting(false);
          return null;
        }
        applyServerApp(data.application as DraftApplication);
        setStatus("saved");
        setBooting(false);
        return data.application as DraftApplication;
      } catch {
        setStatus("offline");
        setBooting(false);
        return null;
      }
    },
    [applyServerApp, enabled],
  );

  useEffect(() => {
    void ensureDraft(true);
  }, [ensureDraft]);

  const flushSave = useCallback(async (manual = false) => {
    if (savingRef.current) return savingRef.current;

    const run = async () => {
      const id = appIdRef.current;
      const pending = pendingRef.current;
      if (!id) return false;
      if (!pending) return true;

      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }

      setStatus("saving");
      setErrorMessage(null);

      const body: SaveBody = {
        versionNumber: versionRef.current,
        mergeDraft: true,
        ...pending,
      };

      try {
        const res = await fetch(`/api/applications/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        const data = await res.json();

        if (res.status === 409 && data.error === "VERSION_CONFLICT") {
          setStatus("conflict");
          setConflictApp(data.application as DraftApplication);
          setErrorMessage(
            data.message || "此申請已在另一部裝置更新。請重新載入最新內容。",
          );
          return false;
        }

        if (!res.ok) {
          setStatus("error");
          setErrorMessage(data.message || data.error || "未能儲存");
          return false;
        }

        pendingRef.current = null;
        applyServerApp(data.application as DraftApplication);
        setStatus("saved");
        if (manual) setLastSavedAt(data.savedAt || data.application.lastSavedAt);
        return true;
      } catch {
        setStatus(navigator.onLine === false ? "offline" : "error");
        setErrorMessage("未能儲存，請重新嘗試");
        return false;
      } finally {
        savingRef.current = null;
      }
    };

    savingRef.current = run();
    return savingRef.current;
  }, [applyServerApp]);

  const queueSave = useCallback(
    (patch: Partial<SaveBody>, immediate = false) => {
      if (!appIdRef.current) return;
      pendingRef.current = { ...(pendingRef.current || {}), ...patch };
      setStatus((s) => (s === "saving" ? s : "dirty"));

      if (immediate) {
        void flushSave(true);
        return;
      }

      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        void flushSave(false);
      }, debounceMs);
    },
    [debounceMs, flushSave],
  );

  const reloadFromConflict = useCallback(() => {
    if (!conflictApp) return;
    applyServerApp(conflictApp);
    pendingRef.current = null;
    setConflictApp(null);
    setStatus("saved");
    setErrorMessage(null);
  }, [applyServerApp, conflictApp]);

  const submit = useCallback(async () => {
    const id = appIdRef.current;
    if (!id) return null;
    // 先 flush pending
    if (pendingRef.current) {
      const ok = await flushSave(true);
      if (!ok) return null;
    }
    const res = await fetch(`/api/applications/${id}?action=submit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ versionNumber: versionRef.current }),
    });
    const data = await res.json();
    if (!res.ok) {
      setStatus("error");
      setErrorMessage(data.message || data.error || "提交失敗");
      return null;
    }
    applyServerApp(data.application as DraftApplication);
    return data.application as DraftApplication;
  }, [applyServerApp, flushSave]);

  const saveAndLeave = useCallback(async () => {
    return flushSave(true);
  }, [flushSave]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  // 頁面隱藏前盡量 flush
  useEffect(() => {
    const onHide = () => {
      if (pendingRef.current && appIdRef.current) {
        void flushSave(false);
      }
    };
    const onVis = () => {
      if (document.visibilityState === "hidden") onHide();
    };
    window.addEventListener("pagehide", onHide);
    document.addEventListener("visibilitychange", onVis);
    return () => {
      window.removeEventListener("pagehide", onHide);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [flushSave]);

  return {
    app,
    booting,
    status,
    errorMessage,
    lastSavedAt,
    conflictApp,
    ensureDraft,
    queueSave,
    flushSave,
    saveAndLeave,
    submit,
    reloadFromConflict,
    setAppFromServer: applyServerApp,
  };
}
