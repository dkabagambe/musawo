# T4 - TIMETABLE

**Status: COMPLETE**

## What was built

One source of truth for classes: the existing `LiveClass` model (all T4 fields already present - `venue`, `cancelReason`, `rescheduleReason`, `originalScheduledAt`, status enum SCHEDULED/LIVE/COMPLETED/CANCELLED/RESCHEDULED).

**`/tutor/timetable`** - full rebuild:
- List view (default), week view, month view with prev/next/Today navigation
- Colour-coded by course with a click-to-filter legend
- Overlap detection - yellow highlight + warning banner for overlapping scheduled classes
- Click any entry to open a detail panel: title, course, block, time, venue, students, join link, reschedule/cancel reason
- Inline reschedule (opens RescheduleModal - calls PATCH `action:reschedule`) and cancel (opens CancelModal - calls PATCH `action:cancel`) from the detail panel
- Create class (New class button opens CreateClassModal with all fields including weekly repeat)
- ICS calendar download via `GET /api/tutor/classes?format=ics`
- Works at 390px and 1440px, light and dark theme

**Seed data updated** (`prisma/seed.ts`):
- 22 classes across all 8 course names for 3 instructors (Joel Mirembe, Charles Muwanga, Jennifer Atim)
- Statuses: 9 COMPLETED, 11 SCHEDULED, 1 CANCELLED (with reason), 1 RESCHEDULED (with reason and originalScheduledAt)
- Overlapping times across courses to exercise conflict detection
- Venues set (Skills Lab A/B/C or Online)

## Files changed

- `src/app/(tutor)/tutor/timetable/page.tsx` - server component (fetches data, passes to client view)
- `src/app/(tutor)/tutor/timetable/TimetableView.tsx` - main client component (list/week/month views, legend, controls)
- `src/app/(tutor)/tutor/timetable/CreateClassModal.tsx` - create class form
- `src/app/(tutor)/tutor/timetable/RescheduleModal.tsx` - reschedule form
- `src/app/(tutor)/tutor/timetable/CancelModal.tsx` - cancel form
- `prisma/seed.ts` - expanded to 22 classes across all 7 courses for 3 instructors
- `e2e/timetable.spec.ts` - 15 Playwright tests

## Test results

**15/15 Playwright tests pass** (run against production build + demo:reset + seed).

Evidence: `npx playwright test e2e/timetable.spec.ts` -> 15 passed (1.0m)
