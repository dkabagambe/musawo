# Migration: Render → Vercel

**Everything you need to migrate your app from Render to Vercel + Neon + Upstash.**

---

## 📍 Start Here

**Choose your learning style:**

| If You Prefer... | Read This |
|------------------|-----------|
| **5-min quick overview** | [MIGRATION-START-HERE.md](./MIGRATION-START-HERE.md) |
| **Step-by-step checklist** | [MIGRATION-CHECKLIST.md](./MIGRATION-CHECKLIST.md) |
| **Detailed walkthrough** | [MIGRATION-STEP-BY-STEP.md](./MIGRATION-STEP-BY-STEP.md) |
| **Copy-paste commands** | [QUICK-MIGRATION-REFERENCE.md](./QUICK-MIGRATION-REFERENCE.md) |
| **Troubleshooting help** | [MIGRATION-TROUBLESHOOTING.md](./MIGRATION-TROUBLESHOOTING.md) |
| **Full summary** | [MIGRATION-READY.md](./MIGRATION-READY.md) |
| **Executive summary** | [MIGRATION-SUMMARY.txt](./MIGRATION-SUMMARY.txt) |

---

## 🚀 Quick Start (60 seconds)

1. **Create 3 accounts** (~15 min):
   - Neon: https://neon.tech
   - Upstash: https://upstash.com
   - Vercel: https://vercel.com

2. **Run the script** (~15 min):
   ```bash
   ./scripts/migrate-to-vercel.sh
   ```

3. **Deploy on Vercel** (~25 min):
   - Import repo
   - Add env vars
   - Deploy

4. **Test** (~10 min):
   - Log in, verify features

5. **Final cutover** (~5 min):
   - Suspend Render

**Total:** ~1 hour active work, <5 min downtime

---

## 📦 What's Included

### Documentation
- **MIGRATION-START-HERE.md** — Entry point (read first)
- **MIGRATION-READY.md** — Prep checklist
- **MIGRATION-STEP-BY-STEP.md** — Full walkthrough
- **MIGRATION-CHECKLIST.md** — Actionable checklist
- **QUICK-MIGRATION-REFERENCE.md** — Commands & values
- **MIGRATION-TROUBLESHOOTING.md** — Problem solutions
- **MIGRATION-SUMMARY.txt** — Executive summary (this file)

### Tools
- **scripts/migrate-to-vercel.sh** — Automated backup/restore
- **vercel.json** — Vercel configuration
- **next.config.mjs** — Updated for Vercel

---

## 🎯 Why Migrate?

| Problem | Solution |
|---------|----------|
| Render deletes DB every 30 days | Neon persists forever |
| Render app sleeps after 15 min | Vercel always online |
| Render free tier gets expensive | Vercel + Neon + Upstash = free |

---

## ✅ What Stays the Same

- ✓ All app features (login, courses, files, payments, emails, 2FA)
- ✓ All student data (zero data loss)
- ✓ Custom domain (learn.musawotraining.ug)
- ✓ Staff emails (@musawotraining.ug)
- ✓ No code changes needed

---

## 🔄 The 5 Phases

```
Phase 1: Create Services (20 min)
├─ Neon
├─ Upstash
└─ Vercel

Phase 2: Backup & Restore (15 min)
├─ Export Render DB
├─ Restore to Neon
└─ Generate secrets

Phase 3: Deploy (25 min)
├─ Import repo
├─ Set env vars
└─ Deploy

Phase 4: Test (10 min)
├─ Login ✓
├─ Courses ✓
├─ Files ✓
├─ Email ✓
└─ Payments ✓

Phase 5: Cutover (5 min)
└─ Suspend Render
```

---

## 🛡️ Safety

- **Reversible:** You can go back to Render anytime before final cutover
- **Backed up:** Database fully backed up before any changes
- **Safe:** Render stays running during testing
- **Fast:** <5 min downtime at the very end only

---

## 📋 Checklist

Before starting:
- [ ] Read MIGRATION-START-HERE.md (5 min)
- [ ] Create Neon account
- [ ] Create Upstash account
- [ ] Create Vercel account
- [ ] Save connection strings from each

Then:
- [ ] Run ./scripts/migrate-to-vercel.sh
- [ ] Deploy on Vercel
- [ ] Test all features
- [ ] Suspend Render

---

## ❓ Need Help?

| Question | Answer |
|----------|--------|
| How do I start? | MIGRATION-START-HERE.md |
| I want a checklist | MIGRATION-CHECKLIST.md |
| Explain everything | MIGRATION-STEP-BY-STEP.md |
| Something broke | MIGRATION-TROUBLESHOOTING.md |
| Quick reference | QUICK-MIGRATION-REFERENCE.md |
| Give me details | MIGRATION-READY.md |

---

## 🔧 Commands

**Automated migration:**
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
psql "$NEON_DB_URL" < musawo-backup.sql
```

---

## 📊 Timeline

| Phase | Time | Downtime |
|-------|------|----------|
| Services | 20 min | 0 min |
| Backup | 15 min | 0 min |
| Deploy | 25 min | 0 min |
| Test | 10 min | 0 min |
| Cutover | 5 min | <5 min ⚠️ |
| **Total** | **~70 min** | **<5 min** |

---

## 🎓 Key Points

1. Everything is prepared and ready to go
2. All documentation is in this folder
3. Automated tools do most of the work
4. Zero risk (fully reversible until final cutover)
5. No code changes needed
6. App works exactly the same after migration
7. Students see zero difference (except faster loads)
8. No external dependencies or help needed

---

## ✨ Next Steps

1. **Now:** Read MIGRATION-START-HERE.md
2. **Next:** Create the 3 accounts
3. **Then:** Run the migration script
4. **Finally:** Deploy and test

---

**Ready? Let's go!** 🚀

Start with: [MIGRATION-START-HERE.md](./MIGRATION-START-HERE.md)
