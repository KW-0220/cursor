import { NextResponse } from "next/server";
import OpenAI from "openai";
import { z } from "zod";

export const runtime = "nodejs";

const bodySchema = z.object({
  message: z.string().min(1).optional(),
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant", "system"]),
        content: z.string(),
      }),
    )
    .optional(),
});

const SYSTEM_PROMPT = `你是一名香港中小企貸款 AI 助手。

你的工作：
1. 收集企業資料
2. 分析已上傳文件
3. 解釋貸款要求
4. 協助初步評估

初步適合度規則（非正式批核，只供參考）：
若 companyAge >= 2 且 monthlyRevenue >= 100000 且 debtRatio < 50 → status = Suitable
否則為 NotSuitable；缺資料則 Incomplete。向用戶解釋時必須強調這不是正式批核。

重要限制：
- 不可承諾批核、不可確認正式批核機會或實際利率
- 正式批核由貸款顧問及相關貸款機構評估
- 使用繁體中文，簡潔清楚；結尾可給 1–2 個下一步建議

引導：
- 文件／資料收集 → /apply/kyc-docs
- 開始申請 → /apply
- 正式批核相關 → /app/account 聯絡顧問`;

type Action = { label: string; href: string };

function inferActions(text: string): Action[] {
  const lower = text.toLowerCase();
  const actions: Action[] = [];
  if (
    lower.includes("文件") ||
    lower.includes("結單") ||
    lower.includes("br") ||
    lower.includes("身份證") ||
    lower.includes("nar") ||
    lower.includes("上傳")
  ) {
    actions.push({ label: "開始資料收集", href: "/apply/kyc-docs" });
    actions.push({ label: "文件分析", href: "/app/document-analysis" });
  }
  if (
    lower.includes("申請") ||
    lower.includes("借錢") ||
    lower.includes("貸款") ||
    lower.includes("物業") ||
    lower.includes("抵押")
  ) {
    actions.push({ label: "按此開始申請", href: "/apply" });
  }
  if (
    lower.includes("批核") ||
    lower.includes("利率") ||
    lower.includes("保證") ||
    lower.includes("顧問")
  ) {
    actions.push({ label: "聯絡貸款顧問", href: "/app/account" });
  }
  if (actions.length === 0) {
    actions.push({ label: "按此開始申請", href: "/apply" });
  }
  // de-dupe by href+label
  const seen = new Set<string>();
  return actions.filter((a) => {
    const k = a.href + a.label;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

function localFallback(input: string) {
  const lower = input.toLowerCase();
  if (lower.includes("批核") || lower.includes("保證") || lower.includes("利率")) {
    return {
      reply:
        "我是 AI 財務助理／文件分析引擎，不能確認正式批核機會或實際利率。這些需由貸款顧問及相關貸款機構評估。",
      actions: [{ label: "聯絡貸款顧問", href: "/app/account" }],
    };
  }
  if (
    lower.includes("文件") ||
    lower.includes("結單") ||
    lower.includes("審計") ||
    lower.includes("br") ||
    lower.includes("身份證") ||
    lower.includes("nar")
  ) {
    return {
      reply:
        "申請前一般需準備：身份證正反面、近 3 個月住址證明、有效商業登記證（BR）、NAR1／變更登記（董事及持股）、銀行月結單（用以加總入賬並計算平均每月營業額），以及審計／債務資料。我可以幫你檢查齊不齊，但不會直接批貸款。",
      actions: [
        { label: "開始資料收集", href: "/apply/kyc-docs" },
        { label: "文件分析", href: "/app/document-analysis" },
      ],
    };
  }
  if (lower.includes("物業") || lower.includes("抵押")) {
    return {
      reply:
        "如果你持有香港物業並可接受抵押，有抵押貸款通常可申請較高額度。建議申請方向：有抵押貸款。我可協助資料收集與預審條件核對，但不直接批核。",
      actions: [{ label: "按此開始申請", href: "/apply" }],
    };
  }
  return {
    reply: `了解，你提到「${input}」。接下來可告訴我希望申請金額、公司營運年期，以及是否有香港物業可作抵押。我是財務助理／文件分析引擎，負責資料收集與預審，不會直接批出貸款。`,
    actions: [{ label: "按此開始申請", href: "/apply" }],
  };
}

export async function POST(req: Request) {
  try {
    const json = await req.json();
    const parsed = bodySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid body. Provide message or messages[]." },
        { status: 400 },
      );
    }

    const { message, messages } = parsed.data;
    const history =
      messages && messages.length > 0
        ? messages
        : message
          ? [{ role: "user" as const, content: message }]
          : null;

    if (!history) {
      return NextResponse.json(
        { error: "message or messages required" },
        { status: 400 },
      );
    }

    const lastUser =
      [...history].reverse().find((m) => m.role === "user")?.content ?? "";

    const disclaimer =
      "此建議只供初步參考。AI 不直接決定批出貸款；只協助資料收集與預審條件核對。實際貸款條件及批核結果由相關貸款機構決定。";

    if (!process.env.OPENAI_API_KEY) {
      const fb = localFallback(lastUser);
      return NextResponse.json({
        reply: fb.reply,
        actions: fb.actions,
        disclaimer,
        model: "local-fallback",
      });
    }

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const model = process.env.OPENAI_MODEL || "gpt-5-mini";
    const userMessage = lastUser;

    try {
      const completion = await openai.chat.completions.create({
        model,
        messages: [
          {
            role: "system",
            content: SYSTEM_PROMPT,
          },
          {
            role: "user",
            content: userMessage,
          },
        ],
      });

      const reply =
        completion.choices[0]?.message?.content?.trim() ||
        localFallback(lastUser).reply;

      return NextResponse.json({
        reply,
        actions: inferActions(`${lastUser}\n${reply}`),
        disclaimer,
        model,
      });
    } catch (openaiErr) {
      const fb = localFallback(lastUser);
      const detail =
        openaiErr instanceof Error ? openaiErr.message : "OpenAI error";
      return NextResponse.json({
        reply: fb.reply,
        actions: fb.actions,
        disclaimer,
        model: "local-fallback",
        warning: detail,
      });
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Chat failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
