import { NextRequest, NextResponse } from "next/server";
import { getTransactionStatus } from "@/lib/payments/pesapal";
import { processConfirmedPayment } from "@/lib/payments";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";
import { redis } from "@/lib/db/redis";

/**
 * Pesapal IPN (Instant Payment Notification) webhook handler.
 * Pesapal sends: OrderNotificationType, OrderTrackingId, OrderMerchantReference
 */
export async function POST(req: NextRequest) {
  const body = await req.text();
  let payload: Record<string, string>;

  try {
    // Pesapal sends form-encoded or JSON
    try {
      payload = JSON.parse(body) as Record<string, string>;
    } catch {
      payload = Object.fromEntries(new URLSearchParams(body));
    }
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const orderTrackingId = payload.OrderTrackingId ?? payload.orderTrackingId;
  const merchantRef = payload.OrderMerchantReference ?? payload.orderMerchantReference;

  if (!orderTrackingId || !merchantRef) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  // Find the payment record by gateway order ID
  const payment = await db.payment.findFirst({
    where: {
      OR: [
        { gatewayRef: orderTrackingId },
        { gatewayOrderId: merchantRef },
      ],
    },
  });

  if (!payment) {
    console.warn(`Pesapal webhook: payment not found for ${merchantRef}`);
    // Return 200 to prevent Pesapal retries on unknown orders
    return NextResponse.json({ orderNotificationType: "IPNCHANGE", orderTrackingId });
  }

  // Early return if already completed
  if (payment.status === "COMPLETED") {
    return NextResponse.json({
      orderNotificationType: "IPNCHANGE",
      orderTrackingId,
      orderMerchantReference: merchantRef,
      status: 200,
    });
  }

  // Redis idempotency lock - 30 s TTL
  const lockKey = `webhook:lock:${payment.id}`;
  const acquired = await redis.set(lockKey, "1", "EX", 30, "NX");
  if (!acquired) {
    return NextResponse.json({ status: "processing" });
  }

  // Query Pesapal to confirm (never trust the webhook alone)
  let status: string;
  try {
    const result = await getTransactionStatus(orderTrackingId);
    status = result.paymentStatusDescription;
  } catch (err) {
    console.error("Pesapal status query failed:", err);
    return NextResponse.json({ error: "Status query failed" }, { status: 500 });
  }

  if (status === "Completed") {
    // Update gatewayRef with the confirmed tracking ID
    await db.payment.update({
      where: { id: payment.id },
      data: { gatewayRef: orderTrackingId },
    });
    await processConfirmedPayment(payment.id);
  } else if (status === "Failed" || status === "Invalid") {
    await db.payment.update({
      where: { id: payment.id },
      data: { status: "FAILED", failureReason: status },
    });
    await audit({
      action: "PAYMENT_INITIATED",
      entityType: "Payment",
      entityId: payment.id,
      metadata: { pesapalStatus: status },
      ip: req.headers.get("x-forwarded-for") ?? undefined,
    });
  }

  // Pesapal requires this exact response body
  return NextResponse.json({
    orderNotificationType: "IPNCHANGE",
    orderTrackingId,
    orderMerchantReference: merchantRef,
    status: 200,
  });
}

export async function GET(req: NextRequest) {
  // Pesapal also redirects user here after payment
  const { searchParams } = new URL(req.url);
  const orderTrackingId = searchParams.get("OrderTrackingId");
  const merchantRef = searchParams.get("OrderMerchantReference");

  if (orderTrackingId && merchantRef) {
    // Redirect to payment result page
    return NextResponse.redirect(
      new URL(`/dashboard/payments?ref=${merchantRef}`, req.url)
    );
  }

  return NextResponse.redirect(new URL("/dashboard/payments", req.url));
}
