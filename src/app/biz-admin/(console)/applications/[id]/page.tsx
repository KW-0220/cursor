"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import {
  BizDocBadge,
  BizProgressBar,
  BizStatusBadge,
  WhatsAppBadge,
} from "@/components/biz/status";
import { Button } from "@/components/ui/button";
import { Field, Select, Textarea } from "@/components/ui/field";
import {
  canConfirmDocsComplete,
  formatDateTime,
  maskIdNumber,
} from "@/lib/bizdoc/completeness";
import { BIZ_DOC_SLOTS } from "@/lib/bizdoc/documents";
import {
  DOC_ISSUE_REASONS,
  type BizApplication,
} from "@/lib/bizdoc/types";

const TABS = [
  "概覽",
  "客戶資料",
  "董事股東",
  "公司文件",
  "業務證明",
  "補件",
  "WhatsApp",
  "內部備註",
  "操作記錄",
] as const;

async function postAction(body: Record<string, unknown>) {
  const res = await fetch("/api/biz/admin/applications", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = await res.json();
  if (!res.ok) {
    throw new Error(json.message || json.error || "操作失敗");
  }
  return json.application as BizApplication;
}

export default function BizAdminDetailPage() {
  const params = useParams<{ id: string }>();
  const id = decodeURIComponent(params.id);
  const [app, setApp] = useState<BizApplication | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<(typeof TABS)[number]>("概覽");
  const [issueType, setIssueType] = useState<string>(DOC_ISSUE_REASONS[0]);
  const [issueReason, setIssueReason] = useState("");
  const [selectedFile, setSelectedFile] = useState<string>("");
  const [note, setNote] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/biz/admin/applications?id=${encodeURIComponent(id)}`,
        { cache: "no-store" },
      );
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || json.error || "載入失敗");
      setApp(json.application);
    } catch (e) {
      setApp(null);
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void reload();
  }, [reload]);

  if (loading) {
    return (
      <p className="text-sm text-[color:var(--biz-muted)]">載入 Supabase…</p>
    );
  }

  if (!app) {
    return (
      <div className="rounded-2xl border border-dashed border-[color:var(--biz-border)] bg-white px-6 py-16 text-center text-sm text-[color:var(--biz-muted)]">
        {error || `找不到申請 ${id}`}
        <div className="mt-4">
          <Link href="/biz-admin/applications">
            <Button variant="outline">返回列表</Button>
          </Link>
        </div>
      </div>
    );
  }

  const canComplete = canConfirmDocsComplete(app);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link
            href="/biz-admin/applications"
            className="text-xs text-[color:var(--biz-forest-700)]"
          >
            ← 申請列表
          </Link>
          <h2 className="mt-2 text-xl font-semibold">
            {app.company.nameZh || "未命名公司"}
          </h2>
          <p className="text-sm text-[color:var(--biz-muted)]">
            {app.id} · {app.applicant.name} · {app.applicant.whatsapp}
          </p>
        </div>
        <BizStatusBadge status={app.status} />
      </div>

      <div className="flex flex-wrap gap-2 rounded-2xl border border-[color:var(--biz-border)] bg-white p-3">
        <Button
          size="sm"
          variant="outline"
          onClick={() => {
            void (async () => {
              try {
                const next = await postAction({
                  action: "set_status",
                  id: app.id,
                  status: "doc_review",
                  assignee: app.assignee || "林雅雯",
                });
                setApp(next);
                setMessage("已開始檢查（已寫入 Supabase）");
              } catch (e) {
                setMessage(e instanceof Error ? e.message : "失敗");
              }
            })();
          }}
        >
          開始檢查
        </Button>
        <Button
          size="sm"
          disabled={!canComplete}
          title={
            canComplete
              ? undefined
              : "仍有必須文件未通過／未檢查，不可確認收齊"
          }
          onClick={() => {
            void (async () => {
              try {
                const next = await postAction({
                  action: "confirm_docs_complete",
                  id: app.id,
                  actor: app.assignee || "林雅雯",
                });
                setApp(next);
                setMessage("已確認文件收齊，並發送 WhatsApp 通知");
              } catch (e) {
                setMessage(e instanceof Error ? e.message : "失敗");
              }
            })();
          }}
        >
          確認文件已收齊
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => {
            void (async () => {
              try {
                const next = await postAction({
                  action: "set_status",
                  id: app.id,
                  status: "next_stage",
                });
                setApp(next);
                setMessage("已進入下一階段（仍非開戶獲批）");
              } catch (e) {
                setMessage(e instanceof Error ? e.message : "失敗");
              }
            })();
          }}
        >
          進入下一階段
        </Button>
      </div>

      {message && (
        <p className="text-sm text-[color:var(--biz-forest-700)]">{message}</p>
      )}

      <div className="flex gap-1 overflow-x-auto border-b border-[color:var(--biz-border)] pb-px">
        {TABS.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={
              tab === t
                ? "shrink-0 border-b-2 border-[color:var(--biz-forest-800)] px-3 py-2 text-sm font-medium text-[color:var(--biz-forest-800)]"
                : "shrink-0 px-3 py-2 text-sm text-[color:var(--biz-muted)]"
            }
          >
            {t}
          </button>
        ))}
      </div>

      <div className="rounded-2xl border border-[color:var(--biz-border)] bg-white p-5">
        {tab === "概覽" && (
          <div className="space-y-4">
            <BizProgressBar value={app.completeness} />
            <div className="grid gap-3 sm:grid-cols-3">
              <Stat label="已上載文件" value={String(app.files.length)} />
              <Stat
                label="已通過"
                value={String(
                  app.files.filter((f) => f.status === "approved").length,
                )}
              />
              <Stat
                label="需補件"
                value={String(
                  app.files.filter((f) => f.status === "needs_resubmit").length,
                )}
              />
            </div>
            <p className="text-sm text-[color:var(--biz-muted)]">
              負責人：{app.assignee || "未指派"} · 最近更新{" "}
              {formatDateTime(app.updatedAt)}
            </p>
          </div>
        )}

        {tab === "客戶資料" && (
          <dl className="grid gap-3 text-sm sm:grid-cols-2">
            <Item label="聯絡人" value={app.applicant.name} />
            <Item label="關係" value={app.applicant.relation} />
            <Item label="電郵" value={app.applicant.email} />
            <Item label="電話" value={app.applicant.phone} />
            <Item label="WhatsApp" value={app.applicant.whatsapp} />
            <Item label="公司中文" value={app.company.nameZh} />
            <Item label="公司英文" value={app.company.nameEn} />
            <Item label="BR" value={app.company.brNumber} />
            <Item label="CR" value={app.company.crNumber} />
            <Item label="業務性質" value={app.company.nature} />
          </dl>
        )}

        {tab === "董事股東" && (
          <div className="space-y-6 text-sm">
            <div>
              <h3 className="font-semibold">董事</h3>
              <ul className="mt-2 space-y-2">
                {app.directors.map((d) => (
                  <li
                    key={d.id}
                    className="rounded-xl border border-[color:var(--biz-border)] px-3 py-2"
                  >
                    {d.nameZh || d.nameEn} · {d.idType}{" "}
                    {maskIdNumber(d.idNumber)} · {d.residenceCountry}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="font-semibold">股東</h3>
              <ul className="mt-2 space-y-2">
                {app.shareholders.map((s) => (
                  <li
                    key={s.id}
                    className="rounded-xl border border-[color:var(--biz-border)] px-3 py-2"
                  >
                    {s.name}（{s.type}）· {s.sharePercent}%
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {(tab === "公司文件" || tab === "業務證明") && (
          <div className="space-y-4">
            {app.files
              .filter((f) => {
                const slot = BIZ_DOC_SLOTS.find((s) => s.id === f.slotId);
                if (!slot) return false;
                if (tab === "公司文件")
                  return ["company", "identity", "address"].includes(
                    slot.category,
                  );
                return ["business_proof", "business_alt"].includes(
                  slot.category,
                );
              })
              .map((f) => {
                const slot = BIZ_DOC_SLOTS.find((s) => s.id === f.slotId);
                return (
                  <div
                    key={f.id}
                    className="rounded-xl border border-[color:var(--biz-border)] p-4"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <p className="font-medium">{f.originalName}</p>
                        <p className="text-xs text-[color:var(--biz-muted)]">
                          {slot?.name} · v{f.version} ·{" "}
                          {formatDateTime(f.uploadedAt)}
                        </p>
                      </div>
                      <BizDocBadge status={f.status} />
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          void (async () => {
                            const next = await postAction({
                              action: "set_file_status",
                              id: app.id,
                              fileId: f.id,
                              status: "approved",
                            });
                            setApp(next);
                            setMessage(`已標示通過：${f.originalName}`);
                          })();
                        }}
                      >
                        標示已通過
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setSelectedFile(f.id)}
                      >
                        標示需要補件
                      </Button>
                    </div>
                  </div>
                );
              })}

            {selectedFile && (
              <div className="rounded-xl border border-[color:var(--biz-gold-600)]/40 bg-[color:var(--biz-gold-100)]/30 p-4">
                <h4 className="text-sm font-semibold">發出補件要求</h4>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <Field label="問題原因">
                    <Select
                      value={issueType}
                      onChange={(e) => setIssueType(e.target.value)}
                    >
                      {DOC_ISSUE_REASONS.map((r) => (
                        <option key={r} value={r}>
                          {r}
                        </option>
                      ))}
                    </Select>
                  </Field>
                  <div className="sm:col-span-2">
                    <Field label="補件說明（客戶可見）">
                      <Textarea
                        value={issueReason}
                        onChange={(e) => setIssueReason(e.target.value)}
                      />
                    </Field>
                  </div>
                </div>
                <div className="mt-3 flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => {
                      void (async () => {
                        if (!issueReason.trim()) {
                          setMessage("請填寫補件說明");
                          return;
                        }
                        const next = await postAction({
                          action: "request_supplement",
                          id: app.id,
                          fileId: selectedFile,
                          issueType,
                          issueReason,
                        });
                        setApp(next);
                        setSelectedFile("");
                        setIssueReason("");
                        setMessage("已發出補件要求並寫入 Supabase");
                      })();
                    }}
                  >
                    發送 WhatsApp 補件通知
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setSelectedFile("")}
                  >
                    取消
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        {tab === "補件" && (
          <ul className="space-y-3 text-sm">
            {app.files
              .filter((f) => f.status === "needs_resubmit")
              .map((f) => (
                <li
                  key={f.id}
                  className="rounded-xl border border-[color:var(--biz-border)] px-3 py-3"
                >
                  <p className="font-medium">{f.originalName}</p>
                  <p className="mt-1 text-[color:var(--biz-gold-800)]">
                    {f.issueType} — {f.issueReason}
                  </p>
                </li>
              ))}
            {app.files.every((f) => f.status !== "needs_resubmit") && (
              <p className="text-[color:var(--biz-muted)]">目前沒有補件項目</p>
            )}
          </ul>
        )}

        {tab === "WhatsApp" && (
          <ul className="space-y-3">
            {app.whatsapp.map((w) => (
              <li
                key={w.id}
                className="rounded-xl border border-[color:var(--biz-border)] px-3 py-3 text-sm"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs text-[color:var(--biz-muted)]">
                    {w.type} · {formatDateTime(w.sentAt)} · {w.phone}
                  </span>
                  <WhatsAppBadge status={w.status} />
                </div>
                <p className="mt-2">{w.content}</p>
              </li>
            ))}
          </ul>
        )}

        {tab === "內部備註" && (
          <div className="space-y-4">
            <Field label="新增內部備註（只限內部）">
              <Textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            </Field>
            <Button
              size="sm"
              onClick={() => {
                void (async () => {
                  if (!note.trim()) return;
                  const next = await postAction({
                    action: "add_note",
                    id: app.id,
                    content: note,
                    author: app.assignee || "審核員",
                  });
                  setApp(next);
                  setNote("");
                })();
              }}
            >
              新增內部備註
            </Button>
            <ul className="space-y-2 text-sm">
              {app.internalNotes.map((n) => (
                <li
                  key={n.id}
                  className="rounded-xl bg-[color:var(--biz-surface-2)] px-3 py-2"
                >
                  <p className="text-xs text-[color:var(--biz-muted)]">
                    {n.author} · {formatDateTime(n.createdAt)}
                  </p>
                  <p className="mt-1">{n.content}</p>
                </li>
              ))}
            </ul>
          </div>
        )}

        {tab === "操作記錄" && (
          <ul className="space-y-2 text-sm">
            {[...app.auditLog].reverse().map((a) => (
              <li
                key={a.id}
                className="flex flex-wrap justify-between gap-2 border-b border-[color:var(--biz-border)] py-2"
              >
                <span>
                  <strong>{a.actor}</strong> · {a.action} — {a.detail}
                </span>
                <span className="text-xs text-[color:var(--biz-muted)]">
                  {formatDateTime(a.at)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-[color:var(--biz-surface-2)] px-3 py-3">
      <p className="text-xs text-[color:var(--biz-muted)]">{label}</p>
      <p className="tabular text-xl font-semibold">{value}</p>
    </div>
  );
}

function Item({ label, value }: { label: string; value?: string }) {
  return (
    <div>
      <dt className="text-xs text-[color:var(--biz-muted)]">{label}</dt>
      <dd className="mt-0.5 font-medium">{value || "—"}</dd>
    </div>
  );
}
