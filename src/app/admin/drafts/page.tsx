"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, SectionHeader } from "@/components/ui/layout";
import { formatDateTime, formatHKD } from "@/lib/utils";

type Row = {
  id: string;
  applicantUserId: string;
  loanType: string | null;
  requestedAmount: number | null;
  status: string;
  statusLabel: string;
  completionPercentage: number;
  missingItems: string[];
  lastSavedAt: string;
  documentCount: number;
  expiresAt: string | null;
};

/** A01 後台草稿狀態查詢 */
export default function AdminDraftsPage() {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [mode, setMode] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch("/api/admin/applications");
        const data = await res.json();
        if (!res.ok) {
          setError(data.error || "載入失敗");
          setRows([]);
          return;
        }
        setMode(data.storageMode || "");
        setRows(data.applications || []);
      } catch {
        setError("載入失敗");
        setRows([]);
      }
    })();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-navy-900">申請草稿狀態</h1>
        <p className="mt-1 text-sm text-text-secondary">
          A01｜SQL／file store 草稿查詢
          {mode ? ` · storage=${mode}` : ""}
        </p>
      </div>

      {error && (
        <Card className="border-warning-600/30 bg-warning-100/50 text-sm text-warning-800">
          {error}
        </Card>
      )}

      <Card className="overflow-x-auto p-0">
        <SectionHeader title="全部申請" subtitle="含草稿、填寫中、已提交" />
        {rows === null ? (
          <p className="px-4 pb-4 text-sm text-text-muted">載入中…</p>
        ) : rows.length === 0 ? (
          <p className="px-4 pb-4 text-sm text-text-muted">暫無申請紀錄</p>
        ) : (
          <table className="w-full min-w-[880px] text-left text-sm">
            <thead className="border-y border-border bg-surface-2/80 text-xs text-text-muted">
              <tr>
                {[
                  "申請編號",
                  "用戶",
                  "類型",
                  "金額",
                  "狀態",
                  "完成度",
                  "文件數",
                  "最後儲存",
                ].map((h) => (
                  <th key={h} className="px-4 py-2 font-medium">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-b border-border/70">
                  <td className="px-4 py-2 font-mono text-xs">{r.id}</td>
                  <td className="px-4 py-2 text-xs">{r.applicantUserId}</td>
                  <td className="px-4 py-2">
                    {r.loanType === "secured"
                      ? "有抵押"
                      : r.loanType === "unsecured"
                        ? "無抵押"
                        : "—"}
                  </td>
                  <td className="px-4 py-2 tabular">
                    {typeof r.requestedAmount === "number"
                      ? formatHKD(r.requestedAmount)
                      : "—"}
                  </td>
                  <td className="px-4 py-2">{r.statusLabel}</td>
                  <td className="px-4 py-2">{r.completionPercentage}%</td>
                  <td className="px-4 py-2">{r.documentCount}</td>
                  <td className="px-4 py-2 text-xs">
                    {formatDateTime(r.lastSavedAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      <Link href="/admin" className="text-sm text-teal-700 underline">
        ← 返回案件總覽
      </Link>
    </div>
  );
}
