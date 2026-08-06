"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";

type Intent = "register" | "login";

function PasswordField({
  label,
  value,
  onChange,
  autoComplete,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  autoComplete?: string;
}) {
  const [show, setShow] = useState(false);
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-[color:var(--biz-ink)]">
          {label}
        </span>
        <button
          type="button"
          className="text-xs text-[color:var(--biz-forest-700)] hover:underline"
          onClick={() => setShow((v) => !v)}
        >
          {show ? "隱藏" : "顯示"}
        </button>
      </div>
      <Input
        type={show ? "text" : "password"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoComplete={autoComplete}
        required
      />
    </div>
  );
}

function BizLoginForm() {
  const router = useRouter();
  const search = useSearchParams();
  const initial: Intent =
    search.get("intent") === "login" ? "login" : "register";

  const [intent, setIntent] = useState<Intent>(initial);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [nameZh, setNameZh] = useState("");
  const [phone, setPhone] = useState("+852 ");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hint, setHint] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setHint(null);

    if (intent === "register") {
      if (!nameZh.trim()) {
        setError("請輸入中文姓名");
        return;
      }
      if (password.length < 8) {
        setError("密碼至少 8 位");
        return;
      }
      if (password !== confirmPassword) {
        setError("兩次輸入的密碼不一致");
        return;
      }
      const digits = phone.replace(/\D/g, "");
      if (digits.length < 8) {
        setError("請輸入有效手機號碼（含區號）");
        return;
      }
    }

    setBusy(true);
    try {
      // Prefer Supabase Auth（與後台同一 session 系統）
      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();

      if (intent === "register") {
        const { error: signErr } = await supabase.auth.signUp({
          email: email.trim().toLowerCase(),
          password,
          options: {
            data: {
              nameZh: nameZh.trim(),
              phone: phone.trim(),
              product: "bizdoc",
            },
          },
        });
        if (signErr) {
          // fallback：本機 auth API（無 Supabase / email 已存在）
          const res = await fetch("/api/auth/register", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              email,
              password,
              nameZh: nameZh.trim(),
              phone: phone.trim(),
              idNumber: "BIZDOC-PENDING",
              product: "bizdoc",
            }),
          });
          const data = await res.json();
          if (!res.ok) {
            setError(signErr.message || data.message || "註冊失敗");
            return;
          }
        }
        setHint("註冊成功，正在進入申請工作台…");
      } else {
        const { error: signErr } = await supabase.auth.signInWithPassword({
          email: email.trim().toLowerCase(),
          password,
        });
        if (signErr) {
          const res = await fetch("/api/auth/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password, product: "bizdoc" }),
          });
          const data = await res.json();
          if (!res.ok) {
            setError(signErr.message || data.message || "登入失敗");
            return;
          }
        }
        setHint("登入成功，正在進入工作台…");
      }

      router.push("/workspace/apply/classify");
      router.refresh();
    } catch {
      setError("網絡錯誤，請稍後再試");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-dvh items-center justify-center bg-[color:var(--biz-surface-2)] px-4 py-10">
      <div className="w-full max-w-md rounded-3xl border border-[color:var(--biz-border)] bg-white p-8 shadow-sm">
        <p className="text-xs tracking-wide text-[color:var(--biz-muted)]">
          開戶文件通 · 客戶帳戶
        </p>
        <h1 className="mt-2 font-[family-name:var(--font-biz-display)] text-3xl font-semibold text-[color:var(--biz-ink)]">
          {intent === "register" ? "建立申請帳戶" : "登入繼續申請"}
        </h1>
        <p className="mt-2 text-sm text-[color:var(--biz-muted)]">
          此登入專用於公司成立及商業戶口文件管理，與 SME LoanFlow
          貸款申請帳戶分開。
        </p>

        <div className="mt-6 grid grid-cols-2 rounded-xl bg-[color:var(--biz-surface-2)] p-1">
          <button
            type="button"
            className={
              intent === "register"
                ? "rounded-lg bg-white py-2 text-sm font-medium text-[color:var(--biz-forest-800)] shadow-sm"
                : "rounded-lg py-2 text-sm text-[color:var(--biz-muted)]"
            }
            onClick={() => {
              setIntent("register");
              setError(null);
            }}
          >
            註冊
          </button>
          <button
            type="button"
            className={
              intent === "login"
                ? "rounded-lg bg-white py-2 text-sm font-medium text-[color:var(--biz-forest-800)] shadow-sm"
                : "rounded-lg py-2 text-sm text-[color:var(--biz-muted)]"
            }
            onClick={() => {
              setIntent("login");
              setError(null);
            }}
          >
            登入
          </button>
        </div>

        <form className="mt-6 space-y-4" onSubmit={(e) => void submit(e)}>
          {intent === "register" && (
            <>
              <Field label="中文姓名">
                <Input
                  value={nameZh}
                  onChange={(e) => setNameZh(e.target.value)}
                  required
                />
              </Field>
              <Field label="手機號碼">
                <Input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                />
              </Field>
            </>
          )}
          <Field label="電郵">
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
            />
          </Field>
          <PasswordField
            label="密碼"
            value={password}
            onChange={setPassword}
            autoComplete={
              intent === "register" ? "new-password" : "current-password"
            }
          />
          {intent === "register" && (
            <PasswordField
              label="確認密碼"
              value={confirmPassword}
              onChange={setConfirmPassword}
              autoComplete="new-password"
            />
          )}

          {error && (
            <p className="rounded-xl bg-danger-100 px-3 py-2 text-sm text-danger-600">
              {error}
            </p>
          )}
          {hint && (
            <p className="text-sm text-[color:var(--biz-forest-700)]">{hint}</p>
          )}

          <Button type="submit" fullWidth disabled={busy}>
            {busy
              ? "處理中…"
              : intent === "register"
                ? "註冊並開始分類"
                : "登入工作台"}
          </Button>
        </form>

        <div className="mt-6 space-y-2 text-center text-xs text-[color:var(--biz-muted)]">
          <p>
            <Link href="/" className="hover:text-[color:var(--biz-forest-800)]">
              ← 返回首頁
            </Link>
            {" · "}
            <Link
              href="/workspace"
              className="hover:text-[color:var(--biz-forest-800)]"
            >
              略過登入，直接進入示範工作台
            </Link>
          </p>
          <p>
            內部審核人員請使用{" "}
            <Link
              href="/biz-admin/login"
              className="text-[color:var(--biz-forest-700)] hover:underline"
            >
              文件審核後台登入
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function WorkspaceLoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-dvh items-center justify-center text-sm text-[color:var(--biz-muted)]">
          載入…
        </div>
      }
    >
      <BizLoginForm />
    </Suspense>
  );
}
