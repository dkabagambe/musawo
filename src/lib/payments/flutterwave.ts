// Flutterwave payment gateway adapter
// Implements the same interface as the Pesapal client

const BASE_URL = "https://api.flutterwave.com/v3";

interface OrderRequest {
  id: string;
  amount: number;
  currency: string;
  description: string;
  callbackUrl: string;
  customer: {
    firstName: string;
    lastName: string;
    email?: string;
    phone?: string;
  };
  redirectUrl: string;
}

interface OrderResponse {
  orderTrackingId: string;
  merchantReference: string;
  redirectUrl: string;
}

interface TransactionStatusResponse {
  status: "successful" | "failed" | "pending";
  amount: number;
  currency: string;
  txRef: string;
  flwRef: string;
}

function authHeaders() {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${process.env.FLUTTERWAVE_SECRET_KEY}`,
  };
}

export async function initiateOrder(
  order: OrderRequest
): Promise<OrderResponse> {
  const res = await fetch(`${BASE_URL}/payments`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({
      tx_ref: order.id,
      amount: order.amount,
      currency: order.currency,
      redirect_url: order.redirectUrl,
      payment_options: "mobilemoneyrwanda,ugandamobilemoney,card",
      customer: {
        email: order.customer.email ?? `${order.id}@mtc.placeholder`,
        phonenumber: order.customer.phone,
        name: `${order.customer.firstName} ${order.customer.lastName}`,
      },
      customizations: {
        title: "Musawo Training Center",
        description: order.description,
      },
    }),
  });

  if (!res.ok) throw new Error(`Flutterwave payment init failed: ${res.status}`);
  const data = (await res.json()) as { data: { link: string }; status: string };
  return {
    orderTrackingId: order.id,
    merchantReference: order.id,
    redirectUrl: data.data.link,
  };
}

export async function getTransactionStatus(
  transactionId: string
): Promise<TransactionStatusResponse> {
  const res = await fetch(`${BASE_URL}/transactions/${transactionId}/verify`, {
    headers: authHeaders(),
  });

  if (!res.ok)
    throw new Error(`Flutterwave verify failed: ${res.status}`);

  const data = (await res.json()) as {
    data: {
      status: "successful" | "failed" | "pending";
      amount: number;
      currency: string;
      tx_ref: string;
      flw_ref: string;
    };
  };

  return {
    status: data.data.status,
    amount: data.data.amount,
    currency: data.data.currency,
    txRef: data.data.tx_ref,
    flwRef: data.data.flw_ref,
  };
}

export function verifyWebhookSignature(
  body: string,
  signature: string
): boolean {
  const crypto = require("crypto") as typeof import("crypto");
  const secret = process.env.FLUTTERWAVE_WEBHOOK_SECRET ?? "";
  const hash = crypto
    .createHmac("sha256", secret)
    .update(body)
    .digest("hex");
  return hash === signature;
}
