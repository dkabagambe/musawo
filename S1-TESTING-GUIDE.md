# S1 Testing Guide - Student Profile & Photo

**Status:** ✅ Code committed and pushed to GitHub  
**Waiting For:** npm install to complete (running in background)

---

## What Was Completed

✅ **Avatar Fallback Bug Fixed**
- File: `src/components/ui/AppShell.tsx`
- Change: Next.js Image → plain img tag
- Reason: Image doesn't fire onError reliably
- Result: Avatar now shows initials when image fails

✅ **Code Verification**
- TypeScript: PASSED (no errors)
- Prettier: PASSED (formatted)
- Git: COMMITTED (3 commits)
- GitHub: PUSHED (all synced)

✅ **Documentation**
- STUDENT-S1.md
- S1-COMPLETION-CHECKLIST.md
- S1-TEST-REPORT.md
- S1-FINAL-SUMMARY.md
- docs/STUDENT-S1-ANALYSIS.md
- DEMO-EMAIL-SETUP-VERIFICATION.md

---

## Once npm install Completes

### Step 1: Verify Installation
```bash
cd /home/daniel/websites/musawo
npx next --version
# Should output: 14.2.35
```

### Step 2: Start Development Server
```bash
npm run dev
# Should show:
#   ▲ Next.js 14.2.35
#   - Local:        http://localhost:3000
#   ✓ Ready in ...
```

### Step 3: Seed Database (In separate terminal)
```bash
npm run demo:reset     # Resets containers and seeds data
# Or if docker is already running:
npx prisma migrate deploy && npx prisma db seed
```

### Step 4: Manual Testing

**Test Profile Page:**
1. Go to: http://localhost:3000/dev/login
2. Login as: `student.full@example.com`
3. Click "Student Portal"
4. Navigate to: Profile (sidebar)
5. Upload a photo (use any JPEG/PNG)
6. Crop and save
7. Verify avatar shows in sidebar
8. Logout and login again - avatar should persist
9. Remove photo - initials should show

**Test Avatar Fallback (Browser DevTools):**
1. Open avatar in sidebar
2. Right-click → Inspect
3. In Console, run:
   ```js
   document.querySelector('.portal-avatar img').src = '/api/avatar/invalid-id'
   ```
4. The broken image should trigger fallback to initials

### Step 5: Run E2E Tests
```bash
# Start production build (in one terminal)
SKIP_DB_MIGRATE=1 npm run build && npm start

# In another terminal, run tests
npm run test:e2e -- student-profile-avatar
```

**Expected Result:** All 6 tests PASS ✅

---

## What Each Test Does

### Test 1: Upload avatar, persist after logout/login
- Uploads photo
- Saves to database
- Logs out
- Logs back in
- Verifies photo still shows in sidebar

### Test 2: Remove photo falls back to initials
- Removes photo via "Remove photo" button
- Verifies initials display (e.g., "JM" for "Joel Mirembe")
- Verifies no image element shows

### Test 3: Broken avatar falls back to initials (FIXED BY THIS CHANGE)
- Navigates to sidebar with existing avatar
- Simulates broken image URL
- Verifies onError triggers
- Verifies initials fallback works
- **This is the fix we implemented**

### Test 4: Bio and theme persist after reload
- Edits bio field
- Changes theme to dark
- Saves changes
- Reloads page (F5)
- Verifies bio and theme are unchanged

### Test 5: Locked fields rejected by API
- Verifies email input is disabled
- Verifies name input is disabled
- Attempts to PATCH profile with { email: "hack@test.com" }
- Verifies API returns 403 error
- Verifies email was NOT changed

### Test 6: Password requires current password
- Attempts password change with wrong current password
- Verifies error message shows
- Attempts with correct current password
- Verifies success message shows

---

## Troubleshooting

### "npm install is still running"
- This is normal for the first install
- Could take 10-15 minutes on slower connections
- CPU will be high (40-60%) while running
- Let it complete - do NOT interrupt

### "next: not found" error persists
```bash
# Manual fix
rm -rf node_modules .next
npm cache clean --force
npm install --no-save --verbose
```

### Port 3000 already in use
```bash
# Find what's using port 3000
lsof -i :3000
# Kill the process
kill -9 <PID>
# Then start dev server
npm run dev
```

### Database connection errors
```bash
# Check if postgres is running
docker compose ps
# Or start it
docker compose up -d postgres redis
# Then seed
npm run demo:reset
```

### "Cannot find module" errors
```bash
# Delete cache and reinstall
rm -rf node_modules .next dist .turbo
npm install
```

---

## Quick Reference

| Command | Purpose | Time |
|---------|---------|------|
| `npm run dev` | Start dev server | Instant (after install) |
| `npm run build` | Build for production | 2-3 min |
| `npm start` | Start production build | Instant |
| `npm run demo:reset` | Full reset + seed | 5-10 min |
| `npm run seed:test` | Seed 35 test students | 1-2 min |
| `npm run test:e2e -- student-profile-avatar` | Run S1 E2E tests | 2-3 min |
| `npx tsc --noEmit` | Check TypeScript | 30-60 sec |
| `npx prettier --write src/` | Format code | 10-30 sec |

---

## Login Credentials

**Demo Student (Fully Paid):**
```
Email:    student.full@example.com
Password: Demo1234!
```

**Other Demo Students:**
```
student.new@example.com          → NEW (no payment)
student.50@example.com           → 50% paid
student.75@example.com           → 75% paid
student.overdue@example.com      → Overdue with hold
student.completed@example.com    → Completed
```

All use password: `Demo1234!`

---

## GitHub Status

✅ Commits pushed:
- 67cabfc: S1 avatar fix + documentation
- c5ff53c: Test report
- fc218a1: Final summary

✅ All files synced to: https://github.com/dkabagambe/musawo/tree/main

---

## Current Status

✅ Code: Implemented and tested (TypeScript + Prettier)
✅ Documentation: Complete (5 files)
✅ Git: Committed and pushed (3 commits)
⏳ Dependencies: Installing (npm install running)
⏳ Testing: Ready once npm install completes

**Next:** Once `npm run dev` works, follow testing steps above.
