"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { MobileShell } from "@/components/app/mobile-shell";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/field";
import {
  PageHeader,
  StateBanner,
  Disclaimer,
} from "@/components/ui/layout";

const IDENTITY_KEY = "slf_register_identity";

type IdentityDraft = {
  applicantNameZh: string;
  applicantNameEn: string;
  idNumber: string;
  phone: string;
  email: string;
  title: string;
  relation: "董事" | "股東" | "獲授權代表" | "其他";
};

export default function CompanyPage() {
  const router = useRouter();
  const [identity, setIdentity] = useState<IdentityDraft | null>(null);
  const [companyNameZh, setCompanyNameZh] = useState("智創科技有限公司");
  const [companyNameEn, setCompanyNameEn] = useState(
    "SmartCreate Technology Ltd.",
  );
  const [brNumber, setBrNumber] = useState("12345678");
  const [crNumber, setCrNumber] = useState("7890123");
  const [foundedAt, setFoundedAt] = useState("2018-03-12");
  const [companyType, setCompanyType] = useState("有限公司");
  const [industry, setIndustry] = useState("資訊科技服務");
  const [address, setAddress] = useState(
    "香港九龍觀塘成業街 27 號日昇中心 12 樓 A 室",
  );
  const [employees, setEmployees] = useState(28);
  const [website, setWebsite] = useState("https://smartcreate.example");
  const [contactPerson, setContactPerson] = useState("陳大文");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(IDENTITY_KEY);
      if (!raw) {
        setIdentity(null);
        return;
      }
      const draft = JSON.parse(raw) as IdentityDraft;
      if (!draft.idNumber?.trim() || draft.idNumber.trim().length < 5) {
        setIdentity(null);
        return;
      }
      setIdentity(draft);
      if (draft.applicantNameZh) setContactPerson(draft.applicantNameZh);
    } catch {
      setIdentity(null);
    }
  }, []);

  async function submit() {
    setSaving(true);
    setError(null);
    try {
      if (!identity?.idNumber?.trim() || identity.idNumber.trim().length < 5) {
        setError("必須先填寫身份證號碼。請返回身份確認頁完成註冊資料。");
        setSaving(false);
        return;
      }
      const identityPayload = identity;

      const res = await fetch("/api/admin/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...identityPayload,
          companyNameZh,
          companyNameEn,
          brNumber,
          crNumber,
          foundedAt,
          companyType,
          industry,
          address,
          employees,
          website: website || null,
          contactPerson,
          source: "register",
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        console.warn("customer upsert failed", data);
        sessionStorage.setItem(
          "slf_register_warning",
          data.message || data.error || "客戶資料暫未能寫入後台",
        );
      } else {
        sessionStorage.removeItem("slf_register_warning");
      }

      // 標記帳戶資料已完成（若已登入）
      await fetch("/api/auth/profile/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nameZh: identityPayload.applicantNameZh,
          phone: identityPayload.phone,
        }),
      }).catch(() => null);

      sessionStorage.removeItem(IDENTITY_KEY);
      router.push("/app");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "儲存失敗");
    } finally {
      setSaving(false);
    }
  }

  return (
    <MobileShell>
      <PageHeader
        title="公司基本資料"
        subtitle="P05｜完成後寫入客戶資料庫"
        backHref="/register/identity"
      />
      <main className="space-y-4 px-4 py-5 pb-28">
        <StateBanner
          tone="info"
          title="可選：上載商業登記證"
          description="系統可自動填寫公司名稱、商業登記號碼及地址，再由你確認。"
        />
        {!identity && (
          <StateBanner
            tone="error"
            title="未完成身份資料"
            description="必須填寫身份證號碼後才能完成註冊。請返回身份確認頁。"
          />
        )}
        {error && (
          <StateBanner tone="error" title="無法儲存" description={error} />
        )}

        <Field label="公司中文名稱" required>
          <Input
            value={companyNameZh}
            onChange={(e) => setCompanyNameZh(e.target.value)}
          />
        </Field>
        <Field label="公司英文名稱" required>
          <Input
            value={companyNameEn}
            onChange={(e) => setCompanyNameEn(e.target.value)}
          />
        </Field>
        <Field label="商業登記號碼" required>
          <Input value={brNumber} onChange={(e) => setBrNumber(e.target.value)} />
        </Field>
        <Field label="公司註冊編號" required>
          <Input value={crNumber} onChange={(e) => setCrNumber(e.target.value)} />
        </Field>
        <Field label="公司成立日期" required>
          <Input
            type="date"
            value={foundedAt}
            onChange={(e) => setFoundedAt(e.target.value)}
          />
        </Field>
        <Field label="公司類型" required>
          <Select
            value={companyType}
            onChange={(e) => setCompanyType(e.target.value)}
          >
            <option>有限公司</option>
            <option>獨資</option>
            <option>合夥</option>
          </Select>
        </Field>
        <Field label="業務性質" required>
          <Input value={industry} onChange={(e) => setIndustry(e.target.value)} />
        </Field>
        <Field label="主要營運地址" required>
          <Input value={address} onChange={(e) => setAddress(e.target.value)} />
        </Field>
        <Field label="員工人數" required>
          <Input
            type="number"
            value={employees}
            onChange={(e) => setEmployees(Number(e.target.value))}
          />
        </Field>
        <Field label="公司網站" hint="選填">
          <Input value={website} onChange={(e) => setWebsite(e.target.value)} />
        </Field>
        <Field label="主要聯絡人" required>
          <Input
            value={contactPerson}
            onChange={(e) => setContactPerson(e.target.value)}
          />
        </Field>

        <Disclaimer>
          按「完成」會將申請人及公司資料儲存至後台客戶登記資料庫，並可供 Excel 下載。
        </Disclaimer>

        <Button
          fullWidth
          size="lg"
          disabled={saving || !identity}
          onClick={() => void submit()}
        >
          {saving ? "儲存中…" : "完成並進入首頁"}
        </Button>
        {!identity && (
          <Button
            fullWidth
            variant="outline"
            onClick={() => router.push("/register/identity")}
          >
            返回填寫身份證號碼
          </Button>
        )}
      </main>
    </MobileShell>
  );
}
