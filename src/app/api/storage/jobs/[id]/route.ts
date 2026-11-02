/**
 * GET /api/storage/jobs/[id]
 * Returns the full item list for a specific cleanup job.
 * Accessible to storage.view and storage.manage.
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/server";
import { can } from "@/lib/rbac";
import { db } from "@/lib/db";

export const runtime = "nodejs";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (
    !can(session.user.role, "storage.view") &&
    !can(session.user.role, "storage.manage")
  ) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const job = await db.$queryRaw<
    Array<{
      id: string;
      intakeLabel: string;
      status: string;
      totalSizeBytes: bigint;
      itemsJson: unknown;
      trashDays: number;
      confirmedAt: Date | null;
      executeAfter: Date | null;
      executedAt: Date | null;
      createdAt: Date;
      confirmedByName: string | null;
    }>
  >`
    SELECT
      j.id,
      j."intakeLabel",
      j.status,
      j."totalSizeBytes",
      j."itemsJson",
      j."trashDays",
      j."confirmedAt",
      j."executeAfter",
      j."executedAt",
      j."createdAt",
      u.name AS "confirmedByName"
    FROM storage_cleanup_jobs j
    LEFT JOIN users u ON j."confirmedById" = u.id
    WHERE j.id = ${params.id}
    LIMIT 1
  `;

  if (!job.length) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({
    ...job[0],
    totalSizeBytes: Number(job[0].totalSizeBytes),
  });
}
