/**
 * GET /api/system/integrations - List all integrations with status
 */
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/server";
import { can } from "@/lib/rbac";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();
  if (!session?.user || !can(session.user.role, "health.view")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const integrations = [
    {
      id: "database",
      name: "PostgreSQL Database",
      status: process.env.DATABASE_URL ? "working" : "missing",
      lastCheck: new Date().toISOString(),
      error: null,
      testable: true,
    },
    {
      id: "redis",
      name: "Redis Cache",
      status: process.env.REDIS_URL ? "working" : "missing",
      lastCheck: new Date().toISOString(),
      error: null,
      testable: true,
    },
    {
      id: "storage",
      name: "S3 Storage",
      status: process.env.S3_ENDPOINT ? "configured" : "missing",
      lastCheck: process.env.S3_ENDPOINT ? new Date().toISOString() : null,
      error: null,
      testable: true,
    },
    {
      id: "email",
      name: "Email Provider (Resend)",
      status: process.env.RESEND_API_KEY?.startsWith("re_") ? "configured" : "missing",
      lastCheck: process.env.RESEND_API_KEY ? new Date().toISOString() : null,
      error: process.env.RESEND_API_KEY?.startsWith("DEMO") ? "Demo mode - emails logged only" : null,
      testable: true,
    },
    {
      id: "sms",
      name: "SMS Provider",
      status: process.env.SMS_API_KEY ? "configured" : "missing",
      lastCheck: null,
      error: "Not yet implemented",
      testable: false,
    },
    {
      id: "meet",
      name: "Google Meet",
      status: "configured",
      lastCheck: new Date().toISOString(),
      error: "Using public Meet links",
      testable: false,
    },
    {
      id: "payment_pesapal",
      name: "Pesapal Payment Gateway",
      status: process.env.PESAPAL_CONSUMER_KEY ? "configured" : "missing",
      lastCheck: null,
      error: null,
      testable: false,
    },
  ];

  return NextResponse.json(integrations);
}
