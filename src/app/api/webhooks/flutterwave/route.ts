import { NextRequest, NextResponse } from "next/server";
import { verifyWebhookSignature, getTransactionStatus } from "@/lib/payments/flutterwave";
import { processConfirmedPayment } from "@/lib/payments";
import { db } from "@/lib/db";

export async function POST(req: NextRequest) {
  const body = await req.text();
  const signature = req.headers.get("verif-hash") ?? "";

  if (!verifyWebhookSignature(body, signature)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let payload: { event: string; data: { tx_ref: string; id: number; status: string } };
  try {
    payload = JSON.parse(body);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (payload.event !== "charge.completed") {
    return NextResponse.json({ status: "ignored" });
  }

  const txRef = payload.data.tx_ref;
  const payment = await db.payment.findFirst({ where: { gatewayOrderId: txRef } });

  if (!payment) {
    console.warn(`Flutterwave webhook: payment not found for ${txRef}`);
    return NextResponse.json({ status: "not_found" });
  }

  // Verify with Flutterwave
  try {
    const result = await getTransactionStatus(String(payload.data.id));
    if (result.status === "successful") {
      await db.payment.update({
        where: { id: payment.id },
        data: { gatewayRef: String(payload.data.id) },
      });
      await processConfirmedPayment(payment.id);
    } else {
      await db.payment.update({
        where: { id: payment.id },
        data: { status: "FAILED", failureReason: result.status },
      });
    }
  } catch (err) {
    console.error("Flutterwave verify error:", err);
    return NextResponse.json({ error: "Verification failed" }, { status: 500 });
  }

  return NextResponse.json({ status: "ok" });
}
