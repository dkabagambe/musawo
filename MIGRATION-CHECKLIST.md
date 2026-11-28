# Migration Checklist: Render → Vercel

## Pre-Migration (Complete Before Starting)

- [ ] **Read** `MIGRATION-STEP-BY-STEP.md` completely
- [ ] **Verify** you have:
  - GitHub account with musawo repo access
  - Render database credentials (in `.env` comments)
  - Internet connection
  - Terminal access

---

## Phase 1: Create New Services (20 min)

### Neon Setup
- [ ] Go to https://neon.tech and sign up
- [ ] Create a project named `musawo`
- [ ] Select region: `us-east-1`
- [ ] Create PostgreSQL database
- [ ] Copy **Pooler** connection string (not direct URL)
- [ ] Save connection string somewhere safe (you'll need it in 10 min)

**Neon URL looks like:**
```
postgresql://neon_user:xyz@ep-abc.us-east-1.neon.tech/musawo?sslmode=require
```

### Upstash Redis Setup
- [ ] Go to https://upstash.com and sign up
- [ ] Create a Redis database
- [ ] Select region: `us-east-1`
- [ ] Copy Redis URL
- [ ] Save it somewhere safe

**Upstash URL looks like:**
```
redis://default:xyz@us1-host.upstash.io:port
```

### Verify Local Tools
- [ ] Run: `which pg_dump psql openssl` (all should exist)

---

## Phase 2: Backup & Migrate Data (15 min)

### Backup Render Database
- [ ] Run: `./scripts/migrate-to-vercel.sh`
- [ ] Enter Render DATABASE_URL when prompted
- [ ] Enter Neon DATABASE_URL when prompted
- [ ] Enter Upstash REDIS_URL when prompted
- [ ] Script creates `musawo-render-backup-YYYYMMDD.sql`
- [ ] Script optionally restores to Neon
- [ ] Script generates `.env.vercel` file

**Or, manually:**
```bash
# Export backup
export RENDER_DB_URL="postgresql://mtc:WlpNxuE9NpjbDTYjaRRYAeP5fvtyWbAW@dpg-dbjm0u67bikc73fsj1fg-a.frankfurt-postgres.render.com/mtc_db_dghk"
pg_dump "$RENDER_DB_URL" --no-password > musawo-backup.sql

# Restore to Neon
export NEON_DB_URL="(your Neon URL)"
psql "$NEON_DB_URL" < musawo-backup.sql
```

### Verify Data in Neon
- [ ] Run:
  ```bash
  psql "$NEON_DB_URL" -c "SELECT COUNT(*) FROM \"User\";"
  ```
- [ ] Should show your actual user count (not 0)

---

## Phase 3: Deploy to Vercel (25 min)

### Create Vercel Account
- [ ] Go to https://vercel.com
- [ ] Sign up with GitHub
- [ ] Grant GitHub permissions

### Import Musawo Repository
- [ ] Click **"Add New" → "Project"**
- [ ] Select your GitHub account
- [ ] Find **musawo** repository
- [ ] Click **"Import"**

### Configure Environment Variables

Vercel will show **Configure Project** screen.

**Leave defaults** (Vercel auto-detects Next.js).

Then go to **Environment Variables** and add:

```
NEXTAUTH_URL=https://YOUR_VERCEL_DOMAIN.vercel.app
NEXTAUTH_SECRET=(from .env.vercel or generate: openssl rand -base64 32)
NODE_ENV=production
APP_ENV=staging
AUTH_URL=https://YOUR_VERCEL_DOMAIN.vercel.app
AUTH_SECRET=(same as NEXTAUTH_SECRET)
AUTH_TRUST_HOST=true
DATABASE_URL=(your Neon URL)
REDIS_URL=(your Upstash URL)
DATA_ENCRYPTION_KEY=(from .env.vercel)
TOTP_ENCRYPTION_KEY=(from .env.vercel)
CRON_SECRET=(from .env.vercel)
EMAIL_FROM=MTC <noreply@musawotraining.ug>
NEXT_PUBLIC_SITE_URL=https://YOUR_VERCEL_DOMAIN.vercel.app
```

**Plus, copy these from your current `.env`:**
```
PESAPAL_CONSUMER_KEY
PESAPAL_CONSUMER_SECRET
PESAPAL_IPN_ID
PESAPAL_BASE_URL=https://cybqa.pesapal.com/pesapalv3
PESAPAL_WEBHOOK_SECRET
FLUTTERWAVE_SECRET_KEY
FLUTTERWAVE_PUBLIC_KEY
FLUTTERWAVE_WEBHOOK_SECRET
S3_ENDPOINT
S3_REGION=auto
S3_BUCKET=mtc-files
S3_ACCESS_KEY_ID
S3_SECRET_ACCESS_KEY
BUNNY_STREAM_API_KEY
BUNNY_LIBRARY_ID
BUNNY_SIGNING_KEY
BUNNY_CDN_HOSTNAME=iframe.mediadelivery.net
RESEND_API_KEY
AT_API_KEY
AT_USERNAME=sandbox
AT_SENDER_ID=MUSAWO
DEMO_MODE=true
```

**Check:**
- [ ] All env vars filled (empty ones get skipped — that's OK)
- [ ] `DATABASE_URL` is Neon URL
- [ ] `REDIS_URL` is Upstash URL

### Deploy
- [ ] Click **"Deploy"**
- [ ] Vercel builds and deploys (3–5 min)
- [ ] Wait for green checkmark
- [ ] Copy the deployment URL (e.g., `https://musawo-abc123.vercel.app`)

---

## Phase 4: Test Vercel (10 min)

### Visit Your App
- [ ] Go to the Vercel URL
- [ ] Page should load (not 502 or error)

### Test Login
- [ ] Try logging in with a student account
- [ ] Should see dashboard (not error)

### Test Core Functions
- [ ] [ ] Can view courses?
- [ ] [ ] Can view enrollments?
- [ ] [ ] Can upload a file?
- [ ] [ ] Does email send? (Check inbox)
- [ ] [ ] Does payment demo work?
- [ ] [ ] Does 2FA work (if enabled)?

**If any test fails:**
1. Check Vercel logs: **Deployments → [Latest] → Logs**
2. Look for database/Redis errors
3. Check env vars are set correctly
4. Redeploy: **Deployments → Redeploy**

**If database error:**
- Verify `DATABASE_URL` is set to Neon URL
- Verify Neon database is online
- Verify data was restored (run row count query)

**If Redis error:**
- Verify `REDIS_URL` is set to Upstash URL
- Try connecting locally: `redis-cli -u "$REDIS_URL" PING`

---

## Phase 5: Point Custom Domain (If Using)

### Add Domain to Vercel
- [ ] In Vercel: **Settings → Domains**
- [ ] Click **"Add Domain"**
- [ ] Enter: `learn.musawotraining.ug`
- [ ] Vercel shows required DNS records

### Update DNS
- [ ] Go to your domain registrar (GoDaddy, Namecheap, etc.)
- [ ] Add CNAME record:
  - **Name:** `learn`
  - **Value:** `cname.vercel.com` (or what Vercel specifies)
- [ ] Save DNS changes
- [ ] Wait 1–5 min for propagation
- [ ] Test: `nslookup learn.musawotraining.ug` (should show Vercel IP)

---

## Phase 6: Final Cutover (5 min — This Causes Downtime)

**⚠️ Only do this after Phase 4 testing is complete and successful.**

### Suspend Render Service
- [ ] Go to Render dashboard
- [ ] Find **musawo-web** service
- [ ] Click **"Suspend"** (not delete — keep as backup)

This takes the old app offline.

### Final Verification
- [ ] Visit Vercel URL again → should work
- [ ] Visit custom domain → should work
- [ ] Try logging in → should work

**If broken:**
- [ ] Go back to Render, click **"Resume"** (takes 2–3 min)
- [ ] Debug the Vercel issue
- [ ] Try cutover again

---

## Phase 7: Cleanup (5 min, can wait 24–48 hours)

**Only after Vercel has been running smoothly for 24+ hours.**

### Delete Render Services
- [ ] Delete **musawo-db** PostgreSQL
- [ ] Delete **musawo-redis** cache
- [ ] Delete **musawo-keepalive** cron job
- [ ] Delete **musawo-web** web service (if not already)

### Local Cleanup
- [ ] Archive backup: `mkdir ~/backups && mv musawo-*.sql ~/backups/`
- [ ] (Optional) Delete `render.yaml` and commit

---

## Success Criteria

You're done when:

- [ ] Vercel app loads at custom domain
- [ ] Students can log in
- [ ] All core features work (courses, files, email, payments)
- [ ] No 502 or 5xx errors
- [ ] Render is suspended
- [ ] Data is safe in Neon
- [ ] No data loss occurred

---

## Support Contacts

**If something breaks:**

1. **Neon database:** https://neon.tech/docs
2. **Upstash Redis:** https://upstash.com/docs
3. **Vercel deploy issues:** Check **Deployments → Logs** in Vercel dashboard
4. **Next.js errors:** Check local build: `npm run build`

---

## Rollback (If Critical)

**To get back online quickly:**

1. Resume Render service (2–3 min)
2. Switch DNS back (if using custom domain)
3. App is back online
4. Debug and retry

---

## Questions?

Review `MIGRATION-STEP-BY-STEP.md` for detailed explanations.
