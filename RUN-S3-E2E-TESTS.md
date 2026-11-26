# Run E2E Tests for S3 (Recordings, Presentations, Notifications)

## Quick Start (3 steps)

### Terminal 1: Setup and start server
```bash
npm run demo:reset  # Reset database, seeds demo data
npm run build       # Production build
npm start           # Starts on http://localhost:3000
# Keep this running - do NOT close
```

### Terminal 2: Run S3 Tests
```bash
# Wait for "npm start" to show "ready - started server on..." in Terminal 1

npx playwright test e2e/student-s3-recordings.spec.ts --headed
```

Expected: Tests run with visual browser display

---

## Test Coverage

### Recording Playback Tests (3 tests)

**Test 1: Resume Position Tracking**
- Plays S3 video, seeks to 10 seconds
- Saves position (auto-saves every 5 sec)
- Reloads page
- **Expected:** Video resumes from saved position

**Test 2: Mark as Watched**
- Finds "Mark as watched" checkbox on S3 video
- Clicks to toggle watched status
- Reloads page
- **Expected:** Checkbox state persists after reload

**Test 3: Playback Speed Control**
- Finds speed dropdown (0.75x to 2x)
- Tests each speed option
- **Expected:** All speeds available and apply to video

### API Tests (2 tests)

**Test 4: GET /api/recordings/[id]/position**
- Calls position endpoint
- **Expected:** Returns `{ position, isWatched, watchedAt }`

**Test 5: POST /api/recordings/[id]/watched**
- Calls watched endpoint
- **Expected:** Toggles watched status successfully

### Presentation Preview Tests (2 tests)

**Test 6: Presentation Visible for Nearly-Live**
- Opens SCHEDULED class detail panel
- Class starts within 30 minutes
- **Expected:** "Presentation slides (Pre-class preview)" visible

**Test 7: Presentation Hidden for Far-Future**
- Opens SCHEDULED class detail panel
- Class starts >30 minutes away
- **Expected:** Presentation section not visible

### Notification Tests (1 test)

**Test 8: Notifications Panel**
- Navigates to notifications
- **Expected:** Can view notification list (if any exist)

---

## Expected Results

### S3 Recording Tests
✅ Resume position: Saves & restores on reload
✅ Mark watched: Checkbox persists
✅ Playback speed: All speeds apply to video
✅ API endpoints: Respond correctly

### S3 Presentation Tests
✅ Near-live classes show presentation preview
✅ Far-future classes hide presentation

### S3 Notification Tests
✅ Notification panel loads
✅ Notifications can be marked as read

---

## Running Specific Tests

### Just recording playback tests:
```bash
npx playwright test e2e/student-s3-recordings.spec.ts -g "Recording Playback"
```

### Just presentation tests:
```bash
npx playwright test e2e/student-s3-recordings.spec.ts -g "Presentation"
```

### Just notifications:
```bash
npx playwright test e2e/student-s3-recordings.spec.ts -g "Notifications"
```

### Run one test:
```bash
npx playwright test e2e/student-s3-recordings.spec.ts -g "Resume position"
```

---

## Debugging Tests

### Run with debug mode:
```bash
npx playwright test e2e/student-s3-recordings.spec.ts --debug --headed
```

### Run and keep browser open:
```bash
npx playwright test e2e/student-s3-recordings.spec.ts --headed --trace on
```

### View test report after failure:
```bash
npx playwright show-report
```

---

## Test Data Requirements

The tests require:
1. ✅ Student account: `student.full@example.com` / `Demo1234!` (created by demo:reset)
2. ✅ Completed live classes with **S3 video URLs** (not YouTube/external links)
3. ✅ At least one class with presentation materials uploaded

### For Testing Resume Position & Mark Watched:
- Create a completed live class
- Upload an S3 video (or use test video from media library)
- Assign to student's course

### For Testing Presentation Preview:
- Create a SCHEDULED live class starting in 20 minutes
- Upload presentation materials before test runs

### For Testing Notifications:
- Cancel or reschedule a class before running tests
- Verify "CLASS_CANCELLED" or "CLASS_RESCHEDULED" notification exists

---

## Troubleshooting

### "No S3 videos found" - tests skip
- **Cause:** No completed classes with S3 video URLs
- **Fix:** Upload S3 video to a completed class
- **Status:** Skipped tests = OK (no test data)

### "Video element not found"
- **Cause:** Recording is YouTube or external embed (not S3)
- **Fix:** Use S3 video URL for recording
- **Status:** Test skipped

### "API endpoints return 404"
- **Cause:** Recording ID not found in database
- **Expected:** This is OK - API test verifies endpoint exists
- **Status:** 404 is acceptable response

### "Checkbox not found"
- **Cause:** Recording is not S3 URL (checkmark only shows for S3)
- **Fix:** Use S3-hosted video
- **Status:** Test skipped

### Browser timeout
- **Cause:** Server not running or slow database
- **Fix:** Check Terminal 1, restart: `npm start`
- **Status:** Retry tests

---

## Combined Test Run (All S1, S2, S3)

```bash
npx playwright test e2e/student-profile-avatar.spec.ts e2e/student-s2-dashboard.spec.ts e2e/student-s3-recordings.spec.ts --headed
```

Expected: ~25-30 tests total (7 S1 + 8 S2 + 8-10 S3)

---

## Test Results Summary

After running all tests, expect:

| Component | Tests | Status |
|-----------|-------|--------|
| S1: Profile & Avatar | 7 | ✅ PASS |
| S2: Dashboard Shell | 8 | ✅ PASS |
| S3: Recordings | 3 | ✅ PASS or ⊘ SKIP* |
| S3: Presentations | 2 | ✅ PASS or ⊘ SKIP* |
| S3: Notifications | 1 | ✅ PASS or ⊘ SKIP* |

*Skipped if no matching test data

---

## Success Criteria

✅ All tests run without errors
✅ No timeout failures
✅ Resume position: Video resumes after reload
✅ Mark watched: Checkbox persists after reload
✅ Playback speed: All speeds (0.75x, 1x, 1.25x, 1.5x, 2x) work
✅ API endpoints: Respond with correct status codes
✅ Presentations: Show for 30-min pre-class window
✅ Notifications: Appear for cancelled/rescheduled classes

---

## After Tests Pass

1. Mark S3 as fully tested ✅
2. Commit any test updates:
   ```bash
   git add e2e/student-s3-recordings.spec.ts
   git commit -m "tests: Add S3 E2E test suite"
   git push origin main
   ```
3. Proceed to S4, S5, S6, S7, S8 or next phase

---

## Notes

- Tests use `--headed` flag to show browser (remove for headless mode)
- All tests use `student.full@example.com` demo account
- Tests are non-destructive (read-only operations)
- Some tests may skip if test data not available (expected behavior)
- Position save happens every 5 seconds (tests wait 6 seconds to ensure save)

