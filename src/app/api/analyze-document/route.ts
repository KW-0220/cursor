/**
 * Alias：POST /api/analyze-document
 * 實際邏輯與 /api/documents/analyze 相同（Backend-only OpenAI）。
 * 專案使用 TypeScript App Router → route.ts（非 route.js）。
 */
export {
  POST,
  runtime,
  maxDuration,
} from "../documents/analyze/route";
