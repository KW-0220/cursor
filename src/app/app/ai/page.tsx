"use client";

import { useState } from "react";
import Link from "next/link";
import { aiWelcome } from "@/lib/mock-data";
import type { ChatMessage } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Disclaimer } from "@/components/ui/layout";

export default function AIAssistantPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([aiWelcome]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const send = async (text: string) => {
    if (!text.trim() || loading) return;
    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: text,
    };
    const next = [...messages, userMsg];
    setMessages(next);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: next
            .filter((m) => m.role === "user" || m.role === "assistant")
            .map((m) => ({ role: m.role, content: m.content })),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Chat failed");

      const assistant: ChatMessage = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: data.reply,
        actions: data.actions,
        disclaimer: data.disclaimer,
      };
      setMessages((m) => [...m, assistant]);
    } catch (err) {
      setMessages((m) => [
        ...m,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content:
            err instanceof Error
              ? `暫時未能連線 AI（${err.message}）。你可以先開始資料收集，或稍後再試。`
              : "暫時未能連線 AI，請稍後再試。",
          actions: [
            { label: "開始資料收集", href: "/apply/kyc-docs" },
            { label: "聯絡貸款顧問", href: "/app/account" },
          ],
          disclaimer:
            "AI 不直接決定批出貸款；只協助資料收集與預審條件核對。",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex h-[calc(100dvh-4.5rem)] flex-col">
      <header className="border-b border-border px-4 py-3">
        <h1 className="text-lg font-semibold text-navy-900">AI 財務助理</h1>
        <p className="text-xs text-text-secondary">
          文件分析＋資料收集引擎 · 不直接批核貸款 · 可轉介顧問
        </p>
      </header>

      <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
        {messages.map((m) => (
          <div
            key={m.id}
            className={`max-w-[90%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
              m.role === "user"
                ? "ml-auto bg-navy-900 text-white"
                : "bg-surface-2 text-text-primary"
            }`}
          >
            <p className="whitespace-pre-wrap">{m.content}</p>
            {m.actions && (
              <div className="mt-2 flex flex-wrap gap-2">
                {m.actions.map((a) => (
                  <Link key={a.href + a.label} href={a.href}>
                    <Button size="sm" variant={m.role === "user" ? "secondary" : "outline"}>
                      {a.label}
                    </Button>
                  </Link>
                ))}
              </div>
            )}
            {m.quickReplies && (
              <div className="mt-2 flex flex-wrap gap-2">
                {m.quickReplies.map((q) => (
                  <button
                    key={q}
                    onClick={() => void send(q)}
                    disabled={loading}
                    className="rounded-full bg-surface-1 px-2.5 py-1 text-xs text-teal-600 ring-1 ring-border disabled:opacity-50"
                  >
                    {q}
                  </button>
                ))}
              </div>
            )}
            {m.disclaimer && (
              <p className="mt-2 text-[11px] text-text-muted">{m.disclaimer}</p>
            )}
          </div>
        ))}
        {loading && (
          <div className="max-w-[90%] rounded-2xl bg-surface-2 px-3.5 py-2.5 text-sm text-text-secondary">
            AI 思考中…
          </div>
        )}
        <Disclaimer>
          涉及批核機會、正式利率、文件矛盾或投訴時，請使用「聯絡貸款顧問」。
        </Disclaimer>
      </div>

      <div className="border-t border-border p-3">
        <div className="mb-2 flex flex-wrap gap-2">
          {aiWelcome.quickReplies?.slice(0, 4).map((q) => (
            <button
              key={q}
              onClick={() => void send(q)}
              disabled={loading}
              className="rounded-full bg-teal-100 px-2.5 py-1 text-xs text-teal-600 disabled:opacity-50"
            >
              {q}
            </button>
          ))}
        </div>
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            void send(input);
          }}
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={loading}
            placeholder="例如：我想借錢出糧同入貨"
            className="h-11 flex-1 rounded-xl border border-border bg-surface-1 px-3 text-sm outline-none focus:border-teal-500 disabled:opacity-50"
          />
          <Button type="submit" disabled={loading}>
            {loading ? "…" : "傳送"}
          </Button>
        </form>
      </div>
    </main>
  );
}
