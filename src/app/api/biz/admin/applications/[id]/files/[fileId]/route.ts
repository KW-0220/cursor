import { NextRequest, NextResponse } from "next/server";
import { readBizFileBytes } from "@/lib/bizdoc/file-storage";
import { getBizApplicationFromDb } from "@/lib/bizdoc/supabase";
import { requireBizAdminContext } from "@/lib/supabase/context";

export const runtime = "nodejs";

type RouteCtx = {
  params: Promise<{ id: string; fileId: string }>;
};

/** GET /api/biz/admin/applications/[id]/files/[fileId]
 *  後台下載／預覽單一文件（?inline=1 則 inline）
 */
export async function GET(req: NextRequest, ctx: RouteCtx) {
  const auth = await requireBizAdminContext(req);
  if (auth.error || !auth.data) {
    return NextResponse.json(
      { error: auth.error?.message || "UNAUTHORIZED" },
      { status: "status" in auth ? auth.status : 401 },
    );
  }

  const { id, fileId } = await ctx.params;
  try {
    const app = await getBizApplicationFromDb(id);
    if (!app) {
      return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
    }
    const file = app.files.find((f) => f.id === fileId);
    if (!file) {
      return NextResponse.json({ error: "FILE_NOT_FOUND" }, { status: 404 });
    }
    if (!file.storagePath) {
      return NextResponse.json(
        {
          error: "FILE_CONTENT_MISSING",
          message:
            "此文件僅有檔名紀錄、尚未寫入 Storage。請請客戶重新上載後再下載。",
        },
        { status: 404 },
      );
    }

    const bytes = await readBizFileBytes({
      storagePath: file.storagePath,
      storage: file.storage,
    });
    if (!bytes) {
      return NextResponse.json(
        {
          error: "FILE_MISSING",
          message: "檔案內容找不到（Storage 或本機均無此檔）",
        },
        { status: 404 },
      );
    }

    const inline =
      req.nextUrl.searchParams.get("inline") === "1" ||
      req.nextUrl.searchParams.get("disposition") === "inline";
    const disposition = inline ? "inline" : "attachment";
    return new NextResponse(new Uint8Array(bytes), {
      status: 200,
      headers: {
        "Content-Type": file.mimeType || "application/octet-stream",
        "Content-Disposition": `${disposition}; filename*=UTF-8''${encodeURIComponent(file.originalName)}`,
        "Content-Length": String(bytes.length),
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (err) {
    return NextResponse.json(
      {
        error: "BIZ_FILE_DOWNLOAD_FAILED",
        message: err instanceof Error ? err.message : String(err),
      },
      { status: 500 },
    );
  }
}
