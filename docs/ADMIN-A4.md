# ADMIN A4: ACADEMIC ADMINISTRATION - PARTIAL

Status: **PARTIAL** (5/7 complete)

## Completed

1. **A4.1 Programmes (view-only)**: Already implemented, shows programmes without edit buttons, view-only message displayed
2. **A4.2 Courses**: Existing page lists courses with status toggle, instructor, blocks, enrolments (administrative edits not yet added)
3. **A4.3 Classes (partial)**: Rebuilt to show intake-based cohorts, roster view with student photos and table, allocate/groups/export links created (allocation and groups pages not yet built)
4. **A4.4 Terms/Intakes**: Fixed permission from Principal+ to Admin, updated title and description, mentioned storage clearing preparation
5. **A4.5 Instructors**: New pages created - list shows all instructors with courses taught, classes held vs scheduled, detail page shows full profile with recent classes

## Remaining

6. **A4.3 Classes (continued)**: Need allocate students page, move student with reason, breakaway groups management (default size 5), export with audit logging
7. **A4.6 Timetable**: Comprehensive coordination matrix not yet built (block/lecturer/when/where by week, conflict detection, rescheduling notifications)
8. **A4.7 Tests**: Playwright tests created (8 scenarios), need full 30-student allocation test, move test, timetable change notifications, conflict blocking, 403 test for programme edits

## Files Created/Modified

- `src/app/(admin)/admin/intakes/page.tsx` - fixed permission, updated messaging
- `src/app/(admin)/admin/classes/page.tsx` - completely rebuilt for cohort view
- `src/app/(admin)/admin/classes/[intakeId]/page.tsx` - roster with photos and table
- `src/app/(admin)/admin/tutors/page.tsx` - instructors list
- `src/app/(admin)/admin/tutors/[id]/page.tsx` - instructor detail
- `e2e/admin-a4-academic.spec.ts` - 8 test scenarios

## Evidence

Run `npm run build && npm start` with seeded data:
- `/admin/programmes` - view-only, no edit buttons
- `/admin/courses` - lists courses with administrative data
- `/admin/classes` - shows intakes as class cohorts with roster links
- `/admin/classes/[id]` - roster with student photos in grid and table
- `/admin/intakes` - accessible to Admin (not 403)
- `/admin/tutors` - lists instructors with stats
- `/admin/tutors/[id]` - instructor detail with courses and classes

Tests: `npx playwright test e2e/admin-a4-academic.spec.ts`
