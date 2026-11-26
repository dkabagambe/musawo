# Next Steps: E2E Testing + S3 Fixes

## Current Status

✅ **S1: My Profile & Photo** - Complete, 6 test assertions  
✅ **S2: Dashboard Shell & Widgets** - Complete, 8 test assertions  
⚠️ **S3: Timetable, Live Classes, Replays, Attendance** - 80% done, 5 gaps identified

---

## Immediate Action: Run E2E Tests

**Start here:** Read `RUN-E2E-TESTS.md` (quick 3-step guide)

### Commands You'll Run

**Terminal 1 (keep running):**
```bash
npm run demo:reset
npm run build
npm start
# Wait for "ready - started server on 0.0.0.0:3000"
```

**Terminal 2 (run tests):**
```bash
# S1 Tests
npx playwright test e2e/student-profile-avatar.spec.ts --headed

# S2 Tests  
npx playwright test e2e/student-s2-dashboard.spec.ts --headed

# Or both:
npx playwright test e2e/student-profile-avatar.spec.ts e2e/student-s2-dashboard.spec.ts --headed
```

### Expected Results

**S1 (6 tests):** ✅ All pass
- Avatar upload & persistence
- Fallback to initials
- Bio & theme persistence
- Locked fields rejected (403)
- Password requires current password

**S2 (8 tests):** ✅ All pass
- Banner text correct (no em-dash)
- Sidebar shows 6 groups
- Widget drag-reorder persists
- No horizontal scroll at 360px
- Active group opens automatically

---

## After Tests Pass

### Step 1: Commit & Push
```bash
# Verify clean status
git status
# Should show: "nothing to commit, working tree clean"

# Check log
git log --oneline -5

# Push (if on branch)
git push origin main
```

### Step 2: Start S3 Fixes (2-3 hours)

The 5 high-priority gaps that need fixing:

1. **Add resume position tracking** (watchedAt, lastPlaybackPosition fields)
   - Files: Prisma schema, RecordingViewer.tsx, API endpoint
   - Impact: Students can resume where they left off

2. **Mark as watched checkbox** (completion tracking)
   - Files: RecordingViewer.tsx, API endpoint
   - Impact: Track course progress by watched videos

3. **Playback speed for all formats** (not just YouTube)
   - Files: RecordingViewer.tsx
   - Impact: Students can adjust speed for S3 URLs

4. **Show presentation for scheduled classes** (pre-LIVE)
   - Files: StudentTimetableView.tsx, presentation API endpoint
   - Impact: Students can preview materials before class starts

5. **Add cancellation/reschedule notifications**
   - Files: Notification trigger system
   - Impact: Students alerted immediately when class changes

**Detailed breakdown:** See `docs/STUDENT-S3-ANALYSIS.md`

---

## Work Plan for S3 Fixes

### Fix 1: Resume Position (1 hour)

**Files to change:**
- `prisma/schema.prisma` - Add fields to Attendance table
- `src/app/(dashboard)/dashboard/recordings/RecordingViewer.tsx` - Save/restore position
- `src/app/api/recordings/[id]/position/route.ts` - New endpoint

**Changes:**
```prisma
model Attendance {
  ...
  watchedAt DateTime?
  lastPlaybackPosition Int? // seconds
}
```

```tsx
// In RecordingViewer, on video timeupdate:
const savePosition = async () => {
  await fetch(`/api/recordings/${classId}/position`, {
    method: "POST",
    body: JSON.stringify({ position: videoElement.currentTime })
  });
};

// On load: restore from API
const { position } = await fetch(`/api/recordings/${classId}/position`).then(r => r.json());
videoElement.currentTime = position || 0;
```

### Fix 2: Mark as Watched (30 mins)

**Files to change:**
- `src/app/(dashboard)/dashboard/recordings/RecordingViewer.tsx` - Add checkbox UI
- `src/app/api/recordings/[id]/watched/route.ts` - New endpoint

**Changes:**
```tsx
// In RecordingViewer footer:
<label>
  <input 
    type="checkbox" 
    checked={watched}
    onChange={async () => {
      await fetch(`/api/recordings/${classId}/watched`, { method: "POST" });
      setWatched(true);
    }}
  />
  Mark as watched
</label>
```

### Fix 3: Playback Speed for S3 (45 mins)

**Files to change:**
- `src/app/(dashboard)/dashboard/recordings/RecordingViewer.tsx`

**Changes:**
```tsx
// Instead of iframe for S3 URLs, use HTML5 video:
{isS3Url(url) && (
  <video
    controls
    style={{ playbackRate: playbackSpeed }}
    onRateChange={e => setPlaybackSpeed(e.currentTarget.playbackRate)}
  >
    <source src={url} />
  </video>
)}
```

### Fix 4: Presentation for Scheduled Classes (30 mins)

**Files to change:**
- `src/app/(dashboard)/dashboard/timetable/StudentTimetableView.tsx`
- `src/app/api/live-classes/[id]/presentation/route.ts`

**Changes:**
```tsx
// In StudentTimetableView detail panel, show presentation always:
{(isLive || isNearlyLive) && (
  <div className="border-t border-border pt-4">
    <p className="text-xs font-semibold text-gray-500 mb-2">Presentation slides</p>
    <PresentationViewer classId={cls.id} />
  </div>
)}

// In presentation endpoint, allow scheduled classes within 30 min:
const isNearlyLive = cls.scheduledAt - now < 30 * 60 * 1000;
if (cls.status !== "LIVE" && !isNearlyLive) return 404;
```

### Fix 5: Cancellation/Reschedule Notifications (30 mins)

**Files to change:**
- `src/app/api/live-classes/[id]/route.ts` (PATCH)
- `src/lib/notifications/index.ts` - Notification trigger

**Changes:**
```ts
// In PATCH handler when status changes:
if (oldStatus !== newStatus && ["CANCELLED", "RESCHEDULED"].includes(newStatus)) {
  // Find all enrolled students
  const students = await db.enrolment.findMany({
    where: { courseId: liveClass.courseId },
    select: { userId: true }
  });
  
  // Create notification for each
  for (const { userId } of students) {
    await db.notification.create({
      data: {
        userId,
        type: "CLASS_" + newStatus,
        title: `Class ${newStatus}: ${liveClass.title}`,
        link: `/dashboard/timetable`,
        read: false
      }
    });
  }
}
```

---

## Checklist for S3 Completion

### Before Starting
- [ ] S1 & S2 E2E tests PASS ✅
- [ ] Code committed and pushed
- [ ] Read `docs/STUDENT-S3-ANALYSIS.md` for details

### Fixing Gaps
- [ ] Fix 1: Resume position (Attendance fields + save/restore)
- [ ] Fix 2: Mark as watched (Checkbox + API)
- [ ] Fix 3: Playback speed for S3 (HTML5 video element)
- [ ] Fix 4: Presentation for scheduled classes (Time check)
- [ ] Fix 5: Notifications (Trigger system)

### Testing S3 Fixes
- [ ] Manual test: Play video, reload, resume from saved position
- [ ] Manual test: Check "mark as watched", reload, still checked
- [ ] Manual test: Speed control works for S3 URLs
- [ ] Manual test: Scheduled class within 30 min shows presentation
- [ ] Manual test: Cancel/reschedule class → notification appears

### After S3 Fixes
- [ ] All changes committed with clear messages
- [ ] Code passes lint: `npm run lint`
- [ ] Manual smoke test: Play recording, check all features
- [ ] Ready for S4

---

## Timeline

**E2E Testing:** 20-30 mins
**S3 Fixes:** 2-3 hours
**Manual Testing:** 30 mins
**Commit & Document:** 15 mins

**Total estimated:** 4-5 hours for complete S1 → S2 → S3

---

## Git Workflow

```bash
# After E2E tests pass
git status
git push origin main

# While fixing S3, create commits per fix:
git add <files for fix 1>
git commit -m "S3: Add resume position tracking for recordings"

git add <files for fix 2>
git commit -m "S3: Add mark as watched checkbox"

# etc...

# Final push after all fixes
git push origin main
```

---

## Success Criteria

**S1 & S2:** All E2E tests pass ✅  
**S3 fixes:** Manual smoke tests pass, students can:
- Resume recording from saved position
- Mark videos as watched
- Adjust playback speed for all formats
- Preview materials for scheduled classes (within 30 min)
- Receive notifications when class is cancelled/rescheduled

---

## Questions or Issues?

If E2E tests fail:
1. Note the test name and error message
2. Check server is running (`curl http://localhost:3000`)
3. Check database: `npm run demo:reset`
4. Try running single test with debug: `npx playwright test --debug`

If S3 fixes encounter issues:
1. Read the specific error
2. Check file paths are correct
3. Verify imports are added
4. Run `npm run lint` to find syntax errors

---

**Ready to run tests? Start with:** `RUN-E2E-TESTS.md`
