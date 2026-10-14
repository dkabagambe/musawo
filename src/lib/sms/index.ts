interface SendSmsParams {
  to: string;    // E.164 format: +256...
  message: string;
}

export async function sendSms(params: SendSmsParams): Promise<void> {
  const apiKey = process.env.AT_API_KEY;
  const username = process.env.AT_USERNAME ?? "sandbox";
  const senderId = process.env.AT_SENDER_ID ?? "MUSAWO";

  if (!apiKey) {
    console.warn("SMS: AT_API_KEY not set - skipping SMS");
    return;
  }

  const baseUrl =
    username === "sandbox"
      ? "https://api.sandbox.africastalking.com/version1/messaging"
      : "https://api.africastalking.com/version1/messaging";

  const body = new URLSearchParams({
    username,
    to: params.to,
    message: params.message,
    from: senderId,
  });

  const res = await fetch(baseUrl, {
    method: "POST",
    headers: {
      apiKey,
      Accept: "application/json",
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: body.toString(),
  });

  if (!res.ok) {
    const text = await res.text();
    console.error(`SMS send failed (${res.status}):`, text);
  }
}
