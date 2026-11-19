/**
 * GET   /api/system/jobs        - list all job definitions with their last run
 * POST  /api/system/jobs/run    - trigger a runnable job manually (IT Admin only, audited)
 */
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/server";
import { db } from "@/lib/db";
import { can } from "@/lib/rbac";
import { audit } from "@/lib/audit";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();
  if (!session?.user || !can(session.user.role, "health.view")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const jobs = await db.jobDefinition.findMany({
    orderBy: { label: "asc" },
  });

  // Get last run for each job
  const lastRuns = await Promise.all(
    jobs.map((j) =>
      db.jobRun.findFirst({
        where: { jobKey: j.key },
        orderBy: { startedAt: "desc" },
      })
    )
  );

  // Recent failures (last 48h)
  const recentFailures = await db.jobRun.findMany({
    where: {
      status: "FAILED",
      startedAt: { gte: new Date(Date.now() - 48 * 3600000) },
    },
    orderBy: { startedAt: "desc" },
    take: 20,
  });

  const jobsWithRuns = jobs.map((j, i) => ({
    ...j,
    lastRun: lastRuns[i] ?? null,
  }));

  return NextResponse.json({ jobs: jobsWithRuns, recentFailures });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user || !can(session.user.role, "health.view")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({})) as { jobKey?: string };
  if (!body.jobKey) return NextResponse.json({ error: "jobKey required" }, { status: 400 });

  const job = await db.jobDefinition.findUnique({ where: { key: body.jobKey } });
  if (!job) return NextResponse.json({ error: "Job not found" }, { status: 404 });
  if (!job.runnable) return NextResponse.json({ error: "This job cannot be triggered manually" }, { status: 400 });

  // Create a job run record
  const run = await db.jobRun.create({
    data: {
      jobKey: job.key,
      status: "RUNNING",
      triggeredBy: `manual:${session.user.id}`,
    },
  });

  await audit({
    actorId: session.user.id,
    action: "UPDATE",
    entityType: "JobRun",
    entityId: run.id,
    metadata: { jobKey: job.key, triggeredManually: true },
    ip: req.headers.get("x-forwarded-for") ?? undefined,
  });

  // Run the job asynchronously (fire-and-forget)
  void runJob(job.key, run.id);

  return NextResponse.json({ runId: run.id });
}

/** Dispatch table for runnable jobs */
async function runJob(key: string, runId: string) {
  const start = Date.now();
  try {
    let output = "";
    switch (key) {
      case "email-retry":
        output = await runEmailRetry();
        break;
      case "log-retention":
        output = await runLogRetention();
        break;
      case "metrics-retention":
        output = await runMetricsRetention();
        break;
      case "alert-checker":
        output = await runAlertChecker();
        break;
      case "health-check":
        output = "Health check heartbeat recorded.";
        break;
      case "nightly-backup":
        output = await runBackup();
        break;
      case "integrity-check":
        output = await runIntegrityCheck();
        break;
      default:
        output = `Job "${key}" does not have a handler in this environment. Add it to src/app/api/system/jobs/route.ts.`;
    }
    await db.jobRun.update({
      where: { id: runId },
      data: { status: "SUCCESS", finishedAt: new Date(), durationMs: Date.now() - start, output },
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
    // Raise an alert
    await db.alertItem.create({
      data: {
        ruleKey: `job_failed_${key}`,
        severity: "WARNING",
        title: `Job failed: ${key}`,
        description: err instanceof Error ? err.message : "Unknown error",
      },
    }).catch(() => null);
  }
}

async function runEmailRetry(): Promise<string> {
  const failed = await db.failedEmail.findMany({
    where: { status: "PENDING", attempts: { lt: 3 } },
    take: 20,
  });
  if (failed.length === 0) return "No pending emails to retry.";
  const { sendEmail } = await import("@/lib/email");
  let retried = 0;
  for (const item of failed) {
    try {
      await sendEmail({
        to: item.to,
        subject: item.subject,
        template: item.template as Parameters<typeof sendEmail>[0]["template"],
        variables: item.variables as Record<string, string>,
      });
      await db.failedEmail.update({ where: { id: item.id }, data: { status: "SENT", sentAt: new Date() } });
      retried++;
    } catch (e) {
      await db.failedEmail.update({
        where: { id: item.id },
        data: { attempts: { increment: 1 }, lastError: e instanceof Error ? e.message : "unknown" },
      });
    }
  }
  return `Retried ${retried}/${failed.length} emails.`;
}

async function runLogRetention(): Promise<string> {
  const cutoff = new Date(Date.now() - 30 * 86400000);
  const { count } = await db.systemLog.deleteMany({ where: { createdAt: { lt: cutoff } } });
  return `Deleted ${count} log entries older than 30 days.`;
}

async function runMetricsRetention(): Promise<string> {
  const { cleanupOldMetrics } = await import("@/lib/monitoring/metrics");
  const count = await cleanupOldMetrics();
  return `Deleted ${count} metric entries older than 7 days.`;
}

async function runAlertChecker(): Promise<string> {
  const { checkAlertRules } = await import("@/lib/monitoring/alert-rules");
  const result = await checkAlertRules();
  return `Checked ${result.checked} alert rules, ${result.triggered} new alerts triggered.`;
}

async function runBackup(): Promise<string> {
  // Placeholder - actual backup implementation would use pg_dump
  // and upload to S3-compatible storage
  return "Backup not yet implemented. This is a placeholder for nightly backups.";
}

async function runIntegrityCheck(): Promise<string> {
  // Check paid-percent integrity
  const enrolments = await db.enrolment.findMany({
    where: { paidPercent: { gt: 0 } },
    select: { id: true, paidPercent: true, status: true },
  });
  
  let fixed = 0;
  for (const enrolment of enrolments) {
    // Verify paidPercent matches status
    let expectedStatus = enrolment.status;
    if (enrolment.paidPercent >= 100) {
      expectedStatus = "ACTIVE";
    } else if (enrolment.paidPercent >= 50) {
      expectedStatus = "PARTIALLY_PAID";
    }
    
    if (expectedStatus !== enrolment.status) {
      await db.enrolment.update({
        where: { id: enrolment.id },
        data: { status: expectedStatus },
      });
      fixed++;
    }
  }
  
  return `Checked ${enrolments.length} enrolments, fixed ${fixed} status mismatches.`;
}
