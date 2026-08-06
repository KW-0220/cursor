import type { BizDocCategory, BizDocSlotId } from "./types";

export interface BizDocSlotDef {
  id: BizDocSlotId;
  category: BizDocCategory;
  name: string;
  required: boolean;
  purpose: string;
  requirements: string[];
  formats: string[];
  tips: string[];
  maxFiles: number;
}

export const BIZ_DOC_SLOTS: BizDocSlotDef[] = [
  {
    id: "br",
    category: "company",
    name: "商業登記證",
    required: true,
    purpose: "核實公司商業登記資料",
    requirements: [
      "最新及有效版本",
      "清楚顯示公司名稱",
      "清楚顯示商業登記號碼",
      "文件內容完整及可閱讀",
    ],
    formats: ["PDF", "JPG", "JPEG", "PNG"],
    tips: ["多頁請合併為 PDF", "避免反光與裁剪"],
    maxFiles: 3,
  },
  {
    id: "ci",
    category: "company",
    name: "有限公司註冊證書／Certificate of Incorporation",
    required: true,
    purpose: "核實公司註冊成立",
    requirements: [
      "文件內容完整",
      "公司名稱及註冊編號清晰",
      "不接受嚴重模糊或裁剪版本",
    ],
    formats: ["PDF", "JPG", "JPEG", "PNG"],
    tips: ["請上載完整清晰版本"],
    maxFiles: 3,
  },
  {
    id: "nar1",
    category: "company",
    name: "最新有限公司週年申報表／NAR1",
    required: true,
    purpose: "核實董事及股東資料",
    requirements: [
      "最新一份 NAR1",
      "內容完整",
      "董事及股東資料清楚",
      "成立未滿一年可提供成立表格或其他相關文件",
    ],
    formats: ["PDF"],
    tips: ["可於系統標示「成立未滿一年」作例外處理"],
    maxFiles: 5,
  },
  {
    id: "aoa",
    category: "company",
    name: "公司組織章程細則／Articles of Association／公司書仔",
    required: true,
    purpose: "核實公司組織章程",
    requirements: ["完整版本", "包括封面及所有內頁", "不接受只上載部分頁數"],
    formats: ["PDF"],
    tips: ["建議以完整 PDF 上載"],
    maxFiles: 3,
  },
  {
    id: "director_id",
    category: "identity",
    name: "董事身份證明",
    required: true,
    purpose: "核實董事身份",
    requirements: ["香港身份證；或護照", "資料清晰可讀"],
    formats: ["PDF", "JPG", "JPEG", "PNG"],
    tips: ["每位董事獨立上載", "最多兩份（正反面）"],
    maxFiles: 2,
  },
  {
    id: "shareholder_id",
    category: "identity",
    name: "股東身份證明",
    required: true,
    purpose: "核實股東身份",
    requirements: ["香港身份證；或護照", "公司股東請上載公司註冊文件"],
    formats: ["PDF", "JPG", "JPEG", "PNG"],
    tips: ["每位股東獨立上載"],
    maxFiles: 2,
  },
  {
    id: "address_proof",
    category: "address",
    name: "董事及股東住址證明",
    required: true,
    purpose: "核實居住地址",
    requirements: [
      "顯示申請人姓名",
      "顯示完整住址",
      "一般為最近三個月內發出",
      "文件日期清晰",
      "文件內容完整",
    ],
    formats: ["PDF", "JPG", "JPEG", "PNG"],
    tips: [
      "可接受銀行月結單、水電煤、電訊、政府信件",
      "支援香港或海外地址證明",
    ],
    maxFiles: 3,
  },
  {
    id: "business_set_1",
    category: "business_proof",
    name: "業務證明第一套",
    required: true,
    purpose: "證明公司業務活動",
    requirements: [
      "可包含發票、合約、訂單、付款／收款證明等",
      "填寫交易對象、日期、金額等資料",
    ],
    formats: ["PDF", "JPG", "JPEG", "PNG"],
    tips: ["每套最多十份"],
    maxFiles: 10,
  },
  {
    id: "business_set_2",
    category: "business_proof",
    name: "業務證明第二套",
    required: true,
    purpose: "第二套業務活動證明",
    requirements: ["與第一套相同要求，建議不同交易對象"],
    formats: ["PDF", "JPG", "JPEG", "PNG"],
    tips: ["每套最多十份"],
    maxFiles: 10,
  },
  {
    id: "business_alt",
    category: "business_alt",
    name: "新成立公司替代證明",
    required: false,
    purpose: "尚未正式營業時的替代業務證明",
    requirements: [
      "商業計劃、已簽訂合約、報價單、意向書等",
      "或產品／服務介紹、網站資料",
    ],
    formats: ["PDF", "JPG", "JPEG", "PNG"],
    tips: ["公司尚未營業時使用"],
    maxFiles: 10,
  },
];

export function getDocSlot(id: BizDocSlotId) {
  return BIZ_DOC_SLOTS.find((s) => s.id === id)!;
}

export function slotsByCategory(category: BizDocCategory) {
  return BIZ_DOC_SLOTS.filter((s) => s.category === category);
}

export const MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024;
