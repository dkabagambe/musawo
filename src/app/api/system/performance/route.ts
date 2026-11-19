/**
 * GET /api/system/performance - Performance metrics (IT Admin only)
 */
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/server";
import { can } from "@/lib/rbac";
import { getPerformanceMetrics } from "@/lib/monitoring/metrics";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user || !can(session.user.role, "health.view")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const hours = parseInt(searchParams.get("hours") ?? "24", 10);
  const hoursBack = Math.min(Math.max(1, hours), 168); // 1 hour to 7 days

  const metrics = await getPerformanceMetrics(hoursBack);

  return NextResponse.json(metrics);
}
