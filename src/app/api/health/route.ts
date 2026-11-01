import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * GET /api/health
 * Used by Render health checks and monitoring.
 * Runs a cheap DB ping. Redis is optional (graceful degradation).
 */
export async function GET() {
  const start = Date.now();

  try {
    // Cheap DB liveness check
    await db.$queryRaw`SELECT 1`;
  } catch (err) {
    console.error("[health] DB check failed:", err);
    return NextResponse.json(
      { status: "error", db: "unreachable", uptime: process.uptime() },
      { status: 503 }
    );
  }

  // Redis is optional — just report status, never fail health for it
  let redisStatus = "unchecked";
  try {
    const { redis } = await import("@/lib/db/redis");
    await redis.ping();
    redisStatus = "ok";
  } catch {
    redisStatus = "unavailable";
  }

  return NextResponse.json({
    status: "ok",
    db: "ok",
    redis: redisStatus,
    latencyMs: Date.now() - start,
    uptime: process.uptime(),
    env: process.env.APP_ENV ?? "development",
  });
}
