"use client";

import { useCallback, useEffect, useState } from "react";
import { Download, FileText, RefreshCw, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/field";
import {
  Card,
  Disclaimer,
  SectionHeader,
  StateBanner,
} from "@/components/ui/layout";

type CustomerDoc = {
  id: string;
  kind: string;
  kindLabel: string;
  slot: string;
  fileName: string;
  mimeType: string;
  size: number;
  applicationId: string;
  createdAt: string;
  downloadUrl: string;
};

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
  documents?: CustomerDoc[];
  documentCount?: number;
  applicationIds?: string[];
};

function maskId(v: string) {
  if (v.length < 5) return v;
  return `${v.slice(0, 1)}***${v.slice(-3)}`;
}

function formatSize(n: number) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
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
  const [wiping, setWiping] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);

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
    const hash = window.location.hash.replace(/^#/, "");
    if (hash) setExpanded(hash);
  }, [load]);

  async function wipeAll() {
    const ok = window.confirm(
      "確定清空客戶登記資料庫？\n所有申請人帳戶會一併刪除，必須重新註冊。\n（管理員 admin@sme.com 會保留）",
    );
    if (!ok) return;
    setWiping(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/customers?users=1", {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || data.error || "清空失敗");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "清空失敗");
    } finally {
      setWiping(false);
    }
  }

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
      ...(c.applicationIds ?? []),
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
            登記資料 + 申請時收集的文件（可下載）
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => void load()} disabled={loading}>
            <RefreshCw className="mr-1.5 size-4" />
            重新整理
          </Button>
          <Button
            variant="outline"
            onClick={() => void wipeAll()}
            disabled={wiping || loading}
            className="border-red-300 text-red-700 hover:bg-red-50"
          >
            {wiping ? "清空中…" : "清空資料庫（逼重新註冊）"}
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
        description={`客戶登記：${collectFrom || "POST /api/customers"}。文件於申請提交時上載至 Storage。${storageNote || ""}`}
      />

      <Card className="flex flex-wrap items-center gap-3">
        <div className="flex min-w-[240px] flex-1 items-center gap-2 rounded-xl border border-border bg-surface-1 px-3">
          <Search className="size-4 text-text-muted" />
          <Input
            className="border-0 bg-transparent px-0 shadow-none focus:ring-0"
            placeholder="搜尋編號／姓名／公司／BR／電郵／申請編號"
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

      <SectionHeader
        title="登記列表"
        subtitle="展開可查看已收集文件；點檔名下載"
      />

      <div className="space-y-3">
        {filtered.map((c) => {
          const open = expanded === c.id;
          const docs = c.documents ?? [];
          return (
            <div key={c.id} id={c.id}>
            <Card className="space-y-3">
              <button
                type="button"
                className="flex w-full flex-wrap items-start justify-between gap-3 text-left"
                onClick={() => setExpanded(open ? null : c.id)}
              >
                <div>
                  <p className="font-mono text-xs text-text-muted">{c.id}</p>
                  <p className="mt-1 font-semibold text-navy-900">
                    {c.companyNameZh}
                  </p>
                  <p className="text-sm text-text-secondary">
                    {c.applicantNameZh} · {c.relation} · {maskId(c.idNumber)}
                  </p>
                  <p className="mt-1 text-xs text-text-muted">
                    {c.email} · {c.phone} · BR {c.brNumber}
                  </p>
                </div>
                <div className="text-right">
                  <p className="inline-flex items-center gap-1 rounded-full bg-teal-100 px-2.5 py-1 text-xs font-medium text-teal-800">
                    <FileText className="size-3.5" />
                    文件 {c.documentCount ?? docs.length}
                  </p>
                  <p className="mt-2 text-xs text-text-muted">
                    {open ? "收起" : "展開文件"}
                  </p>
                </div>
              </button>

              {open && (
                <div className="border-t border-border pt-3">
                  <p className="mb-2 text-xs font-medium text-text-muted">
                    已收集文件（存放於此）
                    {(c.applicationIds?.length ?? 0) > 0
                      ? ` · 申請 ${c.applicationIds!.join("、")}`
                      : ""}
                  </p>
                  {docs.length === 0 ? (
                    <p className="text-sm text-text-muted">
                      尚未有上載文件。客戶完成申請並提交後會顯示於此。
                    </p>
                  ) : (
                    <ul className="space-y-2">
                      {docs.map((d) => (
                        <li
                          key={d.id}
                          className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-surface-2 px-3 py-2 text-sm"
                        >
                          <div>
                            <p className="font-medium text-navy-900">
                              {d.kindLabel}
                              <span className="ml-2 text-xs font-normal text-text-muted">
                                {d.slot}
                              </span>
                            </p>
                            <p className="text-xs text-text-secondary">
                              {d.fileName} · {formatSize(d.size)} ·{" "}
                              {d.applicationId}
                            </p>
                          </div>
                          <a href={d.downloadUrl}>
                            <Button size="sm" variant="outline">
                              <Download className="mr-1 size-3.5" />
                              下載
                            </Button>
                          </a>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </Card>
            </div>
          );
        })}
        {!loading && filtered.length === 0 && (
          <Card className="py-10 text-center text-sm text-text-muted">
            未有符合的客戶紀錄
          </Card>
        )}
      </div>

      <Disclaimer>
        {storageNote ||
          "客戶資料及上載文件屬敏感個人資料，下載須按角色權限及審計要求處理。"}
      </Disclaimer>
    </main>
  );
}
