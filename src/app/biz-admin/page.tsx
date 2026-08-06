"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { BizStatusBadge, WhatsAppBadge } from "@/components/biz/status";
import { formatDateTime } from "@/lib/bizdoc/completeness";
import { listAdminApplications } from "@/lib/bizdoc/store";
import type { BizApplication, BizApplicationStatus } from "@/lib/bizdoc/types";
import { BIZ_STATUS_LABEL } from "@/lib/bizdoc/types";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/field";

export default function BizAdminListPage() {
  const [apps, setApps] = useState<BizApplication[]>([]);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<"" | BizApplicationStatus>("");

  useEffect(() => {
    setApps(listAdminApplications());
  }, []);

  const filtered = useMemo(() => {
    return apps.filter((a) => {
      if (status && a.status !== status) return false;
      if (!q.trim()) return true;
      const hay = [
        a.id,
        a.applicant.name,
        a.company.nameZh,
        a.applicant.email,
        a.applicant.whatsapp,
      ]
        .join(" ")
        .toLowerCase();
      return hay.includes(q.trim().toLowerCase());
    });
  }, [apps, q, status]);

  const counts = useMemo(() => {
    const map: Record<string, number> = {};
    for (const a of apps) map[a.status] = (map[a.status] || 0) + 1;
    return map;
  }, [apps]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-[color:var(--biz-ink)]">
          申請總覽
        </h2>
        <p className="mt-1 text-sm text-[color:var(--biz-muted)]">
          MVP 使用瀏覽器本機資料；生產環境將接 DB + RBAC。
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {Object.entries(counts).map(([s, n]) => (
          <button
            key={s}
            type="button"
            onClick={() =>
              setStatus((prev) =>
                prev === s ? "" : (s as BizApplicationStatus),
              )
            }
            className="rounded-lg border border-[color:var(--biz-border)] bg-white px-3 py-1.5 text-xs"
          >
            {BIZ_STATUS_LABEL[s as BizApplicationStatus] || s} · {n}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-3">
        <Input
          placeholder="搜尋編號／姓名／公司／電郵／WhatsApp"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="max-w-md"
        />
        <Select
          value={status}
          onChange={(e) =>
            setStatus(e.target.value as "" | BizApplicationStatus)
          }
          className="max-w-xs"
        >
          <option value="">全部狀態</option>
          {Object.entries(BIZ_STATUS_LABEL).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </Select>
      </div>

      {/* Desktop table */}
      <div className="hidden overflow-x-auto rounded-2xl border border-[color:var(--biz-border)] bg-white md:block">
        <table className="w-full min-w-[960px] text-left text-sm">
          <thead className="border-b border-[color:var(--biz-border)] bg-[color:var(--biz-surface-2)] text-xs text-[color:var(--biz-muted)]">
            <tr>
              <th className="px-3 py-3 font-medium">申請編號</th>
              <th className="px-3 py-3 font-medium">客戶／公司</th>
              <th className="px-3 py-3 font-medium">完成度</th>
              <th className="px-3 py-3 font-medium">狀態</th>
              <th className="px-3 py-3 font-medium">補件</th>
              <th className="px-3 py-3 font-medium">負責人</th>
              <th className="px-3 py-3 font-medium">WhatsApp</th>
              <th className="px-3 py-3 font-medium">更新</th>
              <th className="px-3 py-3 font-medium" />
            </tr>
          </thead>
          <tbody>
            {filtered.map((a) => {
              const supplements = a.files.filter((f) =>
                f.status.startsWith("needs") ||
                ["unclear", "expired", "incomplete", "wrong_type", "inconsistent"].includes(
                  f.status,
                ),
              ).length;
              const wa = a.whatsapp[a.whatsapp.length - 1];
              return (
                <tr
                  key={a.id}
                  className="border-b border-[color:var(--biz-border)] last:border-0"
                >
                  <td className="px-3 py-3 font-medium tabular">{a.id}</td>
                  <td className="px-3 py-3">
                    <p>{a.applicant.name || "—"}</p>
                    <p className="text-xs text-[color:var(--biz-muted)]">
                      {a.company.nameZh || "—"}
                    </p>
                  </td>
                  <td className="px-3 py-3 tabular">{a.completeness}%</td>
                  <td className="px-3 py-3">
                    <BizStatusBadge status={a.status} />
                  </td>
                  <td className="px-3 py-3 tabular">{supplements}</td>
                  <td className="px-3 py-3">{a.assignee || "—"}</td>
                  <td className="px-3 py-3">
                    {wa ? <WhatsAppBadge status={wa.status} /> : "—"}
                  </td>
                  <td className="px-3 py-3 text-xs text-[color:var(--biz-muted)]">
                    {formatDateTime(a.updatedAt)}
                  </td>
                  <td className="px-3 py-3">
                    <Link href={`/biz-admin/${a.id}`}>
                      <Button size="sm" variant="outline">
                        查看
                      </Button>
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <ul className="space-y-3 md:hidden">
        {filtered.map((a) => (
          <li
            key={a.id}
            className="rounded-2xl border border-[color:var(--biz-border)] bg-white p-4"
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-medium">{a.company.nameZh || a.id}</p>
                <p className="text-xs text-[color:var(--biz-muted)]">
                  {a.id} · {a.applicant.name}
                </p>
              </div>
              <BizStatusBadge status={a.status} />
            </div>
            <p className="mt-2 text-xs text-[color:var(--biz-muted)]">
              完成度 {a.completeness}% · {formatDateTime(a.updatedAt)}
            </p>
            <Link href={`/biz-admin/${a.id}`} className="mt-3 inline-block">
              <Button size="sm" fullWidth>
                查看申請
              </Button>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
