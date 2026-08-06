"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { BIZ_ADMIN_EMAIL } from "@/lib/auth-public";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";

export default function BizAdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState(BIZ_ADMIN_EMAIL);
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hint, setHint] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setHint(null);
    setBusy(true);
    try {
      const boot = await fetch("/api/biz/admin/bootstrap", {
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
        setError(signErr.message || "登入失敗");
        return;
      }

      setHint("登入成功，進入開戶文件通後台…");
      router.push("/biz-admin");
      router.refresh();
    } catch {
      setError("網絡錯誤，請稍後再試");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-dvh items-center justify-center bg-[color:var(--biz-surface-2)] px-4">
      <div className="w-full max-w-md rounded-3xl border border-[color:var(--biz-border)] bg-white p-8 shadow-sm">
        <p className="text-xs tracking-wide text-[color:var(--biz-muted)]">
          開戶文件通 · 獨立後台
        </p>
        <h1 className="mt-2 font-[family-name:var(--font-biz-display)] text-3xl font-semibold text-[color:var(--biz-ink)]">
          文件審核登入
        </h1>
        <p className="mt-2 text-sm text-[color:var(--biz-muted)]">
          此後台與 SME LoanFlow 貸款審批系統完全分離。僅供文件收齊與補件操作。
        </p>

        <form className="mt-8 space-y-4" onSubmit={(e) => void submit(e)}>
          <Field label="管理員電郵">
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="username"
              required
            />
          </Field>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-[color:var(--biz-ink)]">
                密碼
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
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
            />
          </div>

          {error && (
            <p className="rounded-xl bg-danger-100 px-3 py-2 text-sm text-danger-600">
              {error}
            </p>
          )}
          {hint && (
            <p className="text-sm text-[color:var(--biz-forest-700)]">{hint}</p>
          )}

          <Button type="submit" fullWidth disabled={busy}>
            {busy ? "登入中…" : "進入後台"}
          </Button>
        </form>

        <p className="mt-6 text-center text-xs text-[color:var(--biz-muted)]">
          <Link href="/" className="hover:text-[color:var(--biz-forest-800)]">
            ← 返回首頁
          </Link>
        </p>
      </div>
    </div>
  );
}
