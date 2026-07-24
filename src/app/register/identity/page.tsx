"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { MobileShell } from "@/components/app/mobile-shell";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/field";
import { PageHeader, Disclaimer, StateBanner } from "@/components/ui/layout";
import { maskId } from "@/lib/utils";

const STORAGE_KEY = "slf_register_identity";
const LOGIN_KEY = "slf_login_draft";

export default function IdentityPage() {
  const router = useRouter();
  const [applicantNameZh, setApplicantNameZh] = useState("陳大文");
  const [applicantNameEn, setApplicantNameEn] = useState("Chan Tai Man");
  const [idNumber, setIdNumber] = useState("A123456(7)");
  const [phone, setPhone] = useState("+852 9123 4567");
  const [email, setEmail] = useState("tm.chan@smartcreate.example");
  const [title, setTitle] = useState("董事");
  const [relation, setRelation] = useState<"董事" | "股東" | "獲授權代表" | "其他">(
    "董事",
  );
  const [fromLogin, setFromLogin] = useState(false);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(LOGIN_KEY);
      if (!raw) return;
      const draft = JSON.parse(raw) as {
        mode?: string;
        phone?: string;
        email?: string;
      };
      if (draft.phone) {
        setPhone(draft.phone);
        setFromLogin(true);
      }
      if (draft.email) {
        setEmail(draft.email);
        setFromLogin(true);
      }
    } catch {
      // ignore
    }
  }, []);

  function next() {
    if (!applicantNameZh.trim() || !idNumber.trim() || !phone.trim() || !email.trim()) {
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

  return (
    <MobileShell>
      <PageHeader
        title="申請人身份確認"
        subtitle="P04｜敏感資料預設遮罩"
        backHref="/auth/login"
      />
      <main className="space-y-4 px-4 py-5 pb-28">
        {fromLogin && (
          <StateBanner
            tone="success"
            title="已帶入登入資料"
            description="手機／電郵已從登入頁帶入，請確認身份資料後繼續。"
          />
        )}
        <Field label="中文姓名" required>
          <Input
            value={applicantNameZh}
            onChange={(e) => setApplicantNameZh(e.target.value)}
          />
        </Field>
        <Field label="英文姓名" required>
          <Input
            value={applicantNameEn}
            onChange={(e) => setApplicantNameEn(e.target.value)}
          />
        </Field>
        <Field
          label="香港身份證／護照號碼"
          required
          hint={`顯示：${maskId(idNumber)}`}
        >
          <Input value={idNumber} onChange={(e) => setIdNumber(e.target.value)} />
        </Field>
        <Field label="聯絡電話" required>
          <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
        </Field>
        <Field label="電郵" required>
          <Input value={email} onChange={(e) => setEmail(e.target.value)} />
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
