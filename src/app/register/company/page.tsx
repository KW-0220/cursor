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
  const [companyNameZh, setCompanyNameZh] = useState("");
  const [companyNameEn, setCompanyNameEn] = useState("");
  const [brNumber, setBrNumber] = useState("");
  const [crNumber, setCrNumber] = useState("");
  const [foundedAt, setFoundedAt] = useState("");
  const [companyType, setCompanyType] = useState("有限公司");
  const [industry, setIndustry] = useState("");
  const [address, setAddress] = useState("");
  const [employees, setEmployees] = useState<number | "">("");
  const [website, setWebsite] = useState("");
  const [contactPerson, setContactPerson] = useState("");
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
      if (
        !companyNameZh.trim() ||
        !companyNameEn.trim() ||
        !brNumber.trim() ||
        !crNumber.trim() ||
        !foundedAt ||
        !industry.trim() ||
        !address.trim() ||
        employees === "" ||
        !contactPerson.trim()
      ) {
        setError("請填妥所有必填公司資料欄位。");
        setSaving(false);
        return;
      }

      const res = await fetch("/api/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...identity,
          companyNameZh: companyNameZh.trim(),
          companyNameEn: companyNameEn.trim(),
          brNumber: brNumber.trim(),
          crNumber: crNumber.trim(),
          foundedAt,
          companyType,
          industry: industry.trim(),
          address: address.trim(),
          employees: Number(employees),
          website: website.trim() || null,
          contactPerson: contactPerson.trim(),
          source: "register",
        }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
        message?: string;
        customer?: { id?: string };
        storage?: string;
      };
      if (!res.ok || !data.ok) {
        setError(
          data.message ||
            data.error ||
            "無法寫入客戶資料庫，請稍後再試（正式環境需設 MySQL 或 Redis）",
        );
        setSaving(false);
        return;
      }

      sessionStorage.setItem(
        "slf_register_ok",
        JSON.stringify({
          customerId: data.customer?.id ?? null,
          storage: data.storage ?? null,
          at: new Date().toISOString(),
        }),
      );
      sessionStorage.removeItem("slf_register_warning");

      await fetch("/api/auth/profile/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nameZh: identity.applicantNameZh,
          phone: identity.phone,
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
        subtitle="P05｜完成後寫入客戶資料庫（供後台／Excel）"
        backHref="/register/identity"
      />
      <main className="space-y-4 px-4 py-5 pb-28">
        <StateBanner
          tone="info"
          title="收集至後台客戶庫"
          description="此頁資料會經 POST /api/customers 寫入「客戶登記資料庫」，可於 /admin/customers 查閱及匯出。"
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
            placeholder="例如：智創科技有限公司"
          />
        </Field>
        <Field label="公司英文名稱" required>
          <Input
            value={companyNameEn}
            onChange={(e) => setCompanyNameEn(e.target.value)}
            placeholder="e.g. SmartCreate Technology Ltd."
          />
        </Field>
        <Field label="商業登記號碼" required>
          <Input
            value={brNumber}
            onChange={(e) => setBrNumber(e.target.value)}
            placeholder="8 位數字"
          />
        </Field>
        <Field label="公司註冊編號" required>
          <Input
            value={crNumber}
            onChange={(e) => setCrNumber(e.target.value)}
            placeholder="CR 編號"
          />
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
          <Input
            value={industry}
            onChange={(e) => setIndustry(e.target.value)}
            placeholder="例如：零售、餐飲、資訊科技"
          />
        </Field>
        <Field label="主要營運地址" required>
          <Input
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="香港地址"
          />
        </Field>
        <Field label="員工人數" required>
          <Input
            type="number"
            min={0}
            value={employees}
            onChange={(e) =>
              setEmployees(
                e.target.value === "" ? "" : Number(e.target.value),
              )
            }
          />
        </Field>
        <Field label="公司網站" hint="選填">
          <Input
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
            placeholder="https://"
          />
        </Field>
        <Field label="主要聯絡人" required>
          <Input
            value={contactPerson}
            onChange={(e) => setContactPerson(e.target.value)}
          />
        </Field>

        <Disclaimer>
          按「完成」會將申請人及公司資料儲存至後台客戶登記資料庫，並可供 Excel
          下載。若寫入失敗會留在本頁，唔會跳過。
        </Disclaimer>

        <Button
          fullWidth
          size="lg"
          disabled={saving || !identity}
          onClick={() => void submit()}
        >
          {saving ? "儲存中…" : "完成並寫入客戶庫"}
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
