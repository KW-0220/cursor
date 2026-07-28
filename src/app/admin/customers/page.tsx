"use client";

import { useCallback, useEffect, useState } from "react";
import { Download, RefreshCw, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/field";
import {
  Card,
  Disclaimer,
  SectionHeader,
  StateBanner,
} from "@/components/ui/layout";

type Customer = {
  id: string;
  applicantNameZh: string;
  applicantNameEn: string;
  idNumber: string;
  phone: string;
  email: string;
  title: string;
  relation: string;
  companyNameZh: string;
  companyNameEn: string;
  brNumber: string;
  crNumber: string;
  foundedAt: string;
  companyType: string;
  industry: string;
  address: string;
  employees: number;
  website?: string | null;
  contactPerson: string;
  source?: string;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
};

function maskId(v: string) {
  if (v.length < 5) return v;
  return `${v.slice(0, 1)}***${v.slice(-3)}`;
}

export default function AdminCustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [storageNote, setStorageNote] = useState("");
  const [storage, setStorage] = useState("");
  const [durable, setDurable] = useState(false);
  const [collectFrom, setCollectFrom] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/customers");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "載入失敗");
      setCustomers(data.customers ?? []);
      setStorageNote(data.storageNote ?? data.storage ?? "");
      setStorage(data.storage ?? "");
      setDurable(Boolean(data.durable));
      setCollectFrom(data.collectFrom ?? "POST /api/customers");
    } catch (e) {
      setError(e instanceof Error ? e.message : "載入失敗");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = customers.filter((c) => {
    const s = q.trim().toLowerCase();
    if (!s) return true;
    return [
      c.id,
      c.applicantNameZh,
      c.applicantNameEn,
      c.companyNameZh,
      c.companyNameEn,
      c.brNumber,
      c.email,
      c.phone,
    ]
      .join(" ")
      .toLowerCase()
      .includes(s);
  });

  return (
    <main className="space-y-6 px-4 py-6 lg:px-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-navy-900">客戶登記資料庫</h1>
          <p className="mt-1 text-sm text-text-secondary">
            儲存申請人／公司登記資料，可匯出 Excel（.xlsx）
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => void load()} disabled={loading}>
            <RefreshCw className="mr-1.5 size-4" />
            重新整理
          </Button>
          <a href="/api/admin/customers/export">
            <Button>
              <Download className="mr-1.5 size-4" />
              下載 Excel
            </Button>
          </a>
        </div>
      </div>

      {error && (
        <StateBanner tone="error" title="無法載入" description={error} />
      )}

      <StateBanner
        tone={durable ? "success" : "warning"}
        title={
          durable
            ? `已接持久儲存（${storage}）`
            : "尚未接 MySQL／Redis——前端寫入可能喺 Vercel 唔耐久"
        }
        description={`前端收集：${collectFrom || "POST /api/customers"}（/register/identity → /register/company）。儲存：${storageNote || storage || "—"}。正式環境請設 MYSQL_* 或 UPSTASH_REDIS_REST_*。`}
      />

      <Card className="flex flex-wrap items-center gap-3">
        <div className="flex min-w-[240px] flex-1 items-center gap-2 rounded-xl border border-border bg-surface-1 px-3">
          <Search className="size-4 text-text-muted" />
          <Input
            className="border-0 bg-transparent px-0 shadow-none focus:ring-0"
            placeholder="搜尋編號／姓名／公司／BR／電郵／電話"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        <p className="text-sm text-text-secondary">
          共 <span className="font-semibold text-navy-900">{filtered.length}</span>{" "}
          筆
          {loading ? " · 載入中…" : ""}
        </p>
      </Card>

      <SectionHeader title="登記列表" subtitle="身份證號碼於列表遮罩；Excel 含完整欄位供後台使用" />

      <Card className="overflow-x-auto p-0">
        <table className="w-full min-w-[960px] text-left text-sm">
          <thead className="bg-surface-2 text-xs text-text-muted">
            <tr>
              <th className="px-4 py-3 font-medium">編號</th>
              <th className="px-4 py-3 font-medium">申請人</th>
              <th className="px-4 py-3 font-medium">公司</th>
              <th className="px-4 py-3 font-medium">BR</th>
              <th className="px-4 py-3 font-medium">聯絡</th>
              <th className="px-4 py-3 font-medium">登記時間</th>
              <th className="px-4 py-3 font-medium">來源</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((c) => (
              <tr key={c.id} className="border-t border-border/70">
                <td className="px-4 py-3 font-mono text-xs text-navy-900">
                  {c.id}
                </td>
                <td className="px-4 py-3">
                  <p className="font-medium text-navy-900">{c.applicantNameZh}</p>
                  <p className="text-xs text-text-muted">
                    {c.relation} · {maskId(c.idNumber)}
                  </p>
                </td>
                <td className="px-4 py-3">
                  <p className="font-medium text-navy-900">{c.companyNameZh}</p>
                  <p className="text-xs text-text-muted">{c.industry}</p>
                </td>
                <td className="px-4 py-3 tabular">{c.brNumber}</td>
                <td className="px-4 py-3">
                  <p className="text-xs">{c.phone}</p>
                  <p className="text-xs text-text-muted">{c.email}</p>
                </td>
                <td className="px-4 py-3 text-xs text-text-secondary">
                  {new Date(c.createdAt).toLocaleString("zh-HK")}
                </td>
                <td className="px-4 py-3 text-xs">{c.source ?? "—"}</td>
              </tr>
            ))}
            {!loading && filtered.length === 0 && (
              <tr>
                <td
                  colSpan={7}
                  className="px-4 py-10 text-center text-sm text-text-muted"
                >
                  未有符合的客戶紀錄
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>

      <Disclaimer>
        {storageNote ||
          "客戶資料屬敏感個人資料，下載 Excel 須按角色權限及審計要求處理。正式環境建議接專用資料庫／CRM，並啟用存取紀錄。"}
      </Disclaimer>
    </main>
  );
}
