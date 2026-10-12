import { Resend } from "resend";

const FROM = process.env.EMAIL_FROM ?? "MTC <noreply@musawotraining.ug>";

function getResend(): Resend {
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new Error("RESEND_API_KEY is not set");
  return new Resend(key);
}

type EmailTemplate =
  | "welcome"
  | "payment-receipt"
  | "class-reminder"
  | "exam-result"
  | "certificate-issued"
  | "password-reset"
  | "otp"
  | "approval-request";

interface SendEmailParams {
  to: string;
  subject: string;
  template: EmailTemplate;
  variables: Record<string, string>;
}

function renderTemplate(
  template: EmailTemplate,
  variables: Record<string, string>
): string {
  const templates: Record<EmailTemplate, string> = {
    welcome: `
      <h2>Welcome to Musawo Training Center, {{name}}!</h2>
      <p>Your account has been created. You can now log in and start learning.</p>
      <p><a href="{{loginUrl}}">Log in now</a></p>
      <p>If you have any questions, email us at training@musawo.ug.</p>
    `,
    "payment-receipt": `
      <h2>Payment Received — {{courseName}}</h2>
      <p>Dear {{name}},</p>
      <p>We have received your payment of <strong>{{amount}}</strong> on {{date}}.</p>
      <p>Reference: {{paymentRef}}</p>
      <p>You can now access your course. <a href="{{portalUrl}}">Go to your dashboard</a></p>
    `,
    "class-reminder": `
      <h2>Reminder: Live class in {{timeUntil}}</h2>
      <p>Dear {{name}},</p>
      <p><strong>{{className}}</strong> starts at {{time}} on {{date}}.</p>
      <p><a href="{{joinUrl}}">Join the class</a></p>
    `,
    "exam-result": `
      <h2>Your exam result — {{examTitle}}</h2>
      <p>Dear {{name}},</p>
      <p>Your result for <strong>{{examTitle}}</strong>: <strong>{{score}}%</strong> — {{passFail}}</p>
      <p><a href="{{resultsUrl}}">View detailed results</a></p>
    `,
    "certificate-issued": `
      <h2>Your certificate is ready!</h2>
      <p>Dear {{name}},</p>
      <p>Congratulations on completing <strong>{{courseName}}</strong>!</p>
      <p>Your certificate ID is: <strong>{{certId}}</strong></p>
      <p><a href="{{downloadUrl}}">Download your certificate</a></p>
      <p><a href="{{verifyUrl}}">Verify your certificate</a></p>
    `,
    "password-reset": `
      <h2>Reset your password</h2>
      <p>Dear {{name}},</p>
      <p>Click the link below to reset your password. This link expires in 1 hour.</p>
      <p><a href="{{resetUrl}}">Reset password</a></p>
      <p>If you did not request this, ignore this email.</p>
    `,
    otp: `
      <h2>Your login code</h2>
      <p>Your Musawo Training Center one-time code is: <strong>{{code}}</strong></p>
      <p>Valid for 5 minutes. Do not share this code.</p>
    `,
    "approval-request": `
      <h2>Action required: {{type}}</h2>
      <p>Dear {{name}},</p>
      <p><strong>{{requester}}</strong> has submitted an approval request that requires your decision.</p>
      <table style="border-collapse:collapse;width:100%;margin:16px 0;">
        <tr><td style="padding:6px 0;color:#6B7280;">Type</td><td style="padding:6px 0;font-weight:600;">{{type}}</td></tr>
        <tr><td style="padding:6px 0;color:#6B7280;">Amount</td><td style="padding:6px 0;">{{amount}}</td></tr>
        <tr><td style="padding:6px 0;color:#6B7280;">Reason</td><td style="padding:6px 0;">{{reason}}</td></tr>
      </table>
      <p><a href="{{approvalUrl}}" style="background:#FF6900;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;display:inline-block;font-weight:600;">Review &amp; Decide</a></p>
      <p style="font-size:12px;color:#9CA3AF;">This link expires in {{expiresIn}}. Login with your Director account and 2FA is required.</p>
    `,
  };

  let html = templates[template];
  for (const [key, value] of Object.entries(variables)) {
    html = html.replaceAll(`{{${key}}}`, value);
  }

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    </head>
    <body style="font-family: system-ui, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; color: #313131;">
      <div style="margin-bottom: 24px;">
        <img src="https://learn.musawotraining.ug/assets/logo.webp" alt="Musawo Training Center" height="48" />
      </div>
      ${html}
      <hr style="margin-top: 32px; border-color: #E5E7EB;" />
      <p style="font-size: 12px; color: #6B7280;">
        Musawo Training Center — Plot 5, ADFA Building, Zone 8 Lungujja, Kampala, Uganda<br />
        <a href="mailto:training@musawo.ug">training@musawo.ug</a>
      </p>
    </body>
    </html>
  `;
}

export async function sendEmail(params: SendEmailParams): Promise<void> {
  const html = renderTemplate(params.template, params.variables);

  try {
    const resend = getResend();
    await resend.emails.send({
      from: FROM,
      to: params.to,
      subject: params.subject,
      html,
    });
  } catch (err) {
    console.error("Email send failed:", err);
    // Non-fatal — log and continue
  }
}
