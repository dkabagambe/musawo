/**
 * POST /api/cron/storage-retention
 *
 * Two tasks per invocation:
 *  1. Detect intakes whose endDate is in the past (by at least 1 day) and
 *     for which no cleanup job exists yet; create a scan job.
 *  2. Execute jobs in IN_TRASH status whose executeAfter <= now.
 *
 * Protected by CRON_SECRET bearer token.
 * Schedule: run once a day (e.g. 02:00 UTC via Render cron or external scheduler).
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { scanIntake, executeReadyJobs } from "@/lib/storage/retention";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (
    !secret ||
    req.headers.get("authorization") !== `Bearer ${secret}`
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const results: {
    scannedIntakes: string[];
    newJobIds: string[];
    executedJobs: number;
    errors: string[];
  } = {
    scannedIntakes: [],
    newJobIds: [],
    executedJobs: 0,
    errors: [],
  };

  // ── 1. Find past intakes without a pending/confirmed cleanup job ──────────
  const pastIntakes = await db.$queryRaw<
    Array<{ id: string; label: string }>
  >`
    SELECT i.id, i.label
    FROM intakes i
    WHERE i."endDate" < NOW() - INTERVAL '1 day'
      AND NOT EXISTS (
        SELECT 1 FROM storage_cleanup_jobs j
        WHERE j."intakeId" = i.id
          AND j.status NOT IN ('EXECUTED', 'CANCELLED')
      )
    ORDER BY i."endDate" ASC
    LIMIT 20
  `;

  // Use a SYSTEM actor id if no human is running this
  const systemActor = await db.user
    .findFirst({ where: { role: "SYSTEM_IT" }, select: { id: true } })
    .then((u) => u?.id ?? "system");

  for (const intake of pastIntakes) {
    try {
      const jobId = await scanIntake(intake.id, systemActor);
      results.scannedIntakes.push(intake.label);
      results.newJobIds.push(jobId);
    } catch (err) {
      results.errors.push(`scan ${intake.id}: ${String(err)}`);
    }
  }

  // ── 2. Execute confirmed jobs past their trash window ─────────────────────
  try {
    results.executedJobs = await executeReadyJobs();
  } catch (err) {
    results.errors.push(`execute: ${String(err)}`);
  }

  return NextResponse.json(results);
}
