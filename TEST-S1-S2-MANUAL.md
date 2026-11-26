# Manual E2E Test Execution for S1 & S2

## Prerequisites

Before running tests, ensure you have:
- Node.js with `npm` installed
- Docker and Docker Compose for database
- Playwright browsers installed

## Setup Steps

**Step 1: Reset database and start services**
```bash
npm run demo:reset
# This command:
# - Stops and removes docker containers
# - Starts postgres and redis
# - Runs database migrations
# - Seeds demo data (including student.full@example.com)
```

**Step 2: Build the application**
```bash
npm run build
# Creates optimized production build in .next/
# Runs any pre-build scripts (db migrations, etc.)
```

**Step 3: Start production server (Terminal 1)**
```bash
npm start
# Starts on http://localhost:3000
# Keep this running
```

**Step 4: Run S1 tests (Terminal 2)**
```bash
npx playwright test e2e/student-profile-avatar.spec.ts --headed
# --headed shows browser window
# Tests:
#   1. Upload avatar, persist after logout and login
#   2. Remove photo falls back to initials
#   3. Broken avatar image falls back to initials in sidebar
#   4. Bio and theme persist after reload
#   5. Locked fields rejected by a direct API call
#   6. Password change requires the current password
```

**Step 5: Run S2 tests (Terminal 2)**

First, create the S2 test file (we'll need to do this):
```bash
# S2 tests should cover:
# - Sidebar structure at 1280x720 and 360px
# - Widget move persists after reload
# - Every tab has widgets
# - Every widget link opens right page
# - Dark theme readable
# - Course card wrap + tooltip visible

npx playwright test e2e/student-dashboard-s2.spec.ts --headed
```

## Test Execution Summary

| Test File | Tests | Expected Duration | Status |
|-----------|-------|------------------|--------|
| student-profile-avatar.spec.ts | 6 | ~3-5 min | Ready to run |
| student-dashboard-s2.spec.ts | 6 | ~5-8 min | Needs creation |

## Quick Test All

After server is running:
```bash
# Run all E2E tests
npx playwright test e2e/ --headed

# Run specific file
npx playwright test e2e/student-profile-avatar.spec.ts

# Run with filtering
npx playwright test --grep "S1"

# Debug mode
npx playwright test --debug

# Show reports
npx playwright show-report
```

## Troubleshooting

**Server won't start:**
```bash
# Kill existing process
pkill -f "node.*next"
# Try again
npm start
```

**Database connection error:**
```bash
# Check if postgres is running
docker compose ps
# Reset if needed
npm run demo:reset
```

**Tests timeout waiting for page:**
- Check server is actually running: `curl http://localhost:3000`
- Check database is accessible
- Increase playwright timeout in test file (default 15s)

**Tests fail with "Unauthorized":**
- Ensure demo:reset ran and seeded data
- Check that dev/login page works: `http://localhost:3000/dev/login`

## Demo Credentials

**Student (S1 & S2 tests use this):**
- Email: `student.full@example.com`
- Password: `Demo1234!`
- Access: via `/dev/login` (dev page) or manual login

## Success Criteria

**S1 tests pass when:**
- Avatar uploads and persists through logout/login
- Broken images fall back to initials
- Bio and theme saved to database
- API rejects locked field changes (403)
- Password requires current password

**S2 tests pass when:**
- Sidebar shows all 6 groups at correct breakpoints
- Widget drag-reorder persists after reload
- Each tab (general/studies/finance/classes) has 4+ widgets
- Widget links open correct pages
- Dark theme has AA contrast
- Course titles wrap with ellipsis

## Next Steps After Tests

1. If S1 & S2 tests PASS:
   - Commit test results to git
   - Push to remote
   - Start fixing S3 gaps

2. If tests FAIL:
   - Identify which specific assertion failed
   - Fix the root cause
   - Re-run to confirm fix
   - Document issue in git commit

## Commands Reference

```bash
# Full setup from scratch
npm run demo:reset && npm run build && npm start &
npx playwright test e2e/student-profile-avatar.spec.ts --headed

# Just run tests (server already running)
npx playwright test e2e/student-profile-avatar.spec.ts

# View test report
npx playwright show-report

# Run with debugging
npx playwright test --debug

# Headed mode (see browser)
npx playwright test --headed

# Specific test
npx playwright test -g "Upload avatar"

# Stop server
pkill -f "node.*next" || pkill -f "npm start"
```

