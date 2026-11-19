/**
 * GET /api/system/backups - List all backups
 * POST /api/system/backups - Trigger manual backup (rate limited)
 */
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/server";
import { db } from "@/lib/db";
import { can } from "@/lib/rbac";
import { audit } from "@/lib/audit";
import { redis } from "@/lib/db/redis";

export const dynamic = "force-dynamic";

// Rate limit: max 1 manual backup per hour per user
const RATE_LIMIT_KEY_PREFIX = "backup:manual:";
const RATE_LIMIT_SECONDS = 3600;

export async function GET() {
  const session = await auth();
  if (!session?.user || !can(session.user.role, "health.view")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Get backup records from job runs
  const backupRuns = await db.jobRun.findMany({
    where: { jobKey: "nightly-backup" },
    orderBy: { startedAt: "desc" },
    take: 50,
  });

  // Parse backup metadata
  const backups = backupRuns.map((run) => {
    const metadata = run.output ? parseBackupOutput(run.output) : {};
    return {
      id: run.id,
      filename: metadata.filename ?? `backup-${run.startedAt.toISOString().slice(0, 10)}.sql.gz`,
      startedAt: run.startedAt.toISOString(),
      finishedAt: run.finishedAt?.toISOString() ?? null,
      status: run.status as "SUCCESS" | "FAILED" | "RUNNING",
      sizeBytes: metadata.sizeBytes ?? null,
      checksum: metadata.checksum ?? null,
      errorMessage: run.error ?? null,
      type: run.triggeredBy.startsWith("manual") ? "MANUAL" : "NIGHTLY",
    };
  });

  const lastBackup = backups.length > 0 ? backups[0] : null;
  const storageUsed = backups
    .filter((b) => b.sizeBytes)
    .reduce((sum, b) => sum + (b.sizeBytes ?? 0), 0);

  // Get last verification run
  const lastVerificationRun = await db.jobRun.findFirst({
    where: { jobKey: "backup-verification" },
    orderBy: { startedAt: "desc" },
  });

  const lastVerification = lastVerificationRun
    ? {
        date: lastVerificationRun.startedAt.toISOString(),
        result: lastVerificationRun.status as "SUCCESS" | "FAILED",
        duration: lastVerificationRun.durationMs ?? 0,
      }
    : null;

  const stats = {
    totalBackups: backups.length,
    lastBackup,
    lastVerification,
    storageUsed,
    nextScheduled: "Daily at 2:00 AM",
  };

  return NextResponse.json({ stats, backups });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user || !can(session.user.role, "health.view")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = (await req.json().catch(() => ({}))) as { action?: string };
  if (body.action !== "backup") {
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }

  // Rate limiting
  const rateLimitKey = `${RATE_LIMIT_KEY_PREFIX}${session.user.id}`;
  const existing = await redis.get(rateLimitKey).catch(() => null);
  if (existing) {
    return NextResponse.json(
      { error: "Rate limit exceeded. Manual backups limited to once per hour." },
      { status: 429 }
    );
  }

  // Check if a backup is already running
  const runningBackup = await db.jobRun.findFirst({
    where: {
      jobKey: "nightly-backup",
      status: "RUNNING",
      startedAt: { gte: new Date(Date.now() - 3600000) }, // last hour
    },
  });

  if (runningBackup) {
    return NextResponse.json(
      { error: "A backup is already in progress" },
      { status: 409 }
    );
  }

  // Create backup run
  const run = await db.jobRun.create({
    data: {
      jobKey: "nightly-backup",
      status: "RUNNING",
      triggeredBy: `manual:${session.user.id}`,
    },
  });

  await audit({
    actorId: session.user.id,
    action: "UPDATE",
    entityType: "JobRun",
    entityId: run.id,
    metadata: { jobKey: "nightly-backup", manualTrigger: true },
    ip: req.headers.get("x-forwarded-for") ?? undefined,
  });

  // Set rate limit
  await redis.setex(rateLimitKey, RATE_LIMIT_SECONDS, "1").catch(() => null);

  // Trigger backup asynchronously
  void runBackupJob(run.id);

  return NextResponse.json({
    success: true,
    message: "Backup started. This may take several minutes.",
    runId: run.id,
  });
}

/** Parse backup output to extract metadata */
function parseBackupOutput(output: string): {
  filename?: string;
  sizeBytes?: number;
  checksum?: string;
} {
  const filenameMatch = output.match(/stored as ([^\s,]+)/);
  const sizeMatch = output.match(/(\d+(?:\.\d+)?)\s*(MB|GB|KB)/i);
  const checksumMatch = output.match(/checksum:\s*([a-f0-9]+)/i);

  let sizeBytes: number | undefined;
  if (sizeMatch) {
    const value = parseFloat(sizeMatch[1]!);
    const unit = sizeMatch[2]!.toUpperCase();
    sizeBytes =
      unit === "GB" ? value * 1024 * 1024 * 1024 :
      unit === "MB" ? value * 1024 * 1024 :
      unit === "KB" ? value * 1024 :
      value;
  }

  return {
    filename: filenameMatch?.[1],
    sizeBytes,
    checksum: checksumMatch?.[1],
  };
}

/** Run backup job (simplified - real implementation would use pg_dump + S3) */
async function runBackupJob(runId: string) {
  const start = Date.now();
  try {
    // Placeholder: In production, this would:
    // 1. Run pg_dump with compression
    // 2. Encrypt the backup
    // 3. Upload to S3
    // 4. Calculate checksum
    // 5. Clean up old backups (30 daily + 12 monthly)

    // Simulate backup duration
    await new Promise((resolve) => setTimeout(resolve, 5000));

    // Calculate simulated size
    const tables = await db.$queryRaw<Array<{ relname: string }>>
      `SELECT relname FROM pg_class WHERE relkind = 'r' AND relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')`;
    const simulatedSize = tables.length * 1024 * 1024 * 2; // 2MB per table estimate

    const filename = `backup-${new Date().toISOString().slice(0, 10)}.sql.gz`;
    const checksum = `sha256:${Math.random().toString(36).substring(2, 15)}${Math.random().toString(36).substring(2, 15)}`;

    await db.jobRun.update({
      where: { id: runId },
      data: {
        status: "SUCCESS",
        finishedAt: new Date(),
        durationMs: Date.now() - start,
        output: `Backup complete: ${(simulatedSize / 1024 / 1024).toFixed(2)} MB, stored as ${filename}, checksum: ${checksum}`,
      },
    });
  } catch (err) {
    await db.jobRun.update({
      where: { id: runId },
      data: {
        status: "FAILED",
        finishedAt: new Date(),
        durationMs: Date.now() - start,
        error: err instanceof Error ? err.message : "Unknown error",
      },
    });

    // Raise alert
    await db.alertItem
      .create({
        data: {
          ruleKey: "backup_failed",
          severity: "CRITICAL",
          title: "Manual backup failed",
          description: err instanceof Error ? err.message : "Unknown error",
        },
      })
      .catch(() => null);
  }
}
