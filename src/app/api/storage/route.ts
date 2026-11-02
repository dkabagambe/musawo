/**
 * GET /api/storage
 * Returns storage usage summary + list of cleanup jobs.
 * Accessible to Principal (storage.manage) and Director (storage.view).
 */

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/server";
import { can } from "@/lib/rbac";
import { db } from "@/lib/db";
import { getStorageUsageSummary } from "@/lib/storage/retention";

export const runtime = "nodejs";

export async function GET() {
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

  const [usage, jobs] = await Promise.all([
    getStorageUsageSummary(),
    db.$queryRaw<
      Array<{
        id: string;
        intakeLabel: string;
        status: string;
        totalSizeBytes: bigint;
        itemCount: number;
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
        jsonb_array_length(j."itemsJson") AS "itemCount",
        j."confirmedAt",
        j."executeAfter",
        j."executedAt",
        j."createdAt",
        u.name AS "confirmedByName"
      FROM storage_cleanup_jobs j
      LEFT JOIN users u ON j."confirmedById" = u.id
      ORDER BY j."createdAt" DESC
      LIMIT 50
    `,
  ]);

  return NextResponse.json({
    usage,
    jobs: jobs.map((j) => ({
      ...j,
      totalSizeBytes: Number(j.totalSizeBytes),
    })),
  });
}
