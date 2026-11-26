# Run E2E Tests for S1 & S2

## Quick Start (3 steps)

### Terminal 1: Setup and start server
```bash
npm run demo:reset  # Reset database, seeds demo data
npm run build       # Production build
npm start           # Starts on http://localhost:3000
# Keep this running - do NOT close
```

### Terminal 2: Run S1 Tests
```bash
# Wait for "npm start" to show "ready - started server on..." in Terminal 1

npx playwright test e2e/student-profile-avatar.spec.ts --headed
```

Expected: 6 tests pass in ~3-5 minutes
- Upload avatar, persist after logout/login ✅
- Remove photo falls back to initials ✅
- Broken avatar falls back to initials in sidebar ✅
- Bio and theme persist after reload ✅
- Locked fields rejected by API (403) ✅
- Password change requires current password ✅

### Terminal 2: Run S2 Tests
```bash
npx playwright test e2e/student-s2-dashboard.spec.ts --headed
```

Expected: 8 tests pass in ~5-8 minutes
- Demo banner has no em dash ✅
- Demo banner can be dismissed ✅
- Sidebar shows all 6 groups at 1280x720 ✅
- Sidebar user block visible at 1280x720 ✅
- No horizontal scroll at 360px ✅
- Active group opens automatically ✅
- Moving Upcoming Classes to top persists after reload ✅

---

## Test Status Expectations

**If all tests PASS ✅**
1. Run these commands to commit:
   ```bash
   git status  # Verify no uncommitted files
   git log --oneline -5  # See recent commits
   ```
2. All is clean, ready to push and start S3 fixes

**If tests FAIL ❌**
1. Take note of which test failed
2. The error message will show the root cause
3. Example: "Waiting for locator to appear" means element not found
4. Tell me which test failed and I'll diagnose

---

## Important Notes

- **Keep Terminal 1 running** - If server stops, tests will fail
- **Demo data is seeded** automatically - Student `student.full@example.com` / `Demo1234!` exists
- **Clear browser cache** if tests seem stuck - Playwright does this automatically
- **Don't modify code** while tests are running

---

## Alternative: Run Both Tests in One Command

After server is running:
```bash
npx playwright test e2e/student-profile-avatar.spec.ts e2e/student-s2-dashboard.spec.ts --headed
```

Shows browser window, runs all tests sequentially. Total ~10-15 minutes.

---

## If Something Goes Wrong

**Server won't start:**
```bash
pkill -f "node.*next"  # Kill any stuck processes
npm start              # Try again
```

**Tests timeout:**
- Check server is running: `curl http://localhost:3000` should return HTML
- If not, server crashed - check Terminal 1 for errors

**Database error:**
```bash
npm run demo:reset     # Restart everything
npm run build
npm start
```

---

## After Tests Pass

You'll have a solid foundation to proceed with:
1. Git commit + push (all S1 & S2 tests confirmed working)
2. Fix S3 gaps (resume position, mark as watched, playback speed)
3. Continue to S4, S5, S6, S7, S8

Estimated S3 fix time: 2-3 hours
