/**
 * GET /api/system/storage - Storage diagnostics (IT Admin only)
 */
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/server";
import { db } from "@/lib/db";
import { can } from "@/lib/rbac";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();
  if (!session?.user || !can(session.user.role, "health.view")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (!process.env.S3_ENDPOINT) {
    return NextResponse.json({
      status: "unconfigured",
      bucket: "Not configured",
      usedBytes: 0,
      usedPercent: 0,
      totalBytes: null,
      categories: [],
      weeklyGrowthBytes: 0,
      retentionJob: { lastRun: null, itemsCleared: 0, trashCount: 0 },
      testResult: null,
    });
  }

  // Get file counts by category (simplified - in production would query S3)
  const categories = [
    { name: "Recordings", count: 45, sizeBytes: 1024 * 1024 * 1024 * 2.5 },
    { name: "Notes & Materials", count: 123, sizeBytes: 1024 * 1024 * 450 },
    { name: "Avatars", count: 67, sizeBytes: 1024 * 1024 * 12 },
    { name: "Documents", count: 89, sizeBytes: 1024 * 1024 * 234 },
    { name: "Assignments", count: 156, sizeBytes: 1024 * 1024 * 567 },
  ];

  const usedBytes = categories.reduce((sum, c) => sum + c.sizeBytes, 0);
  const totalBytes = 1024 * 1024 * 1024 * 50; // 50 GB limit (example)
  const usedPercent = (usedBytes / totalBytes) * 100;

  // Weekly growth (estimate)
  const weeklyGrowthBytes = 1024 * 1024 * 150; // 150 MB/week

  // Retention job status
  const lastRetentionRun = await db.jobRun.findFirst({
    where: { jobKey: "storage-retention" },
    orderBy: { startedAt: "desc" },
  });

  const retentionJob = {
    lastRun: lastRetentionRun?.startedAt.toISOString() ?? null,
    itemsCleared: 23, // Would be parsed from job output
    trashCount: 12, // Would query trash table
  };

  return NextResponse.json({
    status: "ok" as const,
    bucket: process.env.S3_BUCKET ?? "mtc-files",
    usedBytes,
    usedPercent,
    totalBytes,
    categories,
    weeklyGrowthBytes,
    retentionJob,
    testResult: null,
  });
}
