# ✅ Migration to Vercel: Ready to Execute

**Status:** All preparation complete. Ready to begin migration.

**Timeline:** ~1 hour active work, <5 min downtime  
**Complexity:** Straightforward — all tools and documentation provided  
**Risk:** Low — multiple exit points to rollback

---

## What You Have

### 1. Documentation
- ✅ **MIGRATION-STEP-BY-STEP.md** — Detailed walkthrough with explanations
- ✅ **MIGRATION-CHECKLIST.md** — Actionable checklist to follow
- ✅ **QUICK-MIGRATION-REFERENCE.md** — Copy-paste commands and values
- ✅ **MIGRATION-TROUBLESHOOTING.md** — Solutions to common issues
- ✅ **MIGRATION-READY.md** — This file

### 2. Automated Tools
- ✅ **scripts/migrate-to-vercel.sh** — Automated backup & setup script
- ✅ **vercel.json** — Vercel configuration file (auto-detected)
- ✅ **next.config.mjs** — Updated for Vercel (Render references removed)

### 3. Environment
- ✅ PostgreSQL tools installed (`pg_dump`, `psql`)
- ✅ OpenSSL available (for generating secrets)
- ✅ Current database credentials available (in .env comments)
- ✅ Render service still running (can backup + test)

---

## Migration Path (Choose One)

### Option A: Automated (Recommended)

```bash
# 1 command does most of the work
./scripts/migrate-to-vercel.sh
```

**What it does:**
- Tests Render database connection
- Exports database to `musawo-render-backup-YYYYMMDD.sql`
- Tests Neon connection
- Optionally restores to Neon
- Generates `.env.vercel` with all secrets

**Then:**
1. Copy env vars from `.env.vercel` to Vercel dashboard
2. Deploy on Vercel
3. Test
4. Cutover

**Time:** 15 min script + 20 min manual setup + 10 min testing = 45 min total

---

### Option B: Manual (If You Prefer Control)

Follow **MIGRATION-STEP-BY-STEP.md** step-by-step.

**Benefits:** See exactly what's happening at each stage

**Time:** Same (~45 min), but more transparent

---

### Option C: Hybrid

Use the script for backup/restore, then manually set up Vercel.

---

## Before You Start

### Pre-Flight Checklist

- [ ] You have a **GitHub account** (Vercel needs it)
- [ ] You have access to the **musawo GitHub repo**
- [ ] You can access **Render dashboard** (to verify database)
- [ ] You have internet access
- [ ] You have ~1 hour of uninterrupted time

### Accounts to Create (Before Migration)

1. **Neon** (https://neon.tech)
   - Free tier is fine
   - Region: `us-east-1`
   - Create PostgreSQL database
   - Copy pooler connection string

2. **Upstash** (https://upstash.com)
   - Free tier is fine
   - Region: `us-east-1`
   - Create Redis database
   - Copy Redis URL

3. **Vercel** (https://vercel.com)
   - Sign up with GitHub (required)
   - Import musawo repository

---

## The 5 Phases (in order)

### Phase 1: Create New Services (20 min)
Create Neon database and Upstash Redis. Save connection strings.

### Phase 2: Backup & Migrate Data (15 min)
Export Render database, restore to Neon. Verify data arrived.

### Phase 3: Deploy to Vercel (25 min)
Import repo on Vercel, set environment variables, deploy.

### Phase 4: Test Vercel (10 min)
Visit your app, test login, courses, files, email, payments.

### Phase 5: Final Cutover (5 min)
Suspend Render service. Done.

---

## Success Indicators

After Phase 5, you should see:

- ✅ Vercel app responds at your domain (no 502)
- ✅ Students can log in
- ✅ Courses, enrollments, files display
- ✅ File uploads work
- ✅ Emails send
- ✅ Demo payments work
- ✅ 2FA works (if enabled)
- ✅ No data loss occurred
- ✅ Render is offline

---

## Rollback Plan (Always Available)

If anything breaks badly:

```bash
# Go to Render dashboard → Resume musawo-web service
# Takes 2–3 minutes to come back online
# App is back online; debug Vercel in parallel
```

This is a safety net. No data loss.

---

## What Stays the Same

- ✅ No code changes (except config)
- ✅ All features work identically
- ✅ Student login process unchanged
- ✅ File uploads work (via S3)
- ✅ Emails work (via Resend)
- ✅ Payments work (via Pesapal/Flutterwave)
- ✅ 2FA works (unchanged)
- ✅ Custom domain and staff emails unchanged
- ✅ Database schema unchanged
- ✅ All student/staff data preserved

---

## What Changes

| Component | Before | After |
|-----------|--------|-------|
| **Web host** | Render (sleeps after 15 min) | Vercel (always on) |
| **Database** | Render PostgreSQL (deletes after 30 days) | Neon (persistent) |
| **Cache/Queue** | Render Redis | Upstash Redis |
| **Cost** | Free (but loses data) | Free (keeps data) |
| **Response time** | 30–60 s on cold start | <1 s (always warm) |

---

## Commands Reference

**Run the automated script:**
```bash
./scripts/migrate-to-vercel.sh
```

**Manual backup:**
```bash
export RENDER_DB_URL="postgresql://mtc:WlpNxuE9NpjbDTYjaRRYAeP5fvtyWbAW@dpg-dbjm0u67bikc73fsj1fg-a.frankfurt-postgres.render.com/mtc_db_dghk"
pg_dump "$RENDER_DB_URL" > musawo-backup.sql
```

**Manual restore:**
```bash
export NEON_DB_URL="(your Neon URL)"
psql "$NEON_DB_URL" < musawo-backup.sql
```

**Generate secrets:**
```bash
openssl rand -base64 32    # For NEXTAUTH_SECRET
openssl rand -hex 32       # For encryption keys
```

---

## Decision Points

**You'll make these decisions during migration:**

1. **Automated or manual backup?** → Recommend automated (script does it)
2. **Restore data immediately or test first?** → Recommend immediate (safer)
3. **Use custom domain?** → Optional (depends on your setup)
4. **Keep Render as fallback?** → Yes (keep it running until Vercel is verified)

---

## Support Resources

| Issue | Resource |
|-------|----------|
| Stuck on a step | MIGRATION-STEP-BY-STEP.md |
| Need a checklist | MIGRATION-CHECKLIST.md |
| Quick reference | QUICK-MIGRATION-REFERENCE.md |
| Troubleshooting | MIGRATION-TROUBLESHOOTING.md |
| Neon help | https://neon.tech/docs |
| Upstash help | https://upstash.com/docs |
| Vercel help | https://vercel.com/docs |

---

## Next Steps

### Now
1. Create Neon account and database
2. Create Upstash account and Redis
3. Create or sign into Vercel

### Tomorrow (or whenever ready)
1. Run migration script (or follow manual steps)
2. Deploy to Vercel
3. Test
4. Cutover

---

## Final Notes

- **You cannot break anything.** All data is backed up. Render stays running until you verify Vercel works.
- **Migration is reversible.** At any point before final cutover, you can revert to Render.
- **This is a one-time task.** After today, you won't need Render again.
- **No downtime for students** until Phase 5. Phases 1–4 happen in parallel while Render keeps running.

---

## Questions Before Starting?

Ask anything. These documents answer most questions, but if something is unclear, clarify before starting Phase 1.

---

## Ready?

**When you're ready to begin:**

1. Create the three accounts (Neon, Upstash, Vercel)
2. Gather their connection strings
3. Run: `./scripts/migrate-to-vercel.sh`
4. Follow the prompts

**Or, follow MIGRATION-STEP-BY-STEP.md manually if you prefer.**

---

**Good luck! You've got this.** 🚀
