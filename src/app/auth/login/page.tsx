"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { MobileShell } from "@/components/app/mobile-shell";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { PageHeader, Disclaimer, StateBanner } from "@/components/ui/layout";

type Mode = "email" | "admin";
type Intent = "register" | "login";

const ADMIN_EMAIL_PREFILL = "admin@sme.com";
const DEMO_APPLICANT_EMAIL = "test@test.com";
const DEMO_APPLICANT_PASSWORD = "100200300";

function PasswordField({
  label,
  required,
  hint,
  value,
  onChange,
  placeholder,
  autoComplete,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  autoComplete?: string;
}) {
  const [show, setShow] = useState(false);
  return (
    <div className="block space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-medium text-text-primary">
          {label}
          {required && <span className="ml-0.5 text-danger-600">*</span>}
        </span>
        <button
          type="button"
          className="shrink-0 text-xs font-medium text-teal-700 hover:underline"
          onClick={() => setShow((v) => !v)}
        >
          {show ? "隱藏密碼" : "顯示密碼"}
        </button>
      </div>
      <Input
        type={show ? "text" : "password"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
      />
      {hint && <span className="block text-xs text-text-muted">{hint}</span>}
    </div>
  );
}

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("email");
  const [intent, setIntent] = useState<Intent>("register");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [nameZh, setNameZh] = useState("");
  const [phone, setPhone] = useState("+852 ");
  const [idNumber, setIdNumber] = useState("");

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

  function enterAdminMode() {
    setMode("admin");
    setIntent("login");
    setEmail(ADMIN_EMAIL_PREFILL);
    setPassword("");
    setError(null);
    setHint(null);
  }

  async function submitAdminSupabase() {
    setError(null);
    setHint(null);
    setBusy(true);
    try {
      const boot = await fetch("/api/admin/bootstrap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const bootData = await boot.json();
      if (!boot.ok) {
        setError(bootData.message || bootData.error || "管理員驗證失敗");
        return;
      }

      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();
      const { error: signErr } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });
      if (signErr) {
        setError(signErr.message || "Supabase 登入失敗");
        return;
      }

      setHint("管理員登入成功（Supabase），正在進入後台…");
      router.push("/admin");
      router.refresh();
    } catch {
      setError("網絡錯誤，請稍後再試");
    } finally {
      setBusy(false);
    }
  }

  async function submitEmail(asAdmin = false) {
    if (asAdmin) {
      await submitAdminSupabase();
      return;
    }
    setError(null);
    setHint(null);
    if (!asAdmin && intent === "register") {
      if (!nameZh.trim()) {
        setError("請輸入中文姓名");
        return;
      }
      if (password.length < 8) {
        setError("密碼至少 8 位");
        return;
      }
      if (!confirmPassword) {
        setError("請再次輸入確認密碼");
        return;
      }
      if (password !== confirmPassword) {
        setError("兩次輸入的密碼不一致");
        return;
      }
      const digits = phone.replace(/\D/g, "");
      if (digits.length < 8) {
        setError("請輸入有效手機號碼（含區號，例如 +852 9123 4567）");
        return;
      }
      if (idNumber.trim().length < 5) {
        setError("請輸入身份證／護照號碼");
        return;
      }
    }
    setBusy(true);
    try {
      const endpoint =
        !asAdmin && intent === "register"
          ? "/api/auth/register"
          : "/api/auth/login";
      const body =
        !asAdmin && intent === "register"
          ? {
              email,
              password,
              nameZh: nameZh.trim(),
              phone: phone.trim(),
              idNumber: idNumber.trim(),
            }
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
      if (asAdmin || data.next === "/admin") {
        setHint("管理員登入成功，正在進入後台…");
        router.push("/admin");
      } else {
        setHint(
          intent === "register" ? "註冊成功，正在進入資料填寫…" : "登入成功",
        );
        router.push(data.next || "/register/identity");
      }
      router.refresh();
    } catch {
      setError("網絡錯誤，請稍後再試");
    } finally {
      setBusy(false);
    }
  }

  return (
    <MobileShell>
      <PageHeader title="登入／註冊" subtitle="SME Clinic" backHref="/" />
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
            className={`rounded-lg py-2 text-sm font-medium ${mode === "admin" ? "bg-surface-1 text-navy-900 shadow-sm" : "text-text-secondary"}`}
            onClick={enterAdminMode}
          >
            管理員登入
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

        {mode === "admin" ? (
          <div className="space-y-4">
            <StateBanner
              tone="info"
              title="內部審批控制台"
              description="使用管理員帳號登入後台。一般客戶請改用「電郵帳戶」。"
            />
            <Field label="管理員電郵" required>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={ADMIN_EMAIL_PREFILL}
                autoComplete="username"
              />
            </Field>
            <PasswordField
              label="密碼"
              required
              value={password}
              onChange={setPassword}
              placeholder="••••••••"
              autoComplete="current-password"
            />
            <Button
              fullWidth
              size="lg"
              disabled={busy}
              onClick={() => void submitEmail(true)}
            >
              {busy ? "登入中…" : "登入後台管理"}
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {intent === "login" && (
              <StateBanner
                tone="info"
                title="示範申請人"
                description={`請用「電郵帳戶 → 登入」（唔好撳管理員）。帳密：${DEMO_APPLICANT_EMAIL} / ${DEMO_APPLICANT_PASSWORD}`}
              />
            )}
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
                placeholder={DEMO_APPLICANT_EMAIL}
                autoComplete="email"
              />
            </Field>
            <PasswordField
              label="密碼"
              required
              hint={intent === "register" ? "至少 8 位" : undefined}
              value={password}
              onChange={setPassword}
              placeholder="••••••••"
              autoComplete={
                intent === "register" ? "new-password" : "current-password"
              }
            />
            {intent === "register" && (
              <PasswordField
                label="確認密碼"
                required
                value={confirmPassword}
                onChange={setConfirmPassword}
                placeholder="再次輸入密碼"
                autoComplete="new-password"
              />
            )}
            {intent === "register" && (
              <Field
                label="手機號碼"
                required
                hint="含區號，例如 +852 9123 4567"
              >
                <Input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+852 9123 4567"
                  inputMode="tel"
                  autoComplete="tel"
                />
              </Field>
            )}
            {intent === "register" && (
              <Field
                label="身份證號碼"
                required
                hint="香港身份證或護照號碼"
              >
                <Input
                  value={idNumber}
                  onChange={(e) => setIdNumber(e.target.value)}
                  placeholder="A123456(7)"
                  autoComplete="off"
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
            <button
              type="button"
              className="w-full text-center text-sm font-medium text-teal-700 hover:underline"
              onClick={enterAdminMode}
            >
              管理員登入 → 後台管理
            </button>
          </div>
        )}

        <Disclaimer>
          電郵註冊會即時建立真實帳戶（密碼經加密儲存，登入狀態以安全 Cookie
          保存）。完成後請填寫身份及公司資料；資料會寫入後台客戶登記資料庫。管理員登入僅供內部審批使用。
        </Disclaimer>
      </main>
    </MobileShell>
  );
}
