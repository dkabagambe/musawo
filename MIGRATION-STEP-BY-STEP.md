# Render → Vercel Migration: Step-by-Step Guide

**Timeline: ~1 hour active work, <5 min downtime**

---

## PHASE 1: Pre-Migration Setup (20 min)

### Step 1.1: Create Neon Account & Database

1. Go to **https://neon.tech**
2. Sign up with GitHub or email
3. Create a new project (name: `musawo`, region: US `us-east-1`)
4. After creation, go to **Connection String** tab
5. Select `Pooler` from dropdown (important for connection limits)
6. Copy the full connection string

**Looks like:**
```
postgresql://neon_user:password@ep-xyz.us-east-1.neon.tech/musawo?sslmode=require
```

**Save this somewhere safe** — you'll need it in 10 minutes.

---

### Step 1.2: Create Upstash Redis Account

1. Go to **https://upstash.com**
2. Sign up with GitHub or email
3. Create a free Redis database (region: `us-east-1`)
4. After creation, copy the **Redis URL** from the dashboard

**Looks like:**
```
redis://default:password@us1-host.upstash.io:port
```

**Save this too.**

---

### Step 1.3: Export Render Database

The Render database URL from your `.env` comments:
```
postgresql://mtc:WlpNxuE9NpjbDTYjaRRYAeP5fvtyWbAW@dpg-dbjm0u67bikc73fsj1fg-a.frankfurt-postgres.render.com/mtc_db_dghk
```

**Export the database:**

```bash
export RENDER_DB_URL="postgresql://mtc:WlpNxuE9NpjbDTYjaRRYAeP5fvtyWbAW@dpg-dbjm0u67bikc73fsj1fg-a.frankfurt-postgres.render.com/mtc_db_dghk"

pg_dump "$RENDER_DB_URL" --no-password > musawo-render-backup.sql
```

**This creates a backup file. It may take 30 seconds—1 minute depending on data size.**

Verify it worked:
```bash
ls -lh musawo-render-backup.sql
```

You should see a `.sql` file with size > 100KB (if you have data).

---

## PHASE 2: Migrate Data to Neon (10 min)

### Step 2.1: Restore to Neon

```bash
export NEON_DB_URL="postgresql://neon_user:password@ep-xyz.us-east-1.neon.tech/musawo?sslmode=require"

psql "$NEON_DB_URL" < musawo-render-backup.sql
```

**Wait 30 seconds—1 minute for the restore to complete.**

### Step 2.2: Verify Data Arrived

```bash
psql "$NEON_DB_URL" -c "SELECT COUNT(*) as user_count FROM \"User\";"
psql "$NEON_DB_URL" -c "SELECT COUNT(*) as course_count FROM \"Course\";"
psql "$NEON_DB_URL" -c "SELECT COUNT(*) as enrollment_count FROM \"Enrollment\";"
```

You should see row counts matching your Render database. If counts are 0 or the query errors, the restore failed — troubleshoot before continuing.

---

## PHASE 3: Deploy to Vercel (20 min)

### Step 3.1: Connect GitHub to Vercel

1. Go to **https://vercel.com**
2. Sign up or log in with GitHub
3. Click **"Add New..." → "Project"**
4. Select your GitHub account
5. Find and import the **musawo** repository
6. Click **"Import"**

### Step 3.2: Configure Environment Variables

Vercel will show a **Configure Project** screen.

**Leave the default settings** (Vercel auto-detects Next.js).

Then go to **Environment Variables** section and add all these:

```
NEXTAUTH_URL=https://YOUR_VERCEL_DOMAIN.vercel.app
NEXTAUTH_SECRET=(generate: openssl rand -base64 32)
NODE_ENV=production
APP_ENV=staging
AUTH_URL=https://YOUR_VERCEL_DOMAIN.vercel.app
AUTH_SECRET=(same as NEXTAUTH_SECRET)
AUTH_TRUST_HOST=true
DATABASE_URL=(your Neon URL from Step 1.1)
REDIS_URL=(your Upstash URL from Step 1.2)
DATA_ENCRYPTION_KEY=(generate: openssl rand -hex 32)
TOTP_ENCRYPTION_KEY=(generate: openssl rand -hex 32)
CRON_SECRET=(generate: openssl rand -hex 32)
EMAIL_FROM=MTC <noreply@musawotraining.ug>
NEXT_PUBLIC_SITE_URL=https://YOUR_VERCEL_DOMAIN.vercel.app
PESAPAL_CONSUMER_KEY=(copy from your .env)
PESAPAL_CONSUMER_SECRET=(copy from your .env)
PESAPAL_IPN_ID=(copy from your .env)
PESAPAL_BASE_URL=https://cybqa.pesapal.com/pesapalv3
PESAPAL_WEBHOOK_SECRET=(generate or copy)
FLUTTERWAVE_SECRET_KEY=(copy from your .env)
FLUTTERWAVE_PUBLIC_KEY=(copy from your .env)
FLUTTERWAVE_WEBHOOK_SECRET=(generate or copy)
S3_ENDPOINT=(copy from your .env)
S3_REGION=(copy from your .env)
S3_BUCKET=(copy from your .env)
S3_ACCESS_KEY_ID=(copy from your .env)
S3_SECRET_ACCESS_KEY=(copy from your .env)
BUNNY_STREAM_API_KEY=(copy from your .env)
BUNNY_LIBRARY_ID=(copy from your .env)
BUNNY_SIGNING_KEY=(copy from your .env)
BUNNY_CDN_HOSTNAME=iframe.mediadelivery.net
RESEND_API_KEY=(copy from your .env)
AT_API_KEY=(copy from your .env)
AT_USERNAME=sandbox
AT_SENDER_ID=MUSAWO
DEMO_MODE=true
```

**To generate random secrets:**
```bash
openssl rand -base64 32    # For NEXTAUTH_SECRET, AUTH_SECRET
openssl rand -hex 32       # For DATA_ENCRYPTION_KEY, TOTP_ENCRYPTION_KEY, CRON_SECRET
```

### Step 3.3: Deploy

After adding all env vars, click **"Deploy"**.

Vercel will:
1. Clone your repo
2. Install dependencies
3. Build Next.js app
4. Deploy to their CDN

**This takes 3–5 minutes.** You'll see a progress bar.

When done, you'll see a green checkmark and a URL like:
```
https://musawo.vercel.app
```

---

## PHASE 4: Test Vercel Deployment (10 min)

### Step 4.1: Visit Your App

Go to `https://your-vercel-url.vercel.app` (or the URL Vercel gave you).

### Step 4.2: Test Core Functions

- [ ] **Login** — Try logging in with a student/director account
- [ ] **View Dashboard** — Can you see courses, students, etc.?
- [ ] **Upload a File** — Test file upload (goes to S3)
- [ ] **Send Email** — Trigger a system email (check if it arrives)
- [ ] **Payment Flow** — Try the demo payment gateway (should work)
- [ ] **2FA** — If enabled, test TOTP

If any fail:
1. Check Vercel logs: **Deployments → [Latest] → Logs**
2. Look for database connection errors
3. Check env vars are set correctly

---

## PHASE 5: Point Custom Domain (If Using One)

### Step 5.1: Add Domain to Vercel

1. In Vercel: **Settings → Domains**
2. Click **"Add Domain"**
3. Enter your domain: `learn.musawotraining.ug`
4. Vercel will show DNS records to update

### Step 5.2: Update Your DNS

If your domain is managed elsewhere (GoDaddy, Namecheap, etc.):

1. Go to your domain registrar
2. Add a **CNAME record**:
   - **Name:** `learn`
   - **Value:** `cname.vercel.com` (or what Vercel tells you)

DNS propagates in 1–5 minutes. After that, `learn.musawotraining.ug` → Vercel.

---

## PHASE 6: Final Cutover (5 min — This is the Only Downtime)

### Step 6.1: Suspend Render

**WAIT until you've fully tested Vercel (Step 4).**

Then:

1. Go to **Render dashboard**
2. Find the **musawo-web** service
3. Click **"Suspend"** (not delete, in case you need to rollback)

This takes the old app offline.

### Step 6.2: Verify Everything Still Works

- Visit your Vercel domain again
- Log in
- Check a few key flows

If anything breaks, you can quickly **Resume** the Render service (1–2 min) while you debug.

---

## PHASE 7: Cleanup (5 min)

After 24–48 hours of Vercel running smoothly:

### Step 7.1: Delete Render Services

1. Go to **Render dashboard**
2. Delete the **musawo-db** database
3. Delete the **musawo-redis** cache
4. Delete the **musawo-keepalive** cron job
5. Delete the **musawo-web** service (if still suspended)

### Step 7.2: Clean Up Local Files

```bash
# Delete the backup (or archive it)
rm musawo-render-backup.sql

# Or, safer: move to archive
mkdir -p ~/backups
mv musawo-render-backup.sql ~/backups/
```

### Step 7.3: Update Code (Optional)

Delete Render-specific files from Git:

```bash
git rm render.yaml
git commit -m "Remove Render deployment config (migrated to Vercel)"
git push origin main
```

---

## Troubleshooting

### "Cannot connect to Render database" during export

**Check:**
- Is the Render service still running? (Render dashboard)
- Is the password correct? (copy exact string from .env comments)
- Do you have internet access to reach Frankfurt?

**Fix:**
```bash
psql "$RENDER_DB_URL" -c "SELECT 1;"
```

If it times out or fails, Render might be down or the credentials are wrong.

---

### "Connection refused" on Neon restore

**Check:**
- Did Neon database finish initializing? (takes ~1 min after creation)
- Is the connection string correct? (copy exact from Neon dashboard)
- Is `sslmode=require` included?

**Fix:**
```bash
psql "$NEON_DB_URL" -c "SELECT 1;"
```

If it works, the restore can proceed.

---

### Vercel deployment fails with "Build error"

**Check Vercel logs:**
1. Go to **Deployments → [Failed deployment] → Logs**
2. Scroll to the error message
3. Common causes:
   - Missing environment variable (check if all required vars are set)
   - TypeScript error (usually safe to ignore if you have `ignoreBuildErrors: true` in `next.config.mjs`)
   - Prisma generation failed (check `DATABASE_URL` is set)

**Fix:**
1. Update the missing env var in Vercel Settings
2. Redeploy: **Deployments → Redeploy** on the failed deployment

---

### "502 Bad Gateway" after deployment

**This usually means:**
- App crashed on startup
- Database connection failed
- Prisma migrations didn't run

**Check:**
1. Vercel logs for errors
2. Is `DATABASE_URL` correct and reachable from Vercel?
3. Try running migrations manually:

```bash
export DATABASE_URL="(your Neon URL)"
npx prisma migrate deploy
```

Then redeploy.

---

### Data didn't restore to Neon

**Check:**
1. Run the query again:
```bash
psql "$NEON_DB_URL" -c "SELECT COUNT(*) FROM \"User\";"
```

2. If count is 0, check the restore log:
```bash
psql "$NEON_DB_URL" < musawo-render-backup.sql 2>&1 | head -20
```

Look for SQL errors or schema mismatches.

**Fix:** 
- Neon might have a different schema. Run migrations instead:

```bash
export DATABASE_URL="(your Neon URL)"
npx prisma migrate deploy
npm run db:seed
```

This recreates the schema and seeds fresh data.

---

## Rollback Plan (If Critical Issue)

**If Vercel is broken and you need to get the app back online:**

1. **Resume Render** in Render dashboard (takes 2–3 min to restart)
2. **Switch DNS back** to Render's URL (if using custom domain)
3. App is back online
4. Debug the Vercel issue in parallel

**Data is safe** — Neon and Upstash are independent, so you can retry anytime.

---

## Success Criteria

You've completed the migration when:

- [ ] Vercel app is running and responsive
- [ ] Custom domain resolves to Vercel (if applicable)
- [ ] All student/staff data is in Neon
- [ ] Students can log in
- [ ] Courses display correctly
- [ ] File uploads work
- [ ] Emails send
- [ ] Payment demo works
- [ ] 2FA works (if enabled)
- [ ] Render is suspended/deleted
- [ ] No "502" or "5xx" errors in production

---

## Questions Before Starting?

Ask anything before executing Phase 1. Once you start, it's smooth sailing.
