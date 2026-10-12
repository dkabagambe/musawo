// Pesapal v3 payment gateway client
// Docs: https://developer.pesapal.com/how-to-integrate/e-commerce/api-30-json/pesapalv3

const BASE_URL =
  process.env.PESAPAL_BASE_URL ?? "https://pay.pesapal.com/v3";

interface PesapalToken {
  token: string;
  expiryDate: string;
}

interface OrderRequest {
  id: string;           // Unique merchant reference
  currency: string;
  amount: number;
  description: string;
  callbackUrl: string;
  notificationId: string;
  billingAddress: {
    firstName: string;
    lastName: string;
    emailAddress?: string;
    phoneNumber?: string;
  };
}

interface OrderResponse {
  orderTrackingId: string;
  merchantReference: string;
  redirectUrl: string;
  error?: { code: string; message: string };
}

interface TransactionStatusResponse {
  paymentMethod: string;
  amount: number;
  createdDate: string;
  confirmationCode: string;
  paymentStatusDescription:
    | "Completed"
    | "Failed"
    | "Invalid"
    | "Reversed"
    | "Pending";
  description: string;
  merchantReference: string;
  currency: string;
}

let cachedToken: { token: string; expiresAt: number } | null = null;

async function getAuthToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) {
    return cachedToken.token;
  }

  const res = await fetch(`${BASE_URL}/api/Auth/RequestToken`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      consumer_key: process.env.PESAPAL_CONSUMER_KEY,
      consumer_secret: process.env.PESAPAL_CONSUMER_SECRET,
    }),
  });

  if (!res.ok) throw new Error(`Pesapal auth failed: ${res.status}`);

  const data = (await res.json()) as PesapalToken;
  // Token valid for ~5 minutes per Pesapal docs
  cachedToken = {
    token: data.token,
    expiresAt: new Date(data.expiryDate).getTime(),
  };
  return cachedToken.token;
}

export async function initiateOrder(
  order: OrderRequest
): Promise<OrderResponse> {
  const token = await getAuthToken();

  const res = await fetch(`${BASE_URL}/api/Transactions/SubmitOrderRequest`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      id: order.id,
      currency: order.currency,
      amount: order.amount,
      description: order.description,
      callback_url: order.callbackUrl,
      notification_id: order.notificationId,
      billing_address: {
        first_name: order.billingAddress.firstName,
        last_name: order.billingAddress.lastName,
        email_address: order.billingAddress.emailAddress,
        phone_number: order.billingAddress.phoneNumber,
      },
    }),
  });

  if (!res.ok) throw new Error(`Pesapal order failed: ${res.status}`);
  return res.json() as Promise<OrderResponse>;
}

export async function getTransactionStatus(
  orderTrackingId: string
): Promise<TransactionStatusResponse> {
  const token = await getAuthToken();

  const res = await fetch(
    `${BASE_URL}/api/Transactions/GetTransactionStatus?orderTrackingId=${orderTrackingId}`,
    {
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
    }
  );

  if (!res.ok) throw new Error(`Pesapal status check failed: ${res.status}`);
  return res.json() as Promise<TransactionStatusResponse>;
}

export async function registerIpn(callbackUrl: string): Promise<string> {
  const token = await getAuthToken();

  const res = await fetch(`${BASE_URL}/api/URLSetup/RegisterIPN`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      url: callbackUrl,
      ipn_notification_type: "POST",
    }),
  });

  if (!res.ok) throw new Error(`Pesapal IPN registration failed: ${res.status}`);
  const data = (await res.json()) as { ipn_id: string };
  return data.ipn_id;
}
