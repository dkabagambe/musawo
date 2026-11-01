import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { processConfirmedPayment } from "@/lib/payments";
import { isDemoAllowed } from "@/lib/env";

/**
 * GET /api/payments/demo-confirm?paymentId=…&enrolmentId=…&ref=…
 *
 * Only active when APP_ENV is development or staging.
 */
export async function GET(req: NextRequest) {
  if (!isDemoAllowed()) {
    return NextResponse.json({ error: "Not available in production" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const paymentId   = searchParams.get("paymentId");
  const enrolmentId = searchParams.get("enrolmentId");
  const ref         = searchParams.get("ref") ?? "";

  if (!paymentId || !enrolmentId) {
    return NextResponse.json({ error: "Missing params" }, { status: 400 });
  }

  const payment = await db.payment.findUnique({ where: { id: paymentId } });
  if (!payment) return NextResponse.json({ error: "Payment not found" }, { status: 404 });

  if (payment.status === "PENDING") {
    await processConfirmedPayment(paymentId);
  }

  return NextResponse.redirect(
    new URL(`/dashboard/payments?demo=1&ref=${ref}`, req.url)
  );
}
