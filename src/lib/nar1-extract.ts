import { z } from "zod";
import type { FinancialExtract } from "./financial-extract";

const looseStr = z
  .union([z.string(), z.number(), z.null(), z.undefined()])
  .transform((v): string | null => {
    if (v == null || v === "") return null;
    return String(v).trim() || null;
  });

const looseNum = z
  .union([z.number(), z.string(), z.null(), z.undefined()])
  .transform((v): number | null => {
    if (v == null || v === "") return null;
    if (typeof v === "number") return Number.isFinite(v) ? v : null;
    const n = Number(String(v).replace(/[%,\s]/g, ""));
    return Number.isFinite(n) ? n : null;
  });

function looseArray<T extends z.ZodTypeAny>(item: T) {
  return z
    .union([z.array(item), z.null(), z.undefined()])
    .transform((v) => (Array.isArray(v) ? v : []));
}

const DirectorSchema = z
  .object({
    name: looseStr.transform((s) => s ?? ""),
    role: looseStr,
  })
  .passthrough();

const ShareholderSchema = z
  .object({
    name: looseStr.transform((s) => s ?? ""),
    shares: looseNum,
    shareholding_pct: looseNum,
  })
  .passthrough();

const SecretarySchema = z
  .object({
    name: looseStr,
    address: looseStr,
    type: looseStr, // individual / body corporate
  })
  .passthrough();

const IssuedCapitalSchema = z
  .object({
    currency: looseStr,
    amount: looseNum,
    shares: looseNum,
    class_of_shares: looseStr,
    details: looseStr,
  })
  .passthrough();

export const Nar1ExtractSchema = z
  .object({
    company_name: looseStr,
    company_number: looseStr,
    registered_office_address: looseStr,
    annual_return_date: looseStr,
    directors: looseArray(DirectorSchema),
    company_secretary: z
      .union([SecretarySchema, z.null(), z.undefined()])
      .transform((v) => v ?? null),
    shareholders: looseArray(ShareholderSchema),
    issued_share_capital: z
      .union([IssuedCapitalSchema, z.null(), z.undefined()])
      .transform((v) => v ?? null),
  })
  .passthrough();

export type Nar1Extract = z.infer<typeof Nar1ExtractSchema>;

export const NAR1_EXTRACT_SYSTEM_PROMPT = `你是香港中小企貸款預審助手，專門閱讀公司註冊處周年申報表（NAR1 / Annual Return）。

只根據提供文字／影像抽取，禁止上網。立刻只回 JSON（不要其他文字）。

必須輸出：
{
  "company_name": string | null,
  "company_number": string | null,
  "registered_office_address": string | null,
  "annual_return_date": string | null,
  "directors": [{"name": string, "role": string|null}],
  "company_secretary": {"name": string|null, "address": string|null, "type": string|null} | null,
  "shareholders": [{"name": string, "shares": number|null, "shareholding_pct": number|null}],
  "issued_share_capital": {"currency": string|null, "amount": number|null, "shares": number|null, "class_of_shares": string|null, "details": string|null} | null
}

欄位說明：
1. company_name：公司名稱（中或英，文件所見為準）
2. company_number：公司註冊編號（CR No.）
3. registered_office_address：註冊辦事處地址
4. annual_return_date：周年申報日期／Made up to／Return date（原文日期字串）
5. directors：董事姓名列表（role 可填 Director／Alternate 等，無則 null）
6. company_secretary：公司秘書姓名／名稱、地址、個人或法人（type）
7. shareholders：股東姓名；shares＝持股數量；shareholding_pct＝持股比例（百分比數字，如 50）
8. issued_share_capital：已發行股本（幣別、金額、股數、股份類別、補充 details）

不要輸出 revenue／EBITDA。不要猜測。缺資料用 null／[]。最多列 20 名董事／股東。`;

export function buildNar1ExtractUserText(input: {
  fileName?: string;
  companyNameHint?: string;
  pastedText?: string;
}) {
  return [
    "這是香港公司註冊處周年申報表 NAR1。請抽取：公司名稱、公司註冊編號、註冊辦事處地址、周年申報日期、董事、公司秘書、股東及持股、已發行股本。",
    "不要輸出 company_name/revenue/EBITDA 財務報表格式以外的混亂欄位；請用上述 NAR1 JSON。",
    input.fileName ? `檔名：${input.fileName}` : null,
    input.companyNameHint ? `申請公司提示：${input.companyNameHint}` : null,
    input.pastedText
      ? `文件文字／OCR：\n---\n${input.pastedText.slice(0, 100_000)}\n---`
      : "（無文字層，請根據附上的頁面影像辨識）",
  ]
    .filter(Boolean)
    .join("\n\n");
}

export function emptyNar1Extract(): Nar1Extract {
  return {
    company_name: null,
    company_number: null,
    registered_office_address: null,
    annual_return_date: null,
    directors: [],
    company_secretary: null,
    shareholders: [],
    issued_share_capital: null,
  };
}

export function toNar1Extract(
  raw: Partial<Nar1Extract> | null | undefined,
): Nar1Extract {
  const base = emptyNar1Extract();
  if (!raw) return base;
  return {
    ...base,
    ...raw,
    directors: raw.directors ?? [],
    shareholders: raw.shareholders ?? [],
    company_secretary: raw.company_secretary ?? null,
    issued_share_capital: raw.issued_share_capital ?? null,
  };
}

export function parseNar1Extract(
  raw: unknown,
): { ok: true; data: Nar1Extract } | { ok: false; error: string } {
  const parsed = Nar1ExtractSchema.safeParse(raw);
  if (parsed.success) {
    const data = toNar1Extract(parsed.data);
    if (
      data.company_name ||
      data.company_number ||
      data.directors.length ||
      data.shareholders.length
    ) {
      return { ok: true, data };
    }
  }

  if (raw && typeof raw === "object") {
    const o = raw as Record<string, unknown>;
    const company = looseStr.parse(o.company_name ?? o.companyName);
    const number = looseStr.parse(
      o.company_number ?? o.cr_number ?? o.companyNumber,
    );
    if (company || number) {
      const directorsRaw = Array.isArray(o.directors) ? o.directors : [];
      const shareholdersRaw = Array.isArray(o.shareholders)
        ? o.shareholders
        : [];
      return {
        ok: true,
        data: toNar1Extract({
          company_name: company,
          company_number: number,
          registered_office_address: looseStr.parse(
            o.registered_office_address ?? o.registered_office ?? o.address,
          ),
          annual_return_date: looseStr.parse(
            o.annual_return_date ?? o.made_up_to ?? o.return_date,
          ),
          directors: directorsRaw.map((d) => {
            if (typeof d === "string") return { name: d, role: null };
            const x = (d ?? {}) as Record<string, unknown>;
            return {
              name: String(x.name ?? x.director_name ?? ""),
              role: looseStr.parse(x.role),
            };
          }),
          shareholders: shareholdersRaw.map((s) => {
            if (typeof s === "string") {
              return { name: s, shares: null, shareholding_pct: null };
            }
            const x = (s ?? {}) as Record<string, unknown>;
            return {
              name: String(x.name ?? x.shareholder_name ?? ""),
              shares: looseNum.parse(x.shares ?? x.number_of_shares),
              shareholding_pct: looseNum.parse(
                x.shareholding_pct ?? x.percentage ?? x.pct,
              ),
            };
          }),
          company_secretary:
            o.company_secretary && typeof o.company_secretary === "object"
              ? {
                  name: looseStr.parse(
                    (o.company_secretary as Record<string, unknown>).name,
                  ),
                  address: looseStr.parse(
                    (o.company_secretary as Record<string, unknown>).address,
                  ),
                  type: looseStr.parse(
                    (o.company_secretary as Record<string, unknown>).type,
                  ),
                }
              : typeof o.company_secretary === "string"
                ? {
                    name: o.company_secretary,
                    address: null,
                    type: null,
                  }
                : null,
          issued_share_capital:
            o.issued_share_capital &&
            typeof o.issued_share_capital === "object"
              ? {
                  currency: looseStr.parse(
                    (o.issued_share_capital as Record<string, unknown>)
                      .currency,
                  ),
                  amount: looseNum.parse(
                    (o.issued_share_capital as Record<string, unknown>).amount,
                  ),
                  shares: looseNum.parse(
                    (o.issued_share_capital as Record<string, unknown>).shares,
                  ),
                  class_of_shares: looseStr.parse(
                    (o.issued_share_capital as Record<string, unknown>)
                      .class_of_shares,
                  ),
                  details: looseStr.parse(
                    (o.issued_share_capital as Record<string, unknown>).details,
                  ),
                }
              : null,
        }),
      };
    }
  }

  return {
    ok: false,
    error:
      parsed.success === false
        ? parsed.error.issues
            .slice(0, 3)
            .map((i) => `${i.path.join(".")}: ${i.message}`)
            .join("; ")
        : "NAR1_EXTRACT_EMPTY",
  };
}

export function nar1ExtractToFinancial(n: Nar1Extract): FinancialExtract {
  return {
    company_name: n.company_name,
    financial_year: n.annual_return_date,
    revenue: null,
    EBITDA: null,
    net_profit: null,
    existing_debt: null,
  };
}

export function nar1ExtractHint(n: Nar1Extract): string | null {
  const bits = [
    n.company_name && "公司名稱",
    n.company_number && "註冊編號",
    n.registered_office_address && "註冊地址",
    n.annual_return_date && "申報日期",
    n.directors.length && `董事${n.directors.length}人`,
    n.company_secretary?.name && "公司秘書",
    n.shareholders.length && `股東${n.shareholders.length}人`,
    n.issued_share_capital && "已發行股本",
  ].filter(Boolean);

  if (!bits.length) {
    return "未能從 NAR1 抽出資料。請上完整頁（唔好只封面）或清晰 JPG／PNG。";
  }
  if (!n.company_number || !n.directors.length) {
    return `已讀到部分 NAR1（${bits.join("、")}）；建議核對原件。`;
  }
  return `已抽取 NAR1：${bits.join("、")}。`;
}
