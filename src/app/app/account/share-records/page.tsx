"use client";

import { Suspense } from "react";
import ShareRecordsInner from "./records-inner";

export default function ShareRecordsPage() {
  return (
    <Suspense
      fallback={
        <main className="px-4 py-8 text-sm text-text-muted">載入分享紀錄…</main>
      }
    >
      <ShareRecordsInner />
    </Suspense>
  );
}
