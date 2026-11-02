/**
 * GET /api/health
 *
 * Render health check endpoint. Returns 200 when the app is running and
 * the database is reachable; 503 if the DB query fails.
 * Always bypasses auth and the demo gate middleware.
 */

import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const runtime = "nodejs";
// Do not cache — Render needs a live response every poll cycle.
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    // Lightweight DB ping — just reads a single constant from the server.
    await db.$queryRaw`SELECT 1`;
    return NextResponse.json(
      { status: "ok", timestamp: new Date().toISOString() },
      { status: 200 },
    );
  } catch (err) {
    console.error("[health] DB ping failed:", err);
    return NextResponse.json(
      { status: "error", message: "Database unavailable" },
      { status: 503 },
    );
  }
}
