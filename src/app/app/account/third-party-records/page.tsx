"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** 舊路徑轉向新「資料分享及授權紀錄」 */
export default function LegacyThirdPartyRecordsRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/app/account/share-records");
  }, [router]);
  return (
    <main className="px-4 py-8 text-sm text-text-muted">
      正在前往資料分享及授權紀錄…
    </main>
  );
}
