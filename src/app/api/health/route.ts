/**
 * GET /api/health
 *
 * Render health check endpoint (polled every 30 s).
 *
 * Returns:
 *  200  { status: "ok" }          — app and DB are healthy
 *  200  { status: "degraded" }    — app is up, DB slow but responding
 *  503  { status: "error" }       — DB not reachable (Render retries)
 *
 * We return 200 even for degraded state so Render does not route around a
 * perfectly functional app just because a single DB ping was slow. A real
 * outage (exception) still returns 503 so Render restarts the container.
 *
 * Always bypasses auth and the demo gate middleware.
 */

import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// DB ping with a hard timeout so a hung connection never holds up Render's
// health poller (which has its own timeout and will 502 if we don't respond).
const DB_PING_TIMEOUT_MS = 4000;

async function pingDB(): Promise<"ok" | "degraded" | "error"> {
  const start = Date.now();
  try {
    await Promise.race([
      db.$queryRaw`SELECT 1`,
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("DB ping timed out")), DB_PING_TIMEOUT_MS)
      ),
    ]);
    const ms = Date.now() - start;
    return ms > 2000 ? "degraded" : "ok";
  } catch {
    return "error";
  }
}

export async function GET() {
  const db_status = await pingDB();

  if (db_status === "error") {
    return NextResponse.json(
      { status: "error", message: "Database unavailable", timestamp: new Date().toISOString() },
      { status: 503 },
    );
  }

  return NextResponse.json(
    { status: db_status, timestamp: new Date().toISOString() },
    { status: 200 },
  );
}
