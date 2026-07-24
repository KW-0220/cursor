"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { MobileShell } from "@/components/app/mobile-shell";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { PageHeader, Disclaimer, StateBanner } from "@/components/ui/layout";

const DEMO_OTP = "123456";
const LOGIN_KEY = "slf_login_draft";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"phone" | "email">("phone");
  const [phone, setPhone] = useState("+852 ");
  const [otp, setOtp] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [hint, setHint] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  async function sendCode() {
    setError(null);
    setHint(null);
    const digits = phone.replace(/\D/g, "");
    if (digits.length < 8) {
      setError("請輸入有效手機號碼（例如 +852 9123 4567）");
      return;
    }
    if (cooldown > 0) return;

    setSending(true);
    try {
      // MVP：模擬發送；正式環境接 SMS provider
      await new Promise((r) => setTimeout(r, 400));
      setSent(true);
      setCooldown(60);
      setOtp(DEMO_OTP);
      setHint(`示範環境已自動填入驗證碼 ${DEMO_OTP}，可直接按「繼續註冊」`);
    } catch {
      setError("暫時未能發送驗證碼，請稍後再試");
    } finally {
      setSending(false);
    }
  }

  function continueRegister() {
    setError(null);
    setSubmitting(true);

    try {
      if (mode === "phone") {
        const digits = phone.replace(/\D/g, "");
        if (digits.length < 8) {
          setError("請先輸入有效手機號碼");
          return;
        }
        if (!sent) {
          setError("請先按「發送驗證碼」");
          return;
        }
        const code = otp.replace(/\D/g, "");
        if (code.length < 4) {
          setError("請輸入驗證碼");
          return;
        }
        // 示範：接受 DEMO_OTP；正式環境改為核對 SMS OTP
        if (code !== DEMO_OTP) {
          setError(`驗證碼不正確（示範請用 ${DEMO_OTP}）`);
          return;
        }
        sessionStorage.setItem(
          LOGIN_KEY,
          JSON.stringify({ mode: "phone", phone: phone.trim(), verifiedAt: Date.now() }),
        );
      } else {
        if (!email.trim() || !email.includes("@")) {
          setError("請輸入有效電郵");
          return;
        }
        if (password.trim().length < 4) {
          setError("請輸入密碼（至少 4 位）");
          return;
        }
        sessionStorage.setItem(
          LOGIN_KEY,
          JSON.stringify({
            mode: "email",
            email: email.trim(),
            verifiedAt: Date.now(),
          }),
        );
      }

      router.push("/register/identity");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <MobileShell>
      <PageHeader title="登入／註冊" subtitle="SME LoanFlow" backHref="/" />
      <main className="flex flex-1 flex-col gap-5 px-4 py-5 pb-28">
        <div className="grid grid-cols-2 rounded-xl bg-surface-2 p-1">
          <button
            type="button"
            className={`rounded-lg py-2 text-sm font-medium ${mode === "phone" ? "bg-surface-1 text-navy-900 shadow-sm" : "text-text-secondary"}`}
            onClick={() => {
              setMode("phone");
              setError(null);
            }}
          >
            手機驗證碼
          </button>
          <button
            type="button"
            className={`rounded-lg py-2 text-sm font-medium ${mode === "email" ? "bg-surface-1 text-navy-900 shadow-sm" : "text-text-secondary"}`}
            onClick={() => {
              setMode("email");
              setError(null);
            }}
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
              type="button"
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
              hint={
                sent
                  ? `示範驗證碼：${DEMO_OTP}`
                  : "請先按「發送驗證碼」"
              }
            >
              <Input
                placeholder="6 位數字"
                inputMode="numeric"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                autoComplete="one-time-code"
              />
            </Field>
          </div>
        ) : (
          <div className="space-y-4">
            <Field label="電郵" required>
              <Input
                type="email"
                placeholder="you@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
              />
            </Field>
            <Field label="密碼" required>
              <Input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
              />
            </Field>
          </div>
        )}

        <Disclaimer>
          登入即表示你已閱讀並同意私隱政策、使用條款及資料處理說明。目前為示範環境，手機驗證碼不會真實發送短訊。
        </Disclaimer>

        <Button
          fullWidth
          size="lg"
          type="button"
          disabled={submitting}
          onClick={continueRegister}
        >
          {submitting ? "處理中…" : "繼續註冊"}
        </Button>
        <Button fullWidth variant="outline" type="button">
          啟用 Face ID／Touch ID（首次登入後）
        </Button>
      </main>
    </MobileShell>
  );
}
