/**
 * Alias：POST /api/documents/analyze
 * 正式入口為 /api/analyze-document
 *
 * Next.js 16 Turbopack：route segment config（runtime / maxDuration）
 * 必須在本檔靜態宣告，不可 re-export。
 */
export const runtime = "nodejs";
export const maxDuration = 60;
export const preferredRegion = ["sin1", "iad1"];

export { POST } from "../../analyze-document/route";
