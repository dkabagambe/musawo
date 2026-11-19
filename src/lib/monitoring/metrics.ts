/**
 * Performance metrics collection
 * Records request duration, status, and route in a lightweight table.
 * NO personal data collected.
 */

import { db } from "@/lib/db";
import { redis } from "@/lib/db/redis";

/**
 * Record a request metric
 * Called by middleware after request completes
 */
export async function recordMetric(params: {
  route: string;
  method: string;
  status: number;
  durationMs: number;
}) {
  // Sanitize route - remove IDs to group similar requests
  const sanitizedRoute = sanitizeRoute(params.route);
  
  try {
    // Store in database for long-term analysis
    await db.requestMetric.create({
      data: {
        route: sanitizedRoute,
        method: params.method,
        status: params.status,
        durationMs: params.durationMs,
      },
    });

    // Also increment counters in Redis for fast access
    const hour = new Date().toISOString().slice(0, 13); // YYYY-MM-DDTHH
    await Promise.all([
      redis.zadd(`metrics:${hour}`, params.durationMs, `${sanitizedRoute}:${Date.now()}`),
      redis.incr(`metrics:${hour}:count`),
      redis.expire(`metrics:${hour}`, 86400 * 7), // 7 days
      params.status >= 400 ? redis.incr(`metrics:${hour}:errors`) : Promise.resolve(),
    ]).catch(() => null); // Non-fatal if Redis fails
  } catch (err) {
    // Don't fail the request if metrics recording fails
    console.error("Failed to record metric:", err);
  }
}

/**
 * Sanitize route by replacing dynamic segments with placeholders
 * /api/courses/clxxx123/lessons/clyyy456 -> /api/courses/:id/lessons/:id
 */
function sanitizeRoute(route: string): string {
  return route
    .replace(/\/cl[a-z0-9]{24,}/gi, "/:id") // CUIDs
    .replace(/\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, "/:uuid") // UUIDs
    .replace(/\/\d{4,}/g, "/:id") // Numeric IDs (4+ digits)
    .replace(/\?.*$/, ""); // Remove query params
}

/**
 * Get performance metrics for a time window
 */
export async function getPerformanceMetrics(hoursBack = 24) {
  const since = new Date(Date.now() - hoursBack * 3600000);
  
  // Get metrics from database
  const metrics = await db.requestMetric.findMany({
    where: { timestamp: { gte: since } },
    orderBy: { timestamp: "asc" },
  });

  if (metrics.length === 0) {
    return {
      totalRequests: 0,
      errorRate: 0,
      p50: 0,
      p95: 0,
      p99: 0,
      byRoute: [],
      slowestRoutes: [],
    };
  }

  // Overall stats
  const totalRequests = metrics.length;
  const errors = metrics.filter((m) => m.status >= 400).length;
  const errorRate = totalRequests > 0 ? (errors / totalRequests) * 100 : 0;

  // Calculate percentiles
  const sortedDurations = metrics.map((m) => m.durationMs).sort((a, b) => a - b);
  const p50 = percentile(sortedDurations, 50);
  const p95 = percentile(sortedDurations, 95);
  const p99 = percentile(sortedDurations, 99);

  // Group by route
  const byRoute = new Map<string, { count: number; durations: number[]; errors: number }>();
  for (const m of metrics) {
    const existing = byRoute.get(m.route) ?? { count: 0, durations: [], errors: 0 };
    existing.count++;
    existing.durations.push(m.durationMs);
    if (m.status >= 400) existing.errors++;
    byRoute.set(m.route, existing);
  }

  const routeStats = Array.from(byRoute.entries())
    .map(([route, data]) => {
      const sorted = data.durations.sort((a, b) => a - b);
      return {
        route,
        count: data.count,
        errors: data.errors,
        errorRate: (data.errors / data.count) * 100,
        p50: percentile(sorted, 50),
        p95: percentile(sorted, 95),
      };
    })
    .sort((a, b) => b.count - a.count);

  const slowestRoutes = [...routeStats].sort((a, b) => b.p95 - a.p95).slice(0, 10);

  return {
    totalRequests,
    errorRate: Math.round(errorRate * 100) / 100,
    p50,
    p95,
    p99,
    byRoute: routeStats,
    slowestRoutes,
  };
}

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const index = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, index)] ?? 0;
}

/**
 * Get current system load indicators
 */
export async function getCurrentLoad() {
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

/**
 * Cleanup old metrics (7 day retention)
 * Should be run as a daily cron job
 */
export async function cleanupOldMetrics() {
  const cutoff = new Date(Date.now() - 7 * 86400000); // 7 days
  const result = await db.requestMetric.deleteMany({
    where: { timestamp: { lt: cutoff } },
  });
  return result.count;
}
