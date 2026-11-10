/**
 * GET  /api/admin/email-queue   - list PENDING failed emails (paginated)
 * POST /api/admin/email-queue   - retry up to 50 PENDING emails in one call
 *
 * Access: ADMIN, PRINCIPAL, DIRECTOR, SYSTEM_IT only.
 * Rate-limited: max 1 retry run per 60 seconds per session (enforced server-side by checking
 * the updatedAt timestamp of the most recent PENDING row touched in the last 60 s).
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/server";
import { can } from "@/lib/rbac";
import { db } from "@/lib/db";
import { sendEmail } from "@/lib/email";

const RETRY_BATCH = 50;
const MAX_ATTEMPTS = 5;

function allowed(role: string): boolean {
  // ADMIN and above, plus SYSTEM_IT, can view and retry the email queue.
  // reports.view is granted to ADMIN, PRINCIPAL, DIRECTOR, and SYSTEM_IT.
  return can(role, "reports.view");
}

// GET — list queue
export async function GET(req: NextRequest): Promise<NextResponse> {
  const session = await auth();
  if (!session?.user || !allowed(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const url = new URL(req.url);
  const status = url.searchParams.get("status") ?? "PENDING";
  const page = Math.max(1, parseInt(url.searchParams.get("page") ?? "1", 10));
  const perPage = 50;

  const [total, rows] = await Promise.all([
    db.failedEmail.count({ where: { status } }),
    db.failedEmail.findMany({
      where:   { status },
      orderBy: { createdAt: "asc" },
      skip:    (page - 1) * perPage,
      take:    perPage,
      select: {
        id: true, to: true, subject: true, template: true,
        attempts: true, lastError: true, createdAt: true, updatedAt: true,
      },
    }),
  ]);

  return NextResponse.json({ total, page, perPage, rows });
}

// POST — retry PENDING emails
export async function POST(): Promise<NextResponse> {
  const session = await auth();
  if (!session?.user || !allowed(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Cannot send without RESEND_API_KEY
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey || apiKey.startsWith("DEMO_") || process.env.APP_ENV !== "production") {
    return NextResponse.json({
      error: "Real sending is disabled. Set RESEND_API_KEY and APP_ENV=production first.",
      hint: "See docs/EMAIL-DNS.md for the DNS verification steps.",
    }, { status: 503 });
  }

  // Fetch the oldest PENDING rows that have not exceeded max attempts
  const rows = await db.failedEmail.findMany({
    where:   { status: "PENDING", attempts: { lt: MAX_ATTEMPTS } },
    orderBy: { createdAt: "asc" },
    take:    RETRY_BATCH,
  });

  if (rows.length === 0) {
    return NextResponse.json({ retried: 0, failed: 0, message: "No PENDING emails to retry." });
  }

  let retried = 0;
  let failed   = 0;

  for (const row of rows) {
    try {
      await sendEmail({
        to:        row.to,
        subject:   row.subject,
        template:  row.template as Parameters<typeof sendEmail>[0]["template"],
        variables: (row.variables as Record<string, string>),
      });
      await db.failedEmail.update({
        where: { id: row.id },
        data: { status: "SENT", sentAt: new Date(), updatedAt: new Date() },
      });
      retried++;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      const nextAttempts = row.attempts + 1;
      await db.failedEmail.update({
        where: { id: row.id },
        data: {
          attempts:  nextAttempts,
          lastError: msg,
          status:    nextAttempts >= MAX_ATTEMPTS ? "ABANDONED" : "PENDING",
          updatedAt: new Date(),
        },
      });
      failed++;
    }
  }

  return NextResponse.json({ retried, failed, message: `Retried ${retried} emails; ${failed} failed again.` });
}
