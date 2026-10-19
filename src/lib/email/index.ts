import { Resend } from "resend";

const FROM = process.env.EMAIL_FROM ?? "MTC <noreply@mtc.ac.ug>";
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://mtc.ac.ug";
const LOGO_URL = `${SITE_URL}/assets/logo-header.png`;

function getResend(): Resend {
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new Error("RESEND_API_KEY is not set");
  return new Resend(key);
}

type EmailTemplate =
  | "welcome"
  | "email-verification"
  | "student-invite"
  | "staff-invite"
  | "payment-receipt"
  | "class-reminder"
  | "exam-result"
  | "certificate-issued"
  | "password-reset"
  | "otp"
  | "approval-request"
  | "application-confirmation"
  | "application-received-registrar"
  | "application-accepted"
  | "application-rejected";

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
      <p>If you have any questions, email us at info@mtc.ac.ug or call 0709 184 468.</p>
    `,
    "email-verification": `
      <h2>Verify your email address</h2>
      <p>Hi {{name}},</p>
      <p>Please verify your email address by clicking the button below.</p>
      <p style="margin: 24px 0;">
        <a href="{{verifyUrl}}" style="background:#FF6900;color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;display:inline-block;font-weight:600;">
          Verify email address
        </a>
      </p>
      <p>Or copy and paste this link into your browser:</p>
      <p style="word-break:break-all;font-size:13px;color:#6B7280;">{{verifyUrl}}</p>
      <p style="font-size:13px;color:#6B7280;">This link expires in {{expiresIn}}. If you did not create an account, you can safely ignore this email.</p>
    `,
    "student-invite": `
      <h2>Your Musawo Training Center account is ready</h2>
      <p>Dear {{name}},</p>
      <p>The Academic Registrar has created a student account for you at Musawo Training Center.</p>
      <p>Please click the button below to confirm your details, set a password, and activate your account. This link is valid for 7 days.</p>
      <p style="margin: 24px 0;">
        <a href="{{inviteUrl}}" style="background:#0B6B5D;color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;display:inline-block;font-weight:600;">
          Activate my account
        </a>
      </p>
      <p>Or copy and paste this link: <span style="word-break:break-all;font-size:13px;color:#6B7280;">{{inviteUrl}}</span></p>
      <p>Your student number is: <strong>{{studentNumber}}</strong></p>
      <p>Course: {{courseName}}</p>
      <p>If your details are not correct, use the "These details are wrong" option on the activation page and the Registrar will be notified.</p>
      <p>If you have questions, contact us at admissions@mtc.ac.ug or call 0709 184 468.</p>
    `,
    "staff-invite": `
      <h2>You have been invited to join Musawo Training Center</h2>
      <p>Dear {{name}},</p>
      <p>You have been invited to join the Musawo Training Center platform as {{role}}.</p>
      <p style="margin: 24px 0;">
        <a href="{{inviteUrl}}" style="background:#0B6B5D;color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;display:inline-block;font-weight:600;">
          Accept invitation
        </a>
      </p>
      <p>This link expires in 7 days. If you have questions, contact info@mtc.ac.ug.</p>
    `,
    "application-confirmation": `
      <h2>Application received - Musawo Training Center</h2>
      <p>Dear {{name}},</p>
      <p>Thank you for applying to Musawo Training Center. We have received your application for:</p>
      <p><strong>{{courseName}}</strong> ({{intakeLabel}} intake)</p>
      <p>Our Academic Registrar will review your application. If you are accepted, you will receive a secure account activation link by email within 3 to 5 working days.</p>
      <p>Your application reference: <strong>{{applicationRef}}</strong></p>
      <p>If you have questions, email admissions@mtc.ac.ug or call 0709 184 468.</p>
    `,
    "application-received-registrar": `
      <h2>New application received</h2>
      <p>A new application has been submitted and is waiting for your review.</p>
      <table style="border-collapse:collapse;width:100%;margin:16px 0;">
        <tr><td style="padding:6px 0;color:#6B7280;">Name</td><td style="padding:6px 0;font-weight:600;">{{name}}</td></tr>
        <tr><td style="padding:6px 0;color:#6B7280;">Course</td><td style="padding:6px 0;">{{courseName}}</td></tr>
        <tr><td style="padding:6px 0;color:#6B7280;">Category</td><td style="padding:6px 0;">{{category}}</td></tr>
        <tr><td style="padding:6px 0;color:#6B7280;">Email</td><td style="padding:6px 0;">{{email}}</td></tr>
        <tr><td style="padding:6px 0;color:#6B7280;">Phone</td><td style="padding:6px 0;">{{phone}}</td></tr>
        <tr><td style="padding:6px 0;color:#6B7280;">Submitted</td><td style="padding:6px 0;">{{submittedAt}}</td></tr>
      </table>
      <p><a href="{{reviewUrl}}" style="background:#0B6B5D;color:#fff;padding:10px 22px;border-radius:8px;text-decoration:none;display:inline-block;font-weight:600;">Review application</a></p>
    `,
    "payment-receipt": `
      <h2>Payment received - {{courseName}}</h2>
      <p>Dear {{name}},</p>
      <p>We have received your payment of <strong>{{amount}}</strong> on {{date}}.</p>
      <p>Reference: <strong>{{paymentRef}}</strong></p>
      <p>You can now access your course. <a href="{{portalUrl}}">Go to your dashboard</a></p>
      <p>We do not provide accommodation. Contact us at info@mtc.ac.ug or 0709 184 468 if you have questions.</p>
    `,
    "class-reminder": `
      <h2>Reminder: Live class in {{timeUntil}}</h2>
      <p>Dear {{name}},</p>
      <p><strong>{{className}}</strong> starts at {{time}} on {{date}}.</p>
      <p><a href="{{joinUrl}}">Join the class</a></p>
    `,
    "exam-result": `
      <h2>Your exam result - {{examTitle}}</h2>
      <p>Dear {{name}},</p>
      <p>Your result for <strong>{{examTitle}}</strong>: <strong>{{score}}%</strong> - {{passFail}}</p>
      <p><a href="{{resultsUrl}}">View detailed results</a></p>
    `,
    "certificate-issued": `
      <h2>Your certificate is ready!</h2>
      <p>Dear {{name}},</p>
      <p>Congratulations on completing <strong>{{courseName}}</strong>!</p>
      <p>Your certificate ID is: <strong>{{certId}}</strong></p>
      <p><a href="{{downloadUrl}}">Download your certificate</a></p>
      <p><a href="{{verifyUrl}}">Verify your certificate online</a></p>
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
      <p><a href="{{approvalUrl}}" style="background:#FF6900;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;display:inline-block;font-weight:600;">Review and decide</a></p>
      <p style="font-size:12px;color:#9CA3AF;">This link expires in {{expiresIn}}. TOTP is required.</p>
    `,
    "application-accepted": `
      <h2>Your application has been accepted - {{courseName}}</h2>
      <p>Dear {{name}},</p>
      <p>We are pleased to let you know that your application for <strong>{{courseName}}</strong> has been accepted.</p>
      <p>Please click the button below to activate your student account, set a password, and confirm your place. This link is valid for {{expiresIn}}.</p>
      <p style="margin: 24px 0;">
        <a href="{{inviteUrl}}" style="background:#0B6B5D;color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;display:inline-block;font-weight:600;">
          Activate my account
        </a>
      </p>
      <p>Intake: <strong>{{intakeLabel}}</strong></p>
      <p>Course fee: <strong>{{feeUgx}}</strong></p>
      <p>If you have any questions, contact us at admissions@mtc.ac.ug or call 0709 184 468.</p>
    `,
    "application-rejected": `
      <h2>Update on your application - Musawo Training Center</h2>
      <p>Dear {{name}},</p>
      <p>Thank you for applying for <strong>{{courseName}}</strong> at Musawo Training Center.</p>
      <p>After reviewing your application, we are unable to offer you a place at this time.</p>
      <p style="background:#FEF2F2;border-left:4px solid #EF4444;padding:12px 16px;border-radius:4px;">{{reason}}</p>
      <p>You are welcome to apply again for a future intake. If you have questions, please contact us at admissions@mtc.ac.ug.</p>
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
        <img src="${LOGO_URL}" alt="Musawo Training Center" height="48" />
      </div>
      ${html}
      <hr style="margin-top: 32px; border-color: #E5E7EB;" />
      <p style="font-size: 12px; color: #6B7280;">
        Musawo Training Center - Luggala Trading Center, Lubaga Division, Kampala<br />
        <a href="mailto:info@mtc.ac.ug">info@mtc.ac.ug</a> |
        <a href="tel:+256709184468">0709 184 468</a> |
        <a href="https://wa.me/256709184468">WhatsApp</a> |
        <a href="https://mtc.ac.ug">mtc.ac.ug</a>
      </p>
    </body>
    </html>
  `;
}

export async function sendEmail(params: SendEmailParams): Promise<void> {
  const html = renderTemplate(params.template, params.variables);

  // In dev (or when no API key), store in memory for /dev/mail preview
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey || apiKey.startsWith("DEMO_") || process.env.NODE_ENV !== "production") {
    const { pushDevEmail } = await import("./dev-store");
    pushDevEmail({ to: params.to, subject: params.subject, html });
    console.log(`[dev mail] to=${params.to} subject="${params.subject}"`);
    if (!apiKey || apiKey.startsWith("DEMO_")) return; // don't attempt real send
  }

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
    // Non-fatal - log and continue
  }
}
