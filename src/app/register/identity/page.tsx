"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { MobileShell } from "@/components/app/mobile-shell";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/field";
import { PageHeader, Disclaimer, StateBanner } from "@/components/ui/layout";
import { maskId } from "@/lib/utils";

const STORAGE_KEY = "slf_register_identity";

export default function IdentityPage() {
  const router = useRouter();
  const [applicantNameZh, setApplicantNameZh] = useState("");
  const [applicantNameEn, setApplicantNameEn] = useState("");
  const [idNumber, setIdNumber] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [title, setTitle] = useState("董事");
  const [relation, setRelation] = useState<"董事" | "股東" | "獲授權代表" | "其他">(
    "董事",
  );
  const [fromSession, setFromSession] = useState(false);
  const [checking, setChecking] = useState(true);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch("/api/auth/me");
        const data = await res.json();
        if (!res.ok || !data.user) {
          router.replace("/auth/login");
          return;
        }
        setFromSession(true);
        if (data.user.nameZh) setApplicantNameZh(data.user.nameZh);
        if (data.user.email) setEmail(data.user.email);
        if (data.user.phone) setPhone(data.user.phone);
      } catch {
        router.replace("/auth/login");
      } finally {
        setChecking(false);
      }
    })();
  }, [router]);

  function next() {
    setFormError(null);
    if (!applicantNameZh.trim() || !idNumber.trim() || !phone.trim() || !email.trim()) {
      setFormError("請填寫姓名、身份證／護照、電話及電郵");
      return;
    }
    sessionStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        applicantNameZh: applicantNameZh.trim(),
        applicantNameEn: applicantNameEn.trim(),
        idNumber: idNumber.trim(),
        phone: phone.trim(),
        email: email.trim(),
        title: title.trim(),
        relation,
      }),
    );
    router.push("/register/company");
  }

  if (checking) {
    return (
      <MobileShell>
        <PageHeader title="申請人身份確認" subtitle="載入帳戶…" backHref="/auth/login" />
        <main className="px-4 py-8 text-sm text-text-muted">核對登入狀態…</main>
      </MobileShell>
    );
  }

  return (
    <MobileShell>
      <PageHeader
        title="申請人身份確認"
        subtitle="P04｜敏感資料預設遮罩"
        backHref="/auth/login"
      />
      <main className="space-y-4 px-4 py-5 pb-28">
        {fromSession && (
          <StateBanner
            tone="success"
            title="已登入"
            description="姓名／電郵／手機已從帳戶帶入，請補齊身份資料後繼續。"
          />
        )}
        {formError && (
          <StateBanner tone="error" title="資料未齊" description={formError} />
        )}
        <Field label="中文姓名" required>
          <Input
            value={applicantNameZh}
            onChange={(e) => setApplicantNameZh(e.target.value)}
            placeholder="陳大文"
            autoComplete="name"
          />
        </Field>
        <Field label="英文姓名" required>
          <Input
            value={applicantNameEn}
            onChange={(e) => setApplicantNameEn(e.target.value)}
            placeholder="Chan Tai Man"
          />
        </Field>
        <Field
          label="香港身份證／護照號碼"
          required
          hint={idNumber ? `顯示：${maskId(idNumber)}` : undefined}
        >
          <Input
            value={idNumber}
            onChange={(e) => setIdNumber(e.target.value)}
            placeholder="A123456(7)"
          />
        </Field>
        <Field label="聯絡電話" required>
          <Input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+852 9123 4567"
            inputMode="tel"
          />
        </Field>
        <Field label="電郵" required>
          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@company.com"
            autoComplete="email"
          />
        </Field>
        <Field label="公司職位" required>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} />
        </Field>
        <Field label="與申請公司的關係" required>
          <Select
            value={relation}
            onChange={(e) =>
              setRelation(
                e.target.value as "董事" | "股東" | "獲授權代表" | "其他",
              )
            }
          >
            <option>董事</option>
            <option>股東</option>
            <option>獲授權代表</option>
            <option>其他</option>
          </Select>
        </Field>
        <div className="rounded-2xl border border-dashed border-border bg-surface-2/60 p-4 text-sm text-text-secondary">
          上載：身份證明文件；如非董事，請另加授權書。
        </div>
        <Disclaimer>
          資料僅用於貸款申請核實及與合作機構分享（經你明確授權）。完成登記後會寫入後台客戶資料庫。
        </Disclaimer>
        <Button fullWidth size="lg" onClick={next}>
          下一步：公司資料
        </Button>
      </main>
    </MobileShell>
  );
}
