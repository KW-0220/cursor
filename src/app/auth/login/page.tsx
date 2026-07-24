"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { MobileShell } from "@/components/app/mobile-shell";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { PageHeader, Disclaimer, StateBanner } from "@/components/ui/layout";

type Mode = "email" | "phone";
type Intent = "register" | "login";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("email");
  const [intent, setIntent] = useState<Intent>("register");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [nameZh, setNameZh] = useState("");
  const [phone, setPhone] = useState("+852 ");
  const [otp, setOtp] = useState("");
  const [sent, setSent] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hint, setHint] = useState<string | null>(null);
  const [storageWarning, setStorageWarning] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch("/api/auth/status");
        const data = await res.json();
        if (data.warning) setStorageWarning(data.warning);
      } catch {
        // ignore
      }
    })();
  }, []);

  async function submitEmail() {
    setError(null);
    setHint(null);
    setBusy(true);
    try {
      const endpoint =
        intent === "register" ? "/api/auth/register" : "/api/auth/login";
      const body =
        intent === "register"
          ? { email, password, nameZh: nameZh || undefined, phone: phone.trim() || undefined }
          : { email, password };

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message || data.error || "操作失敗");
        return;
      }
      setHint(intent === "register" ? "註冊成功，正在進入資料填寫…" : "登入成功");
      router.push(data.next || "/register/identity");
      router.refresh();
    } catch {
      setError("網絡錯誤，請稍後再試");
    } finally {
      setBusy(false);
    }
  }

  async function sendOtp() {
    setError(null);
    setHint(null);
    const digits = phone.replace(/\D/g, "");
    if (digits.length < 8) {
      setError("請輸入有效手機號碼（含區號，例如 +852 9123 4567）");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/auth/otp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: phone.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message || "無法發送驗證碼");
        if (data.error === "SMS_NOT_CONFIGURED") {
          setMode("email");
          setIntent("register");
        }
        return;
      }
      setSent(true);
      setCooldown(60);
      setHint("驗證碼已經短訊發送，請查收並輸入");
      const timer = setInterval(() => {
        setCooldown((c) => {
          if (c <= 1) {
            clearInterval(timer);
            return 0;
          }
          return c - 1;
        });
      }, 1000);
    } catch {
      setError("網絡錯誤，請稍後再試");
    } finally {
      setBusy(false);
    }
  }

  async function verifyOtp() {
    setError(null);
    setBusy(true);
    try {
      const res = await fetch("/api/auth/otp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: phone.trim(),
          code: otp.trim(),
          email: email.trim() || undefined,
          password: password || undefined,
          nameZh: nameZh || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message || "驗證失敗");
        return;
      }
      router.push(data.next || "/register/identity");
      router.refresh();
    } catch {
      setError("網絡錯誤，請稍後再試");
    } finally {
      setBusy(false);
    }
  }

  return (
    <MobileShell>
      <PageHeader title="登入／註冊" subtitle="SME LoanFlow" backHref="/" />
      <main className="flex flex-1 flex-col gap-5 px-4 py-5 pb-28">
        <div className="grid grid-cols-2 rounded-xl bg-surface-2 p-1">
          <button
            type="button"
            className={`rounded-lg py-2 text-sm font-medium ${mode === "email" ? "bg-surface-1 text-navy-900 shadow-sm" : "text-text-secondary"}`}
            onClick={() => {
              setMode("email");
              setError(null);
            }}
          >
            電郵帳戶
          </button>
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
        </div>

        {mode === "email" && (
          <div className="grid grid-cols-2 rounded-xl bg-surface-2 p-1">
            <button
              type="button"
              className={`rounded-lg py-2 text-sm font-medium ${intent === "register" ? "bg-navy-900 text-white" : "text-text-secondary"}`}
              onClick={() => setIntent("register")}
            >
              註冊
            </button>
            <button
              type="button"
              className={`rounded-lg py-2 text-sm font-medium ${intent === "login" ? "bg-navy-900 text-white" : "text-text-secondary"}`}
              onClick={() => setIntent("login")}
            >
              登入
            </button>
          </div>
        )}

        {error && (
          <StateBanner tone="error" title="無法繼續" description={error} />
        )}
        {hint && !error && (
          <StateBanner tone="success" title="成功" description={hint} />
        )}
        {storageWarning && (
          <StateBanner
            tone="warning"
            title="帳戶儲存提示"
            description={storageWarning}
          />
        )}

        {mode === "email" ? (
          <div className="space-y-4">
            {intent === "register" && (
              <Field label="中文姓名" required>
                <Input
                  value={nameZh}
                  onChange={(e) => setNameZh(e.target.value)}
                  placeholder="陳大文"
                  autoComplete="name"
                />
              </Field>
            )}
            <Field label="電郵" required>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                autoComplete="email"
              />
            </Field>
            <Field
              label="密碼"
              required
              hint={intent === "register" ? "至少 8 位" : undefined}
            >
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete={
                  intent === "register" ? "new-password" : "current-password"
                }
              />
            </Field>
            {intent === "register" && (
              <Field label="手機號碼（選填）">
                <Input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+852 9123 4567"
                  inputMode="tel"
                />
              </Field>
            )}
            <Button
              fullWidth
              size="lg"
              disabled={busy}
              onClick={() => void submitEmail()}
            >
              {busy
                ? "處理中…"
                : intent === "register"
                  ? "建立帳戶並繼續"
                  : "登入"}
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <StateBanner
              tone="info"
              title="手機短訊驗證"
              description="需已設定 Twilio Verify。若尚未啟用，請改用「電郵帳戶」註冊（可立即使用）。"
            />
            <Field label="手機號碼" required>
              <Input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+852 9123 4567"
                inputMode="tel"
                autoComplete="tel"
              />
            </Field>
            <Button
              fullWidth
              variant="outline"
              disabled={busy || cooldown > 0}
              onClick={() => void sendOtp()}
            >
              {cooldown > 0 ? `重新發送（${cooldown}s）` : sent ? "重新發送驗證碼" : "發送驗證碼"}
            </Button>
            <Field label="驗證碼" required>
              <Input
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                placeholder="6 位數字"
                inputMode="numeric"
                autoComplete="one-time-code"
              />
            </Field>
            <Field label="電郵（建議填寫，方便之後登入）">
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
              />
            </Field>
            <Button
              fullWidth
              size="lg"
              disabled={busy || !sent}
              onClick={() => void verifyOtp()}
            >
              {busy ? "核對中…" : "驗證並繼續"}
            </Button>
          </div>
        )}

        <Disclaimer>
          電郵註冊會即時建立真實帳戶（密碼經加密儲存，登入狀態以安全 Cookie
          保存）。完成後請填寫身份及公司資料；資料會寫入後台客戶登記資料庫。
        </Disclaimer>
      </main>
    </MobileShell>
  );
}
