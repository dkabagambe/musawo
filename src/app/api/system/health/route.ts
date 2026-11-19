/**
 * GET /api/system/health
 * IT Admin only. Returns detailed health status of all services.
 * Never returns business data, secrets, or personal information.
 */
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/server";
import { db } from "@/lib/db";
import { redis } from "@/lib/db/redis";
import { can } from "@/lib/rbac";

export const dynamic = "force-dynamic";
const TIMEOUT = 4000;

type ServiceStatus = "ok" | "degraded" | "error" | "unconfigured";

interface ServiceCheck {
  name: string;
  status: ServiceStatus;
  latencyMs?: number;
  detail?: string;
  checkedAt: string;
}

async function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("timeout")), ms)
    ),
  ]);
}

async function checkDatabase(): Promise<ServiceCheck> {
  const start = Date.now();
  try {
    await withTimeout(db.$queryRaw`SELECT 1`, TIMEOUT);
    const latencyMs = Date.now() - start;
    return {
      name: "Database",
      status: latencyMs > 2000 ? "degraded" : "ok",
      latencyMs,
      detail: latencyMs > 2000 ? "Response slow" : undefined,
      checkedAt: new Date().toISOString(),
    };
  } catch (e) {
    return { name: "Database", status: "error", detail: "Unreachable", checkedAt: new Date().toISOString() };
  }
}

async function checkRedis(): Promise<ServiceCheck> {
  const start = Date.now();
  try {
    const pong = await withTimeout(redis.ping(), TIMEOUT);
    const latencyMs = Date.now() - start;
    if (pong !== "PONG") throw new Error("unexpected response");
    return {
      name: "Redis",
      status: latencyMs > 500 ? "degraded" : "ok",
      latencyMs,
      checkedAt: new Date().toISOString(),
    };
  } catch {
    return { name: "Redis", status: "error", detail: "Unreachable", checkedAt: new Date().toISOString() };
  }
}

async function checkStorage(): Promise<ServiceCheck> {
  if (!process.env.S3_ENDPOINT) {
    return { name: "Storage", status: "unconfigured", detail: "S3_ENDPOINT not set", checkedAt: new Date().toISOString() };
  }
  try {
    const start = Date.now();
    // List objects: a HEAD request on the bucket is enough to verify connectivity
    const { S3Client, ListObjectsV2Command } = await import("@aws-sdk/client-s3");
    const s3 = new S3Client({
      region: process.env.S3_REGION ?? "auto",
      endpoint: process.env.S3_ENDPOINT,
      credentials: {
        accessKeyId: process.env.S3_ACCESS_KEY_ID ?? "dev",
        secretAccessKey: process.env.S3_SECRET_ACCESS_KEY ?? "dev",
      },
      forcePathStyle: true,
    });
    await withTimeout(
      s3.send(new ListObjectsV2Command({ Bucket: process.env.S3_BUCKET ?? "mtc-files", MaxKeys: 1 })),
      TIMEOUT
    );
    return { name: "Storage", status: "ok", latencyMs: Date.now() - start, checkedAt: new Date().toISOString() };
  } catch (e) {
    return { name: "Storage", status: "error", detail: "Bucket unreachable", checkedAt: new Date().toISOString() };
  }
}

async function checkEmail(): Promise<ServiceCheck> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey || apiKey.startsWith("DEMO_") || apiKey.startsWith("re_DEMO")) {
    return { name: "Email", status: "unconfigured", detail: "Demo mode - emails logged to /dev/mail", checkedAt: new Date().toISOString() };
  }
  // We don't send a test email on every health check - just verify the key exists and looks valid
  return { name: "Email", status: "ok", detail: "Resend API key configured", checkedAt: new Date().toISOString() };
}

async function checkJobs(): Promise<ServiceCheck> {
  try {
    // Check if any job has failed in the last 24 hours
    const yesterday = new Date(Date.now() - 86400000);
    const failedCount = await db.jobRun.count({
      where: { status: "FAILED", startedAt: { gte: yesterday } },
    });
    return {
      name: "Scheduled Jobs",
      status: failedCount > 0 ? "degraded" : "ok",
      detail: failedCount > 0 ? `${failedCount} job failure${failedCount > 1 ? "s" : ""} in last 24h` : "All jobs healthy",
      checkedAt: new Date().toISOString(),
    };
  } catch {
    return { name: "Scheduled Jobs", status: "error", detail: "Cannot read job status", checkedAt: new Date().toISOString() };
  }
}

async function getCurrentLoad() {
  try {
    const now = new Date();
    const [activeSessionsRaw, liveClassCount, examCount] = await Promise.all([
      redis.get("presence:count").catch(() => null),
      db.liveClass.count({
        where: { status: "ACTIVE" },
      }).catch(() => 0),
      db.examAttempt.count({
        where: { status: "IN_PROGRESS", startedAt: { gte: new Date(now.getTime() - 3600000) } },
      }).catch(() => 0),
    ]);
    return {
      onlineUsers: activeSessionsRaw ? parseInt(activeSessionsRaw, 10) : null,
      liveClasses: liveClassCount,
      activeExams: examCount,
    };
  } catch {
    return { onlineUsers: null, liveClasses: 0, activeExams: 0 };
  }
}

async function getLastBackup() {
  try {
    const lastRun = await db.jobRun.findFirst({
      where: { jobKey: "nightly-backup" },
      orderBy: { startedAt: "desc" },
    });
    if (!lastRun) return null;
    const ageHours = (Date.now() - lastRun.startedAt.getTime()) / 3600000;
    return {
      status: lastRun.status,
      startedAt: lastRun.startedAt.toISOString(),
      durationMs: lastRun.durationMs,
      ageHours: Math.round(ageHours * 10) / 10,
      overdue: ageHours > 26,
    };
  } catch {
    return null;
  }
}

export async function GET() {
  const session = await auth();
  if (!session?.user || !can(session.user.role, "health.view")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const [db_check, redis_check, storage_check, email_check, jobs_check, load, lastBackup] =
    await Promise.all([
      checkDatabase(),
      checkRedis(),
      checkStorage(),
      checkEmail(),
      checkJobs(),
      getCurrentLoad(),
      getLastBackup(),
    ]);

  const services = [db_check, redis_check, storage_check, email_check, jobs_check];
  const overallStatus: ServiceStatus =
    services.some((s) => s.status === "error")
      ? "error"
      : services.some((s) => s.status === "degraded")
        ? "degraded"
        : "ok";

  // App info (no secrets)
  const appInfo = {
    version: process.env.APP_VERSION ?? "unknown",
    commit: (process.env.RENDER_GIT_COMMIT ?? process.env.VERCEL_GIT_COMMIT_SHA ?? "unknown").slice(0, 8),
    env: process.env.APP_ENV ?? "development",
    nodeVersion: process.version,
    uptime: Math.round(process.uptime()),
  };

  // Open alert count
  let openAlerts = 0;
  try {
    openAlerts = await db.alertItem.count({ where: { status: "OPEN" } });
  } catch { /* ignore */ }

  return NextResponse.json({
    status: overallStatus,
    services,
    load,
    lastBackup,
    openAlerts,
    app: appInfo,
    checkedAt: new Date().toISOString(),
  });
}
