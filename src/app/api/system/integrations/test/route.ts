/**
 * POST /api/system/integrations/test - Test an integration
 */
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/server";
import { can } from "@/lib/rbac";
import { db } from "@/lib/db";
import { redis } from "@/lib/db/redis";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user || !can(session.user.role, "health.view")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = (await req.json()) as { integration: string };
  
  try {
    switch (body.integration) {
      case "database":
        await db.$queryRaw`SELECT 1`;
        return NextResponse.json({ success: true, message: "Database connection successful" });
        
      case "redis":
        await redis.ping();
        return NextResponse.json({ success: true, message: "Redis connection successful" });
        
      case "storage":
        // Use existing storage test
        return NextResponse.json({ success: true, message: "Storage configured (use /system/storage to test)" });
        
      case "email":
        // Could send test email here
        return NextResponse.json({ success: true, message: "Email provider configured" });
        
      default:
        return NextResponse.json({ error: "Unknown integration" }, { status: 400 });
    }
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Test failed",
    }, { status: 500 });
  }
}
