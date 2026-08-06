"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
} from "react";
import type { BizApplication } from "@/lib/bizdoc/types";
import {
  loadClientApplication,
  saveClientApplication,
  submitClientApplication,
} from "@/lib/bizdoc/store";
import { createEmptyApplication } from "@/lib/bizdoc/completeness";

type SaveState = "idle" | "saving" | "saved" | "error" | "offline";

type BizdocCtx = {
  app: BizApplication;
  saveState: SaveState;
  lastSavedAt: string | null;
  update: (updater: (prev: BizApplication) => BizApplication) => void;
  saveNow: () => void;
  submit: () => { ok: true } | { ok: false; error: string };
  hydrated: boolean;
};

const Ctx = createContext<BizdocCtx | null>(null);

let memoryApp: BizApplication | null = null;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((l) => l());
}

const EMPTY_APP = createEmptyApplication({ id: "" });

function getSnapshot(): BizApplication {
  if (typeof window === "undefined") {
    return memoryApp ?? EMPTY_APP;
  }
  if (!memoryApp) memoryApp = loadClientApplication();
  return memoryApp;
}

function getServerSnapshot(): BizApplication {
  return EMPTY_APP;
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export function BizdocProvider({ children }: { children: React.ReactNode }) {
  const app = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const [hydrated, setHydrated] = useState(false);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    memoryApp = loadClientApplication();
    setLastSavedAt(memoryApp.updatedAt);
    setHydrated(true);
    emit();
  }, []);

  useEffect(() => {
    if (!hydrated || !dirty) return;
    setSaveState("saving");
    const t = window.setTimeout(() => {
      if (!navigator.onLine) {
        setSaveState("offline");
        return;
      }
      try {
        if (!memoryApp) return;
        memoryApp = saveClientApplication(memoryApp);
        setLastSavedAt(memoryApp.updatedAt);
        setSaveState("saved");
        setDirty(false);
        emit();
      } catch {
        setSaveState("error");
      }
    }, 600);
    return () => window.clearTimeout(t);
  }, [app, dirty, hydrated]);

  useEffect(() => {
    const onOnline = () => {
      if (dirty && memoryApp) {
        memoryApp = saveClientApplication(memoryApp);
        setSaveState("saved");
        setDirty(false);
        emit();
      }
    };
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (dirty || saveState === "saving") {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("online", onOnline);
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("beforeunload", onBeforeUnload);
    };
  }, [dirty, saveState]);

  const update = useCallback((updater: (prev: BizApplication) => BizApplication) => {
    if (!memoryApp) memoryApp = loadClientApplication();
    memoryApp = updater(memoryApp);
    setDirty(true);
    setSaveState("saving");
    emit();
  }, []);

  const saveNow = useCallback(() => {
    if (!memoryApp) return;
    try {
      memoryApp = saveClientApplication(memoryApp);
      setLastSavedAt(memoryApp.updatedAt);
      setSaveState("saved");
      setDirty(false);
      emit();
    } catch {
      setSaveState("error");
    }
  }, []);

  const submit = useCallback(() => {
    if (!memoryApp) return { ok: false as const, error: "尚未載入申請" };
    try {
      memoryApp = submitClientApplication(memoryApp);
      setLastSavedAt(memoryApp.updatedAt);
      setSaveState("saved");
      setDirty(false);
      emit();
      return { ok: true as const };
    } catch (e) {
      return {
        ok: false as const,
        error: e instanceof Error ? e.message : "提交失敗",
      };
    }
  }, []);

  const value = useMemo(
    () => ({
      app: hydrated && app.id ? app : (memoryApp ?? ({} as BizApplication)),
      saveState,
      lastSavedAt,
      update,
      saveNow,
      submit,
      hydrated,
    }),
    [app, hydrated, lastSavedAt, saveNow, saveState, submit, update],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useBizdoc() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useBizdoc must be used within BizdocProvider");
  return ctx;
}

export function saveLabel(state: SaveState, lastSavedAt: string | null) {
  switch (state) {
    case "saving":
      return "儲存中……";
    case "saved":
      return lastSavedAt
        ? `已自動儲存 · 最後儲存：${new Intl.DateTimeFormat("zh-HK", { timeStyle: "short" }).format(new Date(lastSavedAt))}`
        : "已自動儲存";
    case "error":
      return "儲存失敗，請重新嘗試";
    case "offline":
      return "網絡連線中斷，資料將在恢復連線後同步";
    default:
      return lastSavedAt
        ? `最後儲存：${new Intl.DateTimeFormat("zh-HK", { timeStyle: "short" }).format(new Date(lastSavedAt))}`
        : "";
  }
}
