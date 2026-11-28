# 🚀 START HERE: Render → Vercel Migration

**Everything you need to migrate is ready.**

---

## What You Need to Know (60 seconds)

**Current Problem:**
- Render database deletes after 30 days → data loss risk
- Render web service sleeps after 15 min → students wait 30–60s for page to load
- Expensive to fix with paid tier

**Solution:**
- Vercel for web hosting (no sleep, free, built for Next.js)
- Neon for database (persistent, free, 3 GB)
- Upstash for Redis (free, 10 GB monthly)

**Result:**
- Same app, same features, same everything
- Just faster, always online, never loses data
- Zero cost

**Time:** ~1 hour active work, <5 min downtime

---

## 3 Ways to Migrate

### 🤖 Automated (Easiest)
```bash
./scripts/migrate-to-vercel.sh
```
**Does:** Backup, restore, generate secrets  
**Time:** 15 min

### 📋 Checklist (Step-by-Step)
Read: `MIGRATION-CHECKLIST.md`  
**Does:** Guides you through each step  
**Time:** 50 min

### 📖 Detailed Guide (Full Transparency)
Read: `MIGRATION-STEP-BY-STEP.md`  
**Does:** Explains everything in detail  
**Time:** 50 min + learning

---

## Which Should I Choose?

| You Should Use... | If You Want... |
|-------------------|---|
| **Automated Script** | Speed + simplicity |
| **Checklist** | Structure + ease |
| **Detailed Guide** | Full understanding |

**Recommendation:** Start with **MIGRATION-READY.md** (5 min read), then use the **automated script** (15 min).

---

## Before Starting (Create These Accounts First)

### 1. Neon Database
- Go: https://neon.tech
- Sign up (free)
- Create PostgreSQL database
- Region: `us-east-1`
- Copy pooler connection string

### 2. Upstash Redis
- Go: https://upstash.com
- Sign up (free)
- Create Redis database
- Region: `us-east-1`
- Copy Redis URL

### 3. Vercel
- Go: https://vercel.com
- Sign up with GitHub
- (Don't import repo yet)

**Time needed:** ~15 min to create all 3 accounts

---

## The 5-Phase Migration (Once Accounts Are Ready)

```
Phase 1: Create Services (20 min)
├─ Neon: PostgreSQL database ✓ Already created above
├─ Upstash: Redis database ✓ Already created above
└─ Vercel: Connected to GitHub ✓ Already created above

Phase 2: Backup & Restore (15 min)
├─ Export Render database → backup file
├─ Restore to Neon → verify data arrived
└─ Done

Phase 3: Deploy to Vercel (25 min)
├─ Import musawo repo on Vercel
├─ Set environment variables
├─ Deploy
└─ Done

Phase 4: Test (10 min)
├─ Visit your app
├─ Log in, test features
└─ Verify everything works

Phase 5: Cutover (5 min — ONLY DOWNTIME)
├─ Suspend Render service
├─ App now on Vercel
└─ Done

Total Active Time: ~1 hour
Downtime: <5 minutes (Phase 5 only)
```

---

## Your Render Database Credentials

```
postgresql://mtc:WlpNxuE9NpjbDTYjaRRYAeP5fvtyWbAW@dpg-dbjm0u67bikc73fsj1fg-a.frankfurt-postgres.render.com/mtc_db_dghk
```

(You'll need this in Phase 2 to export the backup)

---

## Run the Migration

### Step 1: Create the 3 Accounts (15 min)

**Neon:**
1. Go https://neon.tech → Sign up
2. Create project "musawo"
3. Create PostgreSQL database
4. Go to Connection String tab
5. Select "Pooler" (important!)
6. Copy the URL
7. Save it somewhere safe

**Upstash:**
1. Go https://upstash.com → Sign up
2. Create Redis database
3. Copy Redis URL
4. Save it somewhere safe

**Vercel:**
1. Go https://vercel.com → Sign up with GitHub
2. Done (don't import repo yet)

### Step 2: Run the Automated Script (15 min)

```bash
cd /home/daniel/websites/musawo

./scripts/migrate-to-vercel.sh
```

**Follow the prompts:**
1. Paste Render DATABASE_URL (from above)
2. Paste Neon DATABASE_URL (from step 1)
3. Paste Upstash REDIS_URL (from step 1)
4. Answer: "Restore to Neon now?" → **yes**

**Output:**
- File: `musawo-render-backup-YYYYMMDD.sql` (your backup)
- File: `.env.vercel` (env vars for Vercel)

### Step 3: Deploy to Vercel (25 min)

1. Go to https://vercel.com/dashboard
2. Click "Add New" → "Project"
3. Import your musawo GitHub repo
4. Go to Settings → Environment Variables
5. Copy **all** vars from `.env.vercel` into Vercel dashboard
6. Click Deploy

**Wait 3–5 minutes** for build to complete.

### Step 4: Test (10 min)

1. Visit your Vercel URL
2. Log in
3. Test: courses, files, email, payments
4. All should work ✓

### Step 5: Final Cutover (5 min)

1. Go to Render dashboard
2. Find musawo-web service
3. Click "Suspend"

**Done!** Your app is now on Vercel. 🎉

---

## If Something Breaks

### "I need help debugging"
→ Read `MIGRATION-TROUBLESHOOTING.md`

### "What was that command again?"
→ Read `QUICK-MIGRATION-REFERENCE.md`

### "I want step-by-step guidance"
→ Read `MIGRATION-STEP-BY-STEP.md`

### "Show me a checklist"
→ Read `MIGRATION-CHECKLIST.md`

### "I want all the details"
→ Read `MIGRATION-READY.md`

### "Everything is broken, bring back Render"
→ Go to Render dashboard, click Resume on musawo-web
→ App comes back online in 2–3 min
→ Debug Vercel in parallel

---

## What You Get in This Folder

```
📄 MIGRATION-START-HERE.md
   ↓ You are here

📄 MIGRATION-READY.md
   ↓ Read this first (5 min overview + pre-flight checklist)

📄 MIGRATION-STEP-BY-STEP.md
   ↓ Detailed walkthrough with explanations

📄 MIGRATION-CHECKLIST.md
   ↓ Actionable checklist to follow

📄 QUICK-MIGRATION-REFERENCE.md
   ↓ Copy-paste commands and values

📄 MIGRATION-TROUBLESHOOTING.md
   ↓ Solutions to common issues

🔧 scripts/migrate-to-vercel.sh
   ↓ Automated backup + restore + secrets

⚙️  vercel.json
   ↓ Vercel config (auto-read by Vercel)

✅ next.config.mjs (updated)
   ↓ Ready for Vercel (Render references removed)
```

---

## Decision: When Should You Start?

### **Start Now If:**
- You've created all 3 accounts (Neon, Upstash, Vercel)
- You have 1 hour of uninterrupted time
- You want this done today

### **Start Later If:**
- You need to set up accounts first (~15 min)
- You want time to read the full guide first
- You want to schedule it for tomorrow

**Recommendation:** Create the 3 accounts now (15 min), then run the migration whenever you're ready (1 hour). No rush.

---

## Command to Start (Once Accounts Are Ready)

```bash
./scripts/migrate-to-vercel.sh
```

Then follow the prompts.

---

## Questions?

Before you start, any questions?

- **"How long does this really take?"** → 1 hour active work, <5 min downtime
- **"Can I break anything?"** → No, everything is backed up and reversible
- **"What if something fails?"** → Resume Render, debug, try again. Data is safe.
- **"Do I need to change code?"** → No, app works exactly the same
- **"Will students notice?"** → No, unless you tell them (they just experience faster loading)
- **"Is this permanent?"** → Yes, you're off Render forever

---

## Next Step

👉 **Read `MIGRATION-READY.md`** (5-minute overview)

Then:

👉 **Create the 3 accounts** (Neon, Upstash, Vercel) — 15 minutes

Then:

👉 **Run `./scripts/migrate-to-vercel.sh`** — 15 minutes

Then:

👉 **Deploy on Vercel dashboard** — 25 minutes

Then:

👉 **Test everything** — 10 minutes

Done! 🎉

---

**Let's go!** 🚀
