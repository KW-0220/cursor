"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { MobileShell } from "@/components/app/mobile-shell";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { PageHeader, Disclaimer, StateBanner } from "@/components/ui/layout";

export default function LoginPage() {
  const [mode, setMode] = useState<"phone" | "email">("phone");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [hint, setHint] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  async function sendCode() {
    setError(null);
    setHint(null);
    const normalized = phone.replace(/\s+/g, "");
    if (!normalized || normalized.replace(/\D/g, "").length < 8) {
      setError("請輸入有效手機號碼（例如 +852 9123 4567）");
      return;
    }
    if (cooldown > 0) return;

    setSending(true);
    try {
      // MVP：本機示範；正式環境改打 SMS／OTP provider
      await new Promise((r) => setTimeout(r, 600));
      setSent(true);
      setCooldown(60);
      setHint("驗證碼已發送（示範：可輸入 123456）");
    } catch {
      setError("暫時未能發送驗證碼，請稍後再試");
    } finally {
      setSending(false);
    }
  }

  const canContinue =
    mode === "email" || (sent && otp.replace(/\D/g, "").length >= 4);

  return (
    <MobileShell>
      <PageHeader title="登入／註冊" subtitle="SME LoanFlow" backHref="/" />
      <main className="flex flex-1 flex-col gap-5 px-4 py-5 pb-28">
        <div className="grid grid-cols-2 rounded-xl bg-surface-2 p-1">
          <button
            type="button"
            className={`rounded-lg py-2 text-sm font-medium ${mode === "phone" ? "bg-surface-1 text-navy-900 shadow-sm" : "text-text-secondary"}`}
            onClick={() => setMode("phone")}
          >
            手機驗證碼
          </button>
          <button
            type="button"
            className={`rounded-lg py-2 text-sm font-medium ${mode === "email" ? "bg-surface-1 text-navy-900 shadow-sm" : "text-text-secondary"}`}
            onClick={() => setMode("email")}
          >
            電郵密碼
          </button>
        </div>

        {error && (
          <StateBanner tone="error" title="無法繼續" description={error} />
        )}
        {hint && !error && (
          <StateBanner tone="success" title="已發送" description={hint} />
        )}

        {mode === "phone" ? (
          <div className="space-y-4">
            <Field label="手機號碼" required hint="將發送一次性驗證碼">
              <Input
                placeholder="+852 9123 4567"
                inputMode="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                autoComplete="tel"
              />
            </Field>

            <Button
              fullWidth
              variant="outline"
              disabled={sending || cooldown > 0}
              onClick={() => void sendCode()}
            >
              {sending
                ? "發送中…"
                : cooldown > 0
                  ? `重新發送（${cooldown}s）`
                  : sent
                    ? "重新發送驗證碼"
                    : "發送驗證碼"}
            </Button>

            <Field
              label="驗證碼"
              required
              hint={sent ? "請輸入短訊收到的 6 位數字" : "請先發送驗證碼"}
            >
              <Input
                placeholder="6 位數字"
                inputMode="numeric"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                disabled={!sent}
                autoComplete="one-time-code"
              />
            </Field>
          </div>
        ) : (
          <div className="space-y-4">
            <Field label="電郵" required>
              <Input type="email" placeholder="you@company.com" />
            </Field>
            <Field label="密碼" required>
              <Input type="password" placeholder="••••••••" />
            </Field>
          </div>
        )}

        <Disclaimer>
          登入即表示你已閱讀並同意
          <a className="mx-1 text-teal-600 underline" href="#">
            私隱政策
          </a>
          、
          <a className="mx-1 text-teal-600 underline" href="#">
            使用條款
          </a>
          及資料處理／第三方分享說明。
        </Disclaimer>

        {canContinue ? (
          <Link href="/register/identity">
            <Button fullWidth size="lg">
              繼續
            </Button>
          </Link>
        ) : (
          <Button
            fullWidth
            size="lg"
            disabled
            onClick={() =>
              setError(
                mode === "phone"
                  ? "請先發送並輸入驗證碼"
                  : "請填寫電郵及密碼",
              )
            }
          >
            繼續
          </Button>
        )}
        <Button fullWidth variant="outline" type="button">
          啟用 Face ID／Touch ID（首次登入後）
        </Button>
      </main>
    </MobileShell>
  );
}
