# Quick Migration Reference

**Use this as a copy-paste guide.**

---

## Render Database Credentials (from your .env)

```
Render DATABASE_URL:
postgresql://mtc:WlpNxuE9NpjbDTYjaRRYAeP5fvtyWbAW@dpg-dbjm0u67bikc73fsj1fg-a.frankfurt-postgres.render.com/mtc_db_dghk
```

---

## Command 1: Export Render Database

```bash
export RENDER_DB_URL="postgresql://mtc:WlpNxuE9NpjbDTYjaRRYAeP5fvtyWbAW@dpg-dbjm0u67bikc73fsj1fg-a.frankfurt-postgres.render.com/mtc_db_dghk"

pg_dump "$RENDER_DB_URL" --no-password > musawo-backup.sql

# Shows size
ls -lh musawo-backup.sql
```

---

## Command 2: Restore to Neon

**After creating Neon account and database:**

```bash
export NEON_DB_URL="postgresql://neon_user:PASSWORD@ep-XXXXX.us-east-1.neon.tech/musawo?sslmode=require"

psql "$NEON_DB_URL" < musawo-backup.sql
```

**Replace `neon_user`, `PASSWORD`, and `ep-XXXXX` with your Neon values from the dashboard.**

---

## Command 3: Verify Data Arrived

```bash
psql "$NEON_DB_URL" -c "SELECT COUNT(*) as users FROM \"User\"; SELECT COUNT(*) as courses FROM \"Course\"; SELECT COUNT(*) as enrollments FROM \"Enrollment\";"
```

---

## Generate Secrets for Vercel

```bash
# NEXTAUTH_SECRET and AUTH_SECRET
openssl rand -base64 32

# DATA_ENCRYPTION_KEY and TOTP_ENCRYPTION_KEY and CRON_SECRET
openssl rand -hex 32
```

**Copy the output and use it in Vercel environment variables.**

---

## Vercel URLs to Remember

| Step | URL |
|------|-----|
| **Sign up** | https://vercel.com |
| **After deployment** | https://vercel.com/dashboard |
| **Environment vars** | Vercel Dashboard → Settings → Environment Variables |
| **Logs** | Vercel Dashboard → Deployments → [Latest] → Logs |

---

## Env Vars to Add in Vercel

Minimum set (replace `YOUR_VERCEL_DOMAIN` with your actual domain):

```
NEXTAUTH_URL=https://YOUR_VERCEL_DOMAIN.vercel.app
NEXTAUTH_SECRET=(secret from openssl rand -base64 32)
NODE_ENV=production
APP_ENV=staging
AUTH_URL=https://YOUR_VERCEL_DOMAIN.vercel.app
AUTH_SECRET=(same as NEXTAUTH_SECRET)
AUTH_TRUST_HOST=true
DATABASE_URL=(your Neon URL)
REDIS_URL=(your Upstash URL)
DATA_ENCRYPTION_KEY=(secret from openssl rand -hex 32)
TOTP_ENCRYPTION_KEY=(secret from openssl rand -hex 32)
CRON_SECRET=(secret from openssl rand -hex 32)
EMAIL_FROM=MTC <noreply@musawotraining.ug>
NEXT_PUBLIC_SITE_URL=https://YOUR_VERCEL_DOMAIN.vercel.app
PESAPAL_CONSUMER_KEY=(copy from your .env)
PESAPAL_CONSUMER_SECRET=(copy from your .env)
PESAPAL_IPN_ID=(copy from your .env)
PESAPAL_BASE_URL=https://cybqa.pesapal.com/pesapalv3
PESAPAL_WEBHOOK_SECRET=(copy from your .env)
FLUTTERWAVE_SECRET_KEY=(copy from your .env)
FLUTTERWAVE_PUBLIC_KEY=(copy from your .env)
FLUTTERWAVE_WEBHOOK_SECRET=(copy from your .env)
S3_ENDPOINT=(copy from your .env)
S3_REGION=auto
S3_BUCKET=mtc-files
S3_ACCESS_KEY_ID=(copy from your .env)
S3_SECRET_ACCESS_KEY=(copy from your .env)
BUNNY_STREAM_API_KEY=(copy from your .env)
BUNNY_LIBRARY_ID=(copy from your .env)
BUNNY_SIGNING_KEY=(copy from your .env)
BUNNY_CDN_HOSTNAME=iframe.mediadelivery.net
RESEND_API_KEY=re_hLMkmXF5_7wypJpHuRDMoqKta5oGQLrkT
AT_API_KEY=(copy from your .env)
AT_USERNAME=sandbox
AT_SENDER_ID=MUSAWO
DEMO_MODE=true
```

---

## Test Commands After Deploy

```bash
# Test that app started (from browser or curl)
curl https://YOUR_VERCEL_DOMAIN.vercel.app/api/health

# Test database connection (if you have access)
psql "$NEON_DB_URL" -c "SELECT COUNT(*) FROM \"User\";"

# Test Redis connection (if you have redis-cli)
redis-cli -u "$UPSTASH_REDIS_URL" PING
```

---

## Troubleshooting Quick Links

| Problem | Solution |
|---------|----------|
| "502 Bad Gateway" | Check Vercel Logs (Deployments tab) |
| "Cannot connect to DB" | Verify `DATABASE_URL` is set, check Neon online |
| "Cannot connect to Redis" | Verify `REDIS_URL` is set, check Upstash online |
| "Build error in Vercel" | Check Vercel Logs, look for missing env vars |
| "Build error: Prisma" | Verify `DATABASE_URL` is set before build |
| "Login doesn't work" | Check `AUTH_SECRET` matches `NEXTAUTH_SECRET` |
| "Emails not sending" | Verify `RESEND_API_KEY` is set |

---

## Rollback (Emergency)

If Vercel is broken and you need the app back online:

```bash
# 1. Go to Render dashboard
# 2. Find musawo-web service
# 3. Click "Resume"
# 4. Wait 2-3 min
# 5. App comes back online on old Render service
```

---

## After Success (24-48 hours later)

```bash
# Archive backup
mkdir -p ~/backups
mv musawo-*.sql ~/backups/

# (Optional) Remove Render config from Git
git rm render.yaml
git commit -m "Remove Render deployment config (migrated to Vercel)"
git push origin main

# Then delete Render services from dashboard
```

---

## Need Help?

- Full guide: `MIGRATION-STEP-BY-STEP.md`
- Checklist: `MIGRATION-CHECKLIST.md`
- Automated script: `./scripts/migrate-to-vercel.sh`
