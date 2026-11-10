# Email Configuration: DNS, Verification and Go-Live

**Status: NOT CONFIGURED - domain does not exist yet.**
Real sending is disabled until `RESEND_API_KEY` is set and the domain is DNS-verified.
All emails are queued in `failed_emails` (Postgres) and logged to the dev-store until then.

---

## 1. What is already built

| Component | Location | Status |
|---|---|---|
| 23 email templates (HTML) | `src/lib/email/index.ts` | BUILT |
| `sendEmail()` function | `src/lib/email/index.ts` | BUILT - queues on failure |
| Dev-mode in-memory store | `src/lib/email/dev-store.ts` | BUILT |
| `/dev/mail` preview UI | `src/app/dev/mail/` | BUILT |
| `failed_emails` DB queue | `prisma/schema.prisma` + migration `20261110090000` | BUILT |
| Retry endpoint (Admin/Principal/Director) | `src/app/api/admin/email-queue/route.ts` | BUILT |

---

## 2. Steps to enable real sending

### Step 1 - Register the domain

The domain `mtc.ac.ug` must be registered with a Ugandan registrar (or international, e.g. Namecheap).
Current status: **not registered**.

### Step 2 - Add DNS records for Resend

Once the domain is registered, sign up at [resend.com](https://resend.com), create a new domain, and add the records Resend shows (typically 3-4 records):

| Type | Host | Value | Purpose |
|---|---|---|---|
| TXT | `resend._domainkey.mtc.ac.ug` | `v=DKIM1; p=<Resend public key>` | DKIM signing |
| TXT | `mtc.ac.ug` | `v=spf1 include:spf.resend.com ~all` | SPF |
| CNAME | `em.mtc.ac.ug` | `feedback-smtp.us-east-1.amazonses.com` (or Resend equivalent) | Bounce handling |
| MX | `mtc.ac.ug` | `feedback-smtp.us-east-1.amazonses.com` | Bounce MX (optional) |

> **Note:** Resend shows exact record values in its dashboard after domain creation. Use those - the values above are illustrative.

DNS propagation: 15 minutes - 48 hours.

### Step 3 - Verify the domain in Resend

In the Resend dashboard, click **Verify** after adding the DNS records.
Resend will confirm DKIM and SPF are correct.

### Step 4 - Get the API key

In the Resend dashboard → **API Keys** → **Create API key**.
Scope: `Sending access` for `mtc.ac.ug`.

### Step 5 - Set the environment variable

In Render (production environment):

```
RESEND_API_KEY=re_<your_key>
EMAIL_FROM=Musawo Training Center <noreply@mtc.ac.ug>
```

Redeploy after setting. `sendEmail()` will now call Resend instead of queuing.

### Step 6 - Retry queued emails

After go-live, replay queued emails from `failed_emails` where `status = 'PENDING'`:

```sql
-- Check queue
SELECT id, "to", subject, attempts, "createdAt" FROM failed_emails WHERE status = 'PENDING' ORDER BY "createdAt";
```

A retry API endpoint will be added in a future section.
For now, replay manually or run a one-off script.

---

## 3. `sendEmail()` behaviour by environment

| Condition | Behaviour |
|---|---|
| `APP_ENV != production` OR `RESEND_API_KEY` missing/starts with `DEMO_` | Stored in memory (`dev-store`), printed to console, NOT sent |
| `APP_ENV=production` AND valid `RESEND_API_KEY` | Sent via Resend |
| `APP_ENV=production` AND Resend throws | Queued to `failed_emails` with `status=PENDING`, `attempts=1`, `lastError` set |

---

## 4. 23 implemented templates

| Template key | Trigger |
|---|---|
| `welcome` | Account created |
| `email-verification` | Email address verification |
| `student-invite` | Registrar creates student account |
| `staff-invite` | Staff invite link |
| `payment-receipt` | Payment confirmed |
| `class-reminder` | 24h before a live class |
| `class-recording-pending` | Recording ready to review |
| `exam-result` | Exam marked |
| `certificate-issued` | Certificate generated |
| `password-reset` | Forgot password |
| `otp` | One-time code |
| `approval-request` | Approval workflow step |
| `application-confirmation` | Applicant confirms submission |
| `application-received-registrar` | Registrar notified of application |
| `application-accepted` | Application accepted |
| `application-rejected` | Application rejected |
| `plain` | Generic plain message |
| `student-details-disputed` | Student flags wrong details |
| `support-ticket-created` | Support ticket opened |
| `support-reply` | Staff replies to ticket |
| `approval-decision` | Approval approved/rejected |
| `operational-notice` | Bulk notice to staff/students |

---

## 5. File storage (S3 / MinIO)

File storage is built at `src/lib/s3/index.ts`.

| Variable | Purpose | Dev default |
|---|---|---|
| `S3_ENDPOINT` | MinIO / R2 / S3 endpoint URL | unset → local filesystem fallback |
| `S3_REGION` | Region | `auto` |
| `S3_ACCESS_KEY_ID` | Access key | `dev` |
| `S3_SECRET_ACCESS_KEY` | Secret key | `dev` |
| `S3_BUCKET` | Bucket name | `mtc-files` |

In development, files are written to `public/uploads/` and served statically.
In production, set `S3_ENDPOINT` to a Cloudflare R2, AWS S3, or MinIO endpoint.

**Bucket creation (R2 / S3):**
1. Create bucket named `mtc-files` (or set `S3_BUCKET` to your name).
2. Set CORS to allow `PUT` from `https://learn.musawotraining.ug`.
3. Create an access key with `s3:GetObject`, `s3:PutObject`, `s3:DeleteObject`, `s3:ListBucket`.
4. Set the four `S3_*` env vars in Render and redeploy.
