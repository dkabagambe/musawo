import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { requirePermission, ForbiddenError } from "@/lib/rbac";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    requirePermission(session.user.role, "reconciliation.view");
  } catch (err) {
    if (err instanceof ForbiddenError) {
      return NextResponse.json({ error: err.message }, { status: 403 });
    }
    throw err;
  }

  const { searchParams } = new URL(req.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  if (!from || !to) {
    return NextResponse.json({ error: "from and to query params required" }, { status: 400 });
  }

  const fromDate = new Date(from);
  const toDate = new Date(to);

  if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime())) {
    return NextResponse.json({ error: "Invalid date format" }, { status: 400 });
  }

  // Sum COMPLETED non-reversed payments in period
  const payments = await db.payment.findMany({
    where: {
      status: "COMPLETED",
      reversedAt: null,
      paidAt: { gte: fromDate, lte: toDate },
    },
    select: { amount: true },
  });
  const verifiedTotal = payments.reduce((sum, p) => sum + p.amount, 0);

  // Sum VERIFIED (MATCHED) statement lines in period
  const statementLines = await db.statementLine.findMany({
    where: {
      matchStatus: "MATCHED",
      txDate: { gte: fromDate, lte: toDate },
    },
    select: { amount: true },
  });
  const statementTotal = statementLines.reduce((sum, l) => sum + l.amount, 0);

  // Count unresolved claims (SUBMITTED or UNDER_REVIEW)
  const unresolvedCount = await db.manualPaymentClaim.count({
    where: {
      status: { in: ["SUBMITTED", "UNDER_REVIEW"] },
      claimedAt: { gte: fromDate, lte: toDate },
    },
  });

  return NextResponse.json({
    verifiedTotal,
    statementTotal,
    difference: verifiedTotal - statementTotal,
    unresolvedCount,
    period: { from: fromDate.toISOString(), to: toDate.toISOString() },
  });
}
