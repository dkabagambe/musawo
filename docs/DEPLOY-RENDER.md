# Deploying to Render

This document covers deploying Musawo Training Center to Render as a hosted staging demo.
Production security is preserved at all times.

---

## Quick start

1. Push this repository to GitHub (or GitLab).
2. In the Render dashboard, click **New** > **Blueprint** and point it at your repo.
   Render reads `render.yaml` and creates three resources automatically:
   - `musawo-web` (Node web service)
   - `musawo-db` (PostgreSQL)
   - `musawo-redis` (Key Value / Redis)
3. Set the secrets listed in the **Secrets** section below.
4. Click **Apply**. The first deploy runs the build, migrates the database, and starts the server.
5. After the first successful deploy, seed demo data:
   ```bash
   APP_ENV=staging DATABASE_URL="<from Render dashboard>" npm run seed:remote
   ```
6. Open the URL Render assigns (e.g. `https://musawo-web.onrender.com`) and log in via `/dev/login`.

---

## Build and start commands

Set these **exactly** in the Render dashboard (Settings tab for the web service):

| Step | Command |
|---|---|
| Build | `npm ci && npx prisma generate && SKIP_DB_MIGRATE=1 npx next build` |
| Start | `npx prisma migrate resolve --rolled-back 20261102110000_section11_concurrency_indexes; npx prisma migrate deploy; npm start` |
| Health check | `GET /api/health` (returns 200 when DB is reachable) |

**Why the resolve line?** Migration `20261102110000_section11_concurrency_indexes` used
`CREATE INDEX CONCURRENTLY` which PostgreSQL forbids inside a transaction. Prisma wraps
migrations in transactions, so the migration failed and was marked as failed in the DB.
The `--rolled-back` resolve tells Prisma to forget the failed attempt so `migrate deploy`
can re-run the corrected version (which uses plain `CREATE INDEX IF NOT EXISTS`).
The resolve command is idempotent - once the migration succeeds it does nothing on
subsequent deploys.

**Why SKIP_DB_MIGRATE in the build?** The build worker on Render does not have a database
connection. Running `prisma migrate deploy` at build time always fails and was blocking
the build. Migrations now run at container start time (start command) when the DB is
available.
| Start | `npx prisma migrate deploy && npm start` |
| Health check | `GET /api/health` (returns 200 when DB is reachable) |

The health check path is `/api/health`. Render polls it every 30 s.

---

## Environment variables

All variables are set in the Render dashboard under the service's **Environment** tab.
Never commit secrets to the repository.

### Required (must be set manually)

| Variable | Description |
|---|---|
| `AUTH_SECRET` | Random 32-byte secret for JWT signing. Generate: `openssl rand -base64 32`. Render can auto-generate this. |
| `DATA_ENCRYPTION_KEY` | Random 32-byte key for encrypting personal data fields. Auto-generate in Render. |
| `CRON_SECRET` | Random secret used by scheduled job webhooks. Auto-generate. |

### Set automatically by Render Blueprint

| Variable | Source |
|---|---|
| `DATABASE_URL` | Injected from `musawo-db` connection string |
| `REDIS_URL` | Injected from `musawo-redis` connection string |
| `AUTH_URL` | Set to the service's external URL (e.g. `https://musawo-web.onrender.com`) |
| `AUTH_TRUST_HOST` | `"true"` - required behind Render's proxy |
| `NODE_ENV` | `production` (Next.js build optimisation) |
| `APP_ENV` | `staging` (enables /dev/login, demo payments, noindex; set to `production` when going live) |
| `DEMO_MODE` | `"true"` |

### Optional - set in dashboard when available

| Variable | Description | Default when missing |
|---|---|---|
| `RESEND_API_KEY` | Transactional email (Resend.com) | Emails logged to console |
| `EMAIL_FROM` | Sender address | `Musawo Training Center <noreply@musawotraining.ug>` |
| `AT_API_KEY` | SMS via Africa's Talking | SMS logged to console |
| `AT_USERNAME` | Africa's Talking username | `sandbox` |
| `AT_SENDER_ID` | SMS sender ID | `MUSAWO` |
| `PESAPAL_CONSUMER_KEY` | Pesapal payment key | Demo gateway used |
| `PESAPAL_CONSUMER_SECRET` | Pesapal secret | Demo gateway used |
| `PESAPAL_IPN_ID` | Pesapal IPN identifier | Demo gateway used |
| `PESAPAL_BASE_URL` | `https://cybqa.pesapal.com/pesapalv3` (sandbox) | Demo gateway |
| `PESAPAL_WEBHOOK_SECRET` | Webhook signature secret | Auto-generated |
| `FLUTTERWAVE_SECRET_KEY` | Flutterwave secret | Demo gateway used |
| `FLUTTERWAVE_PUBLIC_KEY` | Flutterwave public key | Demo gateway used |
| `FLUTTERWAVE_WEBHOOK_SECRET` | Webhook signature secret | Auto-generated |
| `S3_ENDPOINT` | S3-compatible storage URL | Uploads disabled in demo |
| `S3_REGION` | S3 region | `auto` |
| `S3_BUCKET` | S3 bucket name | `mtc-files` |
| `S3_ACCESS_KEY_ID` | S3 access key | Uploads disabled |
| `S3_SECRET_ACCESS_KEY` | S3 secret key | Uploads disabled |
| `BUNNY_STREAM_API_KEY` | Bunny Stream API key | Video disabled |
| `BUNNY_LIBRARY_ID` | Bunny Stream library ID | Video disabled |
| `BUNNY_SIGNING_KEY` | Bunny signed URL key | Video disabled |
| `BUNNY_CDN_HOSTNAME` | Bunny CDN hostname | `iframe.mediadelivery.net` |

### Demo gate (HTTP Basic Auth)

Set both to enable a site-wide password gate. Leave both unset to disable it.
Useful when you want a private staging link.

| Variable | Description |
|---|---|
| `DEMO_GATE_USER` | Basic Auth username |
| `DEMO_GATE_PASSWORD` | Basic Auth password |

The gate always bypasses `/api/health` and `/api/webhooks`.

---

## APP_ENV vs NODE_ENV

| Variable | Purpose |
|---|---|
| `NODE_ENV=production` | Next.js build and runtime mode (always production on Render) |
| `APP_ENV=staging` | MTC application environment: controls demo features, banners, noindex |

`APP_ENV` options:

| Value | Effect |
|---|---|
| `development` | Demo features on, email/SMS to console, noindex headers, /dev/login visible |
| `staging` | Same as development - use this on Render for a hosted demo |
| `production` | Demo features blocked (loud error), real email/payments, robots.txt allows indexing |

**Never enable demo features (`/dev/login`, demo payments) when `APP_ENV=production`.**

---

## Demo banner

When `APP_ENV` is not `production`, a yellow "Staging demo" or "Development" banner
appears at the top of every page. It links to `/dev/login`.

---

## noindex

When `APP_ENV` is not `production`:
- Every page response includes `X-Robots-Tag: noindex, nofollow`
- `robots.txt` disallows all crawlers

---

## Seeding demo data

Run this once after the first deploy, from your local machine with the Render DATABASE_URL:

```bash
APP_ENV=staging DATABASE_URL="postgresql://..." npm run seed:remote
```

The script will refuse to run unless `APP_ENV=staging`.

To get the DATABASE_URL: Render dashboard > `musawo-db` > **Connection** > **External Database URL**.

---

## Custom domain

1. Add your domain in Render dashboard > `musawo-web` > **Custom Domains**.
2. Update `AUTH_URL` to `https://learn.musawotraining.ug` (or your domain).
3. Redeploy.

---

## Going to production

When you are ready for real users:

1. Set `APP_ENV=production` in the dashboard.
2. Set real values for `RESEND_API_KEY`, `AT_API_KEY`, `PESAPAL_*`, `FLUTTERWAVE_*`, `S3_*`.
3. Change `PESAPAL_BASE_URL` to `https://pay.pesapal.com/v3` (live endpoint).
4. Remove `DEMO_GATE_USER` / `DEMO_GATE_PASSWORD` (or keep for internal access).
5. Upgrade the Render plan if needed (the starter plan puts services to sleep after inactivity).

---

## Troubleshooting

| Symptom | Fix |
|---|---|
| Build fails at `prisma generate` | Ensure `@prisma/client` is in `dependencies`, not `devDependencies` |
| 401 on every page | `DEMO_GATE_USER` / `DEMO_GATE_PASSWORD` are set but you haven't entered credentials |
| Auth redirect loops | Check `AUTH_URL` matches your deployed URL exactly. Check `AUTH_TRUST_HOST=true`. |
| Health check fails | DB is not ready. Check `DATABASE_URL` is injected from the Render database resource. |
| Redis errors in logs | Non-fatal. The app degrades gracefully. Ensure `REDIS_URL` is injected from `musawo-redis`. |
