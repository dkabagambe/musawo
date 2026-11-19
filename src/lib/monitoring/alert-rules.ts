/**
 * Alert rules engine
 * Checks system health thresholds and raises alerts when conditions are met.
 * Should be run periodically (every 5-15 minutes) as a cron job.
 */

import { db } from "@/lib/db";
import { redis } from "@/lib/db/redis";
import { getPerformanceMetrics } from "./metrics";

interface AlertRule {
  key: string;
  severity: "WARNING" | "CRITICAL";
  title: string;
  check: () => Promise<{ triggered: boolean; description?: string }>;
}

/**
 * All alert rules
 */
const ALERT_RULES: AlertRule[] = [
  {
    key: "backup_overdue",
    severity: "CRITICAL",
    title: "Backup overdue",
    check: async () => {
      const lastBackup = await db.jobRun.findFirst({
        where: { jobKey: "nightly-backup" },
        orderBy: { startedAt: "desc" },
      });
      if (!lastBackup) {
        return { triggered: true, description: "No backup has ever run" };
      }
      const ageHours = (Date.now() - lastBackup.startedAt.getTime()) / 3600000;
      if (ageHours > 26) {
        return {
          triggered: true,
          description: `Last backup was ${Math.round(ageHours)} hours ago (target: 24 hours)`,
        };
      }
      return { triggered: false };
    },
  },
  {
    key: "job_failed",
    severity: "WARNING",
    title: "Job failure detected",
    check: async () => {
      // Check if any job has failed twice in a row
      const jobs = await db.jobDefinition.findMany({ where: { active: true } });
      for (const job of jobs) {
        const lastTwo = await db.jobRun.findMany({
          where: { jobKey: job.key },
          orderBy: { startedAt: "desc" },
          take: 2,
        });
        if (lastTwo.length === 2 && lastTwo.every((r) => r.status === "FAILED")) {
          return {
            triggered: true,
            description: `Job "${job.label}" (${job.key}) has failed twice in a row. Last error: ${lastTwo[0]?.error ?? "unknown"}`,
          };
        }
      }
      return { triggered: false };
    },
  },
  {
    key: "error_rate_high",
    severity: "WARNING",
    title: "Error rate above threshold",
    check: async () => {
      const metrics = await getPerformanceMetrics(1); // last hour
      if (metrics.totalRequests < 10) {
        // Not enough data
        return { triggered: false };
      }
      if (metrics.errorRate > 2) {
        return {
          triggered: true,
          description: `Error rate is ${metrics.errorRate.toFixed(1)}% over the last hour (threshold: 2%). Total requests: ${metrics.totalRequests}`,
        };
      }
      return { triggered: false };
    },
  },
  {
    key: "p95_high",
    severity: "WARNING",
    title: "P95 response time above threshold",
    check: async () => {
      const metrics = await getPerformanceMetrics(1); // last hour
      if (metrics.totalRequests < 10) {
        // Not enough data
        return { triggered: false };
      }
      if (metrics.p95 > 2000) {
        return {
          triggered: true,
          description: `P95 response time is ${metrics.p95}ms over the last hour (threshold: 2000ms)`,
        };
      }
      return { triggered: false };
    },
  },
  {
    key: "database_connections_high",
    severity: "WARNING",
    title: "Database connection pool usage high",
    check: async () => {
      // Check Prisma pool metrics if available
      // This is a placeholder - actual implementation depends on monitoring setup
      // For now, just check if database is reachable
      try {
        await db.$queryRaw`SELECT 1`;
        return { triggered: false };
      } catch {
        return { triggered: true, description: "Database unreachable" };
      }
    },
  },
  {
    key: "redis_unreachable",
    severity: "CRITICAL",
    title: "Redis unreachable",
    check: async () => {
      try {
        const pong = await redis.ping();
        if (pong !== "PONG") throw new Error("unexpected response");
        return { triggered: false };
      } catch (err) {
        return {
          triggered: true,
          description: `Redis health check failed: ${err instanceof Error ? err.message : "unknown"}`,
        };
      }
    },
  },
  {
    key: "storage_unreachable",
    severity: "CRITICAL",
    title: "Storage bucket unreachable",
    check: async () => {
      if (!process.env.S3_ENDPOINT) {
        return { triggered: false }; // Not configured, not an error
      }
      try {
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
        await s3.send(
          new ListObjectsV2Command({ Bucket: process.env.S3_BUCKET ?? "mtc-files", MaxKeys: 1 })
        );
        return { triggered: false };
      } catch (err) {
        return {
          triggered: true,
          description: `Storage health check failed: ${err instanceof Error ? err.message : "unknown"}`,
        };
      }
    },
  },
  {
    key: "email_failures_high",
    severity: "WARNING",
    title: "Email failure rate high",
    check: async () => {
      const last24h = new Date(Date.now() - 86400000);
      const [total, failed] = await Promise.all([
        db.notification.count({
          where: { channel: "EMAIL", createdAt: { gte: last24h } },
        }),
        db.failedEmail.count({
          where: { createdAt: { gte: last24h }, status: "PENDING", attempts: { gte: 3 } },
        }),
      ]);
      if (total < 10) return { triggered: false }; // Not enough data
      const failureRate = (failed / total) * 100;
      if (failureRate > 5) {
        return {
          triggered: true,
          description: `${failed} of ${total} emails failed in last 24 hours (${failureRate.toFixed(1)}%, threshold: 5%)`,
        };
      }
      return { triggered: false };
    },
  },
];

/**
 * Check all alert rules and create alerts for triggered conditions.
 * De-duplicates: won't create a new alert if an identical OPEN one exists.
 */
export async function checkAlertRules(): Promise<{ checked: number; triggered: number }> {
  let triggered = 0;

  for (const rule of ALERT_RULES) {
    try {
      const result = await rule.check();
      if (result.triggered) {
        // Check if an OPEN alert already exists for this rule
        const existing = await db.alertItem.findFirst({
          where: { ruleKey: rule.key, status: "OPEN" },
        });
        if (!existing) {
          await db.alertItem.create({
            data: {
              ruleKey: rule.key,
              severity: rule.severity,
              title: rule.title,
              description: result.description ?? "Threshold exceeded",
            },
          });

          // Notify IT Admin
          try {
            const managers = await db.user.findMany({
              where: { role: "SYSTEM_IT", status: "ACTIVE" },
              select: { id: true },
            });
            if (managers.length > 0) {
              await db.notification.createMany({
                data: managers.map((m) => ({
                  userId: m.id,
                  channel: "IN_APP" as const,
                  type: "SYSTEM_ALERT",
                  subject: `${rule.severity}: ${rule.title}`,
                  body: result.description ?? "Threshold exceeded",
                })),
              });
            }
          } catch {
            // Non-fatal
          }

          triggered++;
        }
      } else {
        // Condition not triggered - auto-resolve any OPEN alerts for this rule
        await db.alertItem.updateMany({
          where: { ruleKey: rule.key, status: "OPEN" },
          data: { status: "RESOLVED", resolvedAt: new Date() },
        });
      }
    } catch (err) {
      console.error(`Alert rule ${rule.key} check failed:`, err);
    }
  }

  return { checked: ALERT_RULES.length, triggered };
}
