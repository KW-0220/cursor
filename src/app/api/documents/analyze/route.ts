/**
 * Alias：POST /api/documents/analyze
 * 正式入口為 /api/analyze-document
 */
export {
  POST,
  runtime,
  maxDuration,
} from "../../analyze-document/route";
