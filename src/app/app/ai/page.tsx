"use client";

import { useState } from "react";
import Link from "next/link";
import { aiWelcome } from "@/lib/mock-data";
import type { ChatMessage } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Disclaimer } from "@/components/ui/layout";

function replyFor(input: string): ChatMessage {
  const lower = input.toLowerCase();
  if (lower.includes("批核") || lower.includes("保證") || lower.includes("利率")) {
    return {
      id: crypto.randomUUID(),
      role: "assistant",
      content:
        "我無法確認正式批核機會或實際利率。這些需由貸款顧問及相關貸款機構評估。",
      actions: [{ label: "聯絡貸款顧問", href: "/app/account" }],
      disclaimer:
        "AI 分析只供初步評估，並非正式貸款批核。",
    };
  }
  if (lower.includes("文件") || lower.includes("結單") || lower.includes("審計")) {
    return {
      id: crypto.randomUUID(),
      role: "assistant",
      content:
        "無抵押貸款一般需要：最近三年審計報告、最近六個月銀行結單、現有銀行授信信。有抵押另加物業相關文件。",
      actions: [
        { label: "查看文件清單", href: "/apply" },
        { label: "開始申請", href: "/apply" },
      ],
      disclaimer:
        "此建議只供初步參考，實際文件要求可能因貸款機構而異。",
    };
  }
  if (lower.includes("物業") || lower.includes("抵押")) {
    return {
      id: crypto.randomUUID(),
      role: "assistant",
      content:
        "如果你持有香港物業並可接受抵押，有抵押貸款通常可申請較高額度。建議申請方向：有抵押貸款。",
      actions: [{ label: "按此開始申請", href: "/apply" }],
      quickReplies: ["我想了解無抵押", "要準備甚麼文件？"],
      disclaimer:
        "此建議只供初步參考，實際貸款條件及批核結果由相關貸款機構決定。",
    };
  }
  return {
    id: crypto.randomUUID(),
    role: "assistant",
    content: `了解，你提到「${input}」。接下來可告訴我希望申請金額、公司營運年期，以及是否有香港物業可作抵押。`,
    quickReplies: [
      "希望申請 150 萬",
      "營運超過 5 年",
      "沒有物業可抵押",
      "有審計報告",
    ],
    actions: [{ label: "按此開始申請", href: "/apply" }],
    disclaimer:
      "此建議只供初步參考，實際貸款條件及批核結果由相關貸款機構決定。",
  };
}

export default function AIAssistantPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([aiWelcome]);
  const [input, setInput] = useState("");

  const send = (text: string) => {
    if (!text.trim()) return;
    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: text,
    };
    setMessages((m) => [...m, userMsg, replyFor(text)]);
    setInput("");
  };

  return (
    <main className="flex h-[calc(100dvh-4.5rem)] flex-col">
      <header className="border-b border-border px-4 py-3">
        <h1 className="text-lg font-semibold text-navy-900">AI 助理</h1>
        <p className="text-xs text-text-secondary">
          支援廣東話書面語及中英夾雜 · 可隨時轉介顧問
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
            <p>{m.content}</p>
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
                    onClick={() => send(q)}
                    className="rounded-full bg-surface-1 px-2.5 py-1 text-xs text-teal-600 ring-1 ring-border"
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
        <Disclaimer>
          涉及批核機會、正式利率、文件矛盾或投訴時，請使用「聯絡貸款顧問」。
        </Disclaimer>
      </div>

      <div className="border-t border-border p-3">
        <div className="mb-2 flex flex-wrap gap-2">
          {aiWelcome.quickReplies?.slice(0, 4).map((q) => (
            <button
              key={q}
              onClick={() => send(q)}
              className="rounded-full bg-teal-100 px-2.5 py-1 text-xs text-teal-600"
            >
              {q}
            </button>
          ))}
        </div>
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            send(input);
          }}
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="例如：我想借錢出糧同入貨"
            className="h-11 flex-1 rounded-xl border border-border bg-surface-1 px-3 text-sm outline-none focus:border-teal-500"
          />
          <Button type="submit">傳送</Button>
        </form>
      </div>
    </main>
  );
}
