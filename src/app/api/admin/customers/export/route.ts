import { NextResponse } from "next/server";
import { buildCustomersExcelBuffer } from "@/lib/customer-registry";

export const runtime = "nodejs";

/**
 * GET /api/admin/customers/export
 * 下載客戶登記 Excel（.xlsx）
 */
export async function GET() {
  try {
    const buffer = await buildCustomersExcelBuffer();
    const filename = `SME-LoanFlow-客戶登記-${new Date()
      .toISOString()
      .slice(0, 10)}.xlsx`;

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    return NextResponse.json(
      {
        error: "EXPORT_FAILED",
        message: err instanceof Error ? err.message : "UNKNOWN",
      },
      { status: 500 },
    );
  }
}
