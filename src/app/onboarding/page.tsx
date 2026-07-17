"use client";

import Link from "next/link";
import { useState } from "react";
import { MobileShell } from "@/components/app/mobile-shell";
import { Button } from "@/components/ui/button";

const slides = [
  {
    title: "找到適合企業的融資方向",
    body: "AI 根據資金用途及企業情況，協助整理申請方向。",
  },
  {
    title: "上載文件，自動整理數據",
    body: "系統從審計報告及銀行結單提取關鍵資料。",
  },
  {
    title: "清楚查看申請進度",
    body: "即時接收補件通知及顧問跟進狀態。",
  },
];

export default function OnboardingPage() {
  const [index, setIndex] = useState(0);
  const slide = slides[index];
  const last = index === slides.length - 1;

  return (
    <MobileShell>
      <main className="flex flex-1 flex-col px-6 pb-8 pt-14">
        <div className="flex-1">
          <p className="text-xs font-medium text-teal-600">
            {index + 1} / {slides.length}
          </p>
          <h1 className="mt-4 text-2xl font-bold leading-snug text-navy-900">
            {slide.title}
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-text-secondary">
            {slide.body}
          </p>
          <div className="mt-10 h-48 rounded-3xl bg-[radial-gradient(circle_at_30%_20%,#14919b22,transparent_50%),linear-gradient(160deg,#12304a,#1a4060)]" />
        </div>
        <div className="mb-6 flex justify-center gap-2">
          {slides.map((_, i) => (
            <span
              key={i}
              className={`h-1.5 rounded-full transition-all ${i === index ? "w-6 bg-navy-900" : "w-1.5 bg-border"}`}
            />
          ))}
        </div>
        <div className="space-y-3">
          {last ? (
            <>
              <Link href="/auth/login">
                <Button fullWidth size="lg">
                  開始申請
                </Button>
              </Link>
              <Link href="/auth/login">
                <Button fullWidth variant="outline" size="lg">
                  已有帳戶？登入
                </Button>
              </Link>
            </>
          ) : (
            <Button fullWidth size="lg" onClick={() => setIndex((v) => v + 1)}>
              繼續
            </Button>
          )}
        </div>
      </main>
    </MobileShell>
  );
}
