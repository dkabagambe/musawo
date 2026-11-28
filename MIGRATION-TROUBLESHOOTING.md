# Migration Troubleshooting Guide

---

## Database Backup & Restore Issues

### "Cannot connect to Render database"

**Symptoms:**
```
psql: error: connection to server at "dpg-dbjm0u67bikc73fsj1fg-a.frankfurt-postgres.render.com" 
(X.X.X.X), port 5432 failed: connection timed out
```

**Causes:**
1. Render database is down
2. Credentials are wrong
3. Network connectivity issue

**Fix:**

```bash
# 1. Verify password is exactly correct (copy from .env)
export RENDER_DB_URL="postgresql://mtc:WlpNxuE9NpjbDTYjaRRYAeP5fvtyWbAW@dpg-dbjm0u67bikc73fsj1fg-a.frankfurt-postgres.render.com/mtc_db_dghk"

# 2. Test with simple query
psql "$RENDER_DB_URL" -c "SELECT 1;"

# 3. If timeout, check Render dashboard:
#    - Is the database service running? (green status)
#    - Is it not suspended?
```

**If Render database is down:**
- Wait 5–10 minutes (Render sometimes restarts services)
- Or, restore from your most recent manual backup
- Or, contact Render support

---

### "pg_dump: error: could not connect"

**Symptoms:**
```
pg_dump: error: could not connect to database server: connection refused
```

**Causes:**
- Render database is offline
- PostgreSQL tools not installed (`pg_dump` missing)

**Fix:**

```bash
# 1. Check pg_dump is installed
which pg_dump
# Should show: /usr/bin/pg_dump

# 2. If not installed (macOS):
brew install postgresql

# 3. If not installed (Ubuntu/Debian):
sudo apt-get install postgresql-client

# 4. Try backup again
pg_dump "$RENDER_DB_URL" > musawo-backup.sql
```

---

### "restore failed" or "ERROR: syntax error"

**Symptoms:**
```
psql: error: could not open file "musawo-backup.sql": No such file or directory
ERROR: syntax error at or near "CREATE TABLE"
```

**Causes:**
1. Backup file doesn't exist
2. Backup file is corrupted
3. Neon schema is incompatible

**Fix:**

```bash
# 1. Verify backup file exists
ls -lh musawo-backup.sql

# 2. If file is 0 bytes, backup failed:
pg_dump "$RENDER_DB_URL" --verbose > musawo-backup.sql 2>&1

# 3. Check for errors in backup log
head -50 musawo-backup.sql

# 4. If Neon restore still fails, try schema-only first:
psql "$NEON_DB_URL" < musawo-backup.sql 2>&1 | tail -20
```

**If backup is corrupted:**
- Get the previous backup from your manual exports
- Or restore schema + reseed:

```bash
export NEON_DB_URL="..."
npx prisma migrate deploy
npm run db:seed
```

---

### "No such table: User" after restore

**Symptoms:**
```
psql: error: relation "User" does not exist
```

**Causes:**
- Restore to Neon didn't complete
- Schema doesn't match

**Fix:**

```bash
# 1. Check if data is in Neon
psql "$NEON_DB_URL" -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_name IN ('User', 'Course');"

# 2. If tables don't exist, restore didn't work:
# Try again with explicit schema:
psql "$NEON_DB_URL" < musawo-backup.sql

# 3. If still fails, recreate schema via Prisma:
npx prisma migrate deploy
```

---

## Vercel Deployment Issues

### "Build failed: Cannot find module 'prisma'"

**Symptoms (from Vercel Logs):**
```
Error: Cannot find module 'prisma'
  at buildCommand: npm ci && npx prisma generate && npx next build
```

**Causes:**
- `DATABASE_URL` not set during build
- Dependencies not installed

**Fix:**

1. Check Vercel environment variables:
   - Go to **Settings → Environment Variables**
   - Verify `DATABASE_URL` is set (not empty)
   - Verify `DATABASE_URL` is a valid PostgreSQL URL

2. Redeploy:
   - Go to **Deployments**
   - Click the failed deployment
   - Click **"Redeploy"**

3. Check build output:
   - **Deployments → [Failed] → Logs**
   - Look for the exact error

---

### "502 Bad Gateway"

**Symptoms:**
- App loads but shows "502 Bad Gateway"
- Or shows the Vercel error page

**Causes:**
1. App crashed on startup
2. Database connection failed
3. Missing environment variables
4. Prisma migrations didn't run

**Fix:**

**Step 1: Check Vercel logs**

```bash
# In Vercel dashboard:
# Deployments → [Current deployment] → Logs
# Look for error messages like:
# - "ECONNREFUSED" (database down)
# - "undefined is not a function" (env var missing)
# - "PrismaClientInitializationError" (Prisma config issue)
```

**Step 2: Verify environment variables**

```bash
# In Vercel dashboard Settings → Environment Variables:
# - DATABASE_URL is set (not empty, not "undefined")
# - REDIS_URL is set
# - NODE_ENV=production
# - AUTH_SECRET and NEXTAUTH_SECRET are present and identical
```

**Step 3: Check database connection**

```bash
# Locally, test Neon connection:
export DATABASE_URL="(your Neon URL)"
psql "$DATABASE_URL" -c "SELECT 1;"

# If this works locally but Vercel fails:
# Neon might have IP restrictions
```

**Step 4: Redeploy**

- Click **"Redeploy"** on your failed deployment
- Wait 3–5 minutes

**Step 5: Check app startup locally**

```bash
# Locally, build and test:
npm ci
npx prisma generate
npm run build
npm start
# Try accessing http://localhost:3000
```

---

### "Build error: unexpected token"

**Symptoms:**
```
Build failed: Unexpected token 'export' in tsconfig.json
```

**Causes:**
- TypeScript configuration issue
- Node version mismatch

**Fix:**

```bash
# Locally, verify build works:
npm run build

# If it fails locally, fix it first
# Then redeploy to Vercel
```

---

### "Logs show: Unauthorized" or "403 Forbidden"

**Symptoms:**
```
Vercel Functions: Unauthorized to access (403)
```

**Causes:**
- Authentication middleware blocked the request
- `NEXT_PUBLIC_SITE_URL` incorrect

**Fix:**

1. Check environment variables:
   - `NEXTAUTH_URL` should match your Vercel domain
   - `AUTH_URL` should match your Vercel domain
   - `NEXT_PUBLIC_SITE_URL` should match your Vercel domain

2. If using custom domain:
   - `NEXTAUTH_URL` should be `https://learn.musawotraining.ug`
   - `AUTH_URL` should be `https://learn.musawotraining.ug`

3. Redeploy after fixing

---

## Runtime Issues (After Deployment)

### "Cannot GET /api/health" or 404 errors

**Symptoms:**
- API endpoints return 404
- `/api/health` doesn't respond

**Causes:**
- App deployed but routes not working
- Vercel function timeout

**Fix:**

```bash
# 1. Check if app is responding at all
curl https://your-vercel-domain.vercel.app/

# 2. If main page loads but /api/* fails:
# Check if you're calling the right endpoint
# (Some endpoints require POST, not GET)

# 3. Check Vercel Functions are built:
# In .next/server/ should exist
```

---

### "Cannot read property 'env' of undefined"

**Symptoms:**
```
TypeError: Cannot read property 'env' of undefined
  at Object.<anonymous> (/var/task/.next/server/pages/api/...)
```

**Causes:**
- Environment variable is not set during runtime
- Variable name typo

**Fix:**

1. Check Vercel environment variables for the missing var
2. Add it if missing
3. Redeploy

---

### "ECONNREFUSED" or "Connection refused" in logs

**Symptoms:**
```
Error: connect ECONNREFUSED 127.0.0.1:6379
```

**Causes:**
- Redis (Upstash) URL not set
- Redis URL is incorrect
- Upstash database is down

**Fix:**

```bash
# 1. Verify REDIS_URL in Vercel environment variables
#    Should look like: redis://default:password@host:port

# 2. Test locally:
redis-cli -u "redis://default:password@host:port" PING

# 3. Check Upstash dashboard:
#    Is the database online and not suspended?

# 4. If URL is wrong, update and redeploy
```

---

### "Cannot connect to database"

**Symptoms:**
```
Error: connect ETIMEDOUT
Prisma error: PrismaClientInitializationError
```

**Causes:**
1. Neon database is down
2. `DATABASE_URL` is incorrect
3. Connection pool exhausted

**Fix:**

```bash
# 1. Test Neon connection locally
psql "postgresql://user:pass@ep-xyz.us-east-1.neon.tech/musawo?sslmode=require" -c "SELECT 1;"

# 2. Check Vercel environment variables
#    DATABASE_URL should be your Neon **Pooler** URL (not direct URL)

# 3. Check Neon dashboard
#    Is the database online?

# 4. If using direct URL instead of pooler:
#    - Go to Neon dashboard
#    - Connection String tab
#    - Select "Pooler" from dropdown
#    - Copy that URL
#    - Update DATABASE_URL in Vercel
#    - Redeploy
```

---

### "Login not working" or "Session invalid"

**Symptoms:**
- Login page loads
- After entering credentials, page redirects to login again
- Session doesn't persist

**Causes:**
1. `AUTH_SECRET` and `NEXTAUTH_SECRET` don't match
2. `AUTH_URL` incorrect
3. Cookies not being set

**Fix:**

```bash
# 1. Generate a new secret and update BOTH:
openssl rand -base64 32
# Copy output

# 2. In Vercel environment variables:
#    Set both NEXTAUTH_SECRET and AUTH_SECRET to this same value

# 3. Verify AUTH_URL and NEXTAUTH_URL:
#    Both should be: https://your-vercel-domain.vercel.app
#    (or https://learn.musawotraining.ug if using custom domain)

# 4. Redeploy
```

---

### "Email not sending"

**Symptoms:**
- Emails are not arriving
- Or error: "Resend API key invalid"

**Causes:**
1. `RESEND_API_KEY` not set
2. `RESEND_API_KEY` is incorrect
3. Email address is invalid

**Fix:**

```bash
# 1. Check RESEND_API_KEY in Vercel:
#    Should start with "re_"

# 2. Verify EMAIL_FROM is set:
#    Should be: MTC <noreply@musawotraining.ug>

# 3. Check Resend dashboard for API quota
#    Free tier allows limited sends per day

# 4. Redeploy after any changes
```

---

### "Payment gateway not working"

**Symptoms:**
- Payment demo returns error
- Or: "Invalid consumer key"

**Causes:**
1. Payment API keys not set
2. `APP_ENV` is not `staging` for sandbox
3. Payment service is down

**Fix:**

```bash
# 1. Check in Vercel environment variables:
#    - PESAPAL_CONSUMER_KEY
#    - PESAPAL_CONSUMER_SECRET
#    - PESAPAL_IPN_ID
#    - APP_ENV=staging (for sandbox)

# 2. Verify PESAPAL_BASE_URL for sandbox:
#    Should be: https://cybqa.pesapal.com/pesapalv3

# 3. Check Pesapal/Flutterwave dashboards:
#    Are the services online?

# 4. Redeploy after fixing
```

---

### "Cold start taking too long"

**Symptoms:**
- First request takes 10+ seconds
- Or timeout error

**Causes:**
- Vercel cold start is slow (normal)
- Prisma migrations running on each boot
- Large dependencies

**Fix:**

```bash
# 1. This is usually normal
#    Vercel free tier cold starts take 5–10 seconds

# 2. If consistently timing out:
#    Check Vercel logs for slow operations

# 3. Reduce startup time by:
#    - Skipping DB migrations if already applied
#    - Using Neon's pooler (reduces connection overhead)
#    - Reducing bundle size (remove unused packages)

# 4. Environment variable to skip migrations:
#    SKIP_DB_MIGRATE=1
```

---

## DNS & Domain Issues

### "Custom domain not working" or "NXDOMAIN"

**Symptoms:**
- `learn.musawotraining.ug` doesn't resolve
- Or resolves to wrong server

**Causes:**
1. DNS not updated yet
2. CNAME record pointing to wrong target
3. DNS cache not refreshed

**Fix:**

```bash
# 1. Check DNS propagation
nslookup learn.musawotraining.ug

# 2. Should show Vercel's IP
#    If not, check your domain registrar

# 3. Update DNS record:
#    - Name: learn
#    - Type: CNAME
#    - Value: cname.vercel.com (or what Vercel specifies)

# 4. Wait 1–5 minutes for propagation
#    Then test again:
nslookup learn.musawotraining.ug

# 5. If still not working, check with dig:
dig learn.musawotraining.ug
```

---

## Critical Checks Before Going Live

| Check | Command | Expected |
|-------|---------|----------|
| **Neon connected** | `psql "$NEON_DB_URL" -c "SELECT 1;"` | No error |
| **Data in Neon** | `psql "$NEON_DB_URL" -c "SELECT COUNT(*) FROM \"User\";"` | > 0 |
| **Upstash connected** | `redis-cli -u "$UPSTASH_REDIS_URL" PING` | PONG |
| **Vercel app loads** | `curl https://your-vercel.app/` | 200 OK (not 502) |
| **Login works** | Browser: try login | No redirect loop |
| **Env vars set** | Vercel Settings → Env Vars | All required vars present |
| **Custom domain** | `nslookup your-domain` | Shows Vercel IP |

---

## Emergency: Rollback to Render

**If Vercel is completely broken:**

```bash
# 1. Go to Render dashboard
# 2. Find musawo-web service
# 3. Click "Resume"
# 4. Wait 2–3 minutes

# App comes back online on Render
# Then debug Vercel issue in parallel
```

---

## Getting Help

1. **Vercel logs:** Always check first (Deployments tab)
2. **Prisma errors:** Check database connection
3. **Redis errors:** Check Upstash connection
4. **Build errors:** Try building locally first
5. **DNS errors:** Use `nslookup` or `dig` to verify
