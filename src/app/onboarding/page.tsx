"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { MobileShell } from "@/components/app/mobile-shell";
import { Button } from "@/components/ui/button";

const slides = [
  {
    title: "找到適合企業的融資方向",
    body: "AI 根據資金用途及企業情況，協助整理申請方向。",
    image: "/onboarding/01-finance.webp",
    alt: "企業主查看融資方案示意",
  },
  {
    title: "上載文件，自動整理數據",
    body: "系統從商業登記、NAR1 及銀行月結單提取關鍵資料。",
    image: "/onboarding/02-documents.webp",
    alt: "上載文件並由 AI 分析示意",
  },
  {
    title: "清楚查看申請進度",
    body: "即時接收補件通知及顧問跟進狀態。",
    image: "/onboarding/03-progress.webp",
    alt: "申請進度時間線示意",
  },
];

export default function OnboardingPage() {
  const [index, setIndex] = useState(0);
  const slide = slides[index];
  const last = index === slides.length - 1;

  return (
    <MobileShell>
      <main className="flex flex-1 flex-col pb-8">
        <div className="relative h-[42vh] min-h-[220px] w-full overflow-hidden bg-navy-900">
          <Image
            key={slide.image}
            src={slide.image}
            alt={slide.alt}
            fill
            priority
            sizes="(max-width: 430px) 100vw, 430px"
            className="object-cover animate-fade-up"
          />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-navy-950/55 via-transparent to-navy-950/10" />
          <p className="absolute left-6 top-10 z-10 text-xs font-medium tracking-wide text-teal-100 animate-fade-up">
            {index + 1} / {slides.length}
          </p>
        </div>

        <div className="flex flex-1 flex-col px-6 pt-6">
          <h1
            key={`t-${index}`}
            className="text-2xl font-bold leading-snug text-navy-900 animate-fade-up"
          >
            {slide.title}
          </h1>
          <p
            key={`b-${index}`}
            className="mt-3 text-sm leading-relaxed text-text-secondary animate-fade-up"
            style={{ animationDelay: "80ms" }}
          >
            {slide.body}
          </p>

          <div className="mt-auto space-y-5 pt-8">
            <div className="flex justify-center gap-2">
              {slides.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  aria-label={`前往第 ${i + 1} 頁`}
                  onClick={() => setIndex(i)}
                  className={`h-1.5 rounded-full transition-all ${
                    i === index ? "w-6 bg-navy-900" : "w-1.5 bg-border"
                  }`}
                />
              ))}
            </div>

            {last ? (
              <div className="space-y-3 animate-fade-up">
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
              </div>
            ) : (
              <Button
                fullWidth
                size="lg"
                onClick={() => setIndex((v) => v + 1)}
              >
                繼續
              </Button>
            )}
          </div>
        </div>
      </main>
    </MobileShell>
  );
}
