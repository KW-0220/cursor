import { NextResponse } from "next/server";
import { requireUserSession } from "@/lib/api-session";
import {
  getApplicationsStorageMode,
  listAllApplications,
} from "@/lib/applications-store";
import { LOAN_APP_STATUS_LABEL } from "@/lib/loan-app-status";

export const runtime = "nodejs";

/** GET /api/admin/applications — 後台草稿／申請狀態（A01） */
export async function GET() {
  const session = await requireUserSession();
  if (!session) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }
  if (session.role !== "admin") {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }

  const apps = await listAllApplications();
  return NextResponse.json({
    ok: true,
    storageMode: getApplicationsStorageMode(),
    count: apps.length,
    applications: apps.map((a) => ({
      id: a.id,
      applicantUserId: a.applicantUserId,
      loanType: a.loanType,
      requestedAmount: a.requestedAmount,
      status: a.status,
      statusLabel: LOAN_APP_STATUS_LABEL[a.status],
      completionPercentage: a.completionPercentage,
      missingItems: a.missingItems,
      currentStep: a.currentStep,
      versionNumber: a.versionNumber,
      lastSavedAt: a.lastSavedAt,
      submittedAt: a.submittedAt,
      expiresAt: a.expiresAt,
      documentCount: a.documents.length,
    })),
  });
}
