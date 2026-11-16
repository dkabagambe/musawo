# STUDENT-S8: Mobile, Dark Mode, Speed, Final Proof

## What was built

**Mobile bottom navigation** (`src/components/ui/AppShell.tsx`, `src/app/globals.css`): a 5-item fixed bar at the bottom of the screen on phones (max-width 767px). Items: Dashboard, Classes, Learn, Fees, More. All tap targets are at least 44x44px. Active route is highlighted. "More" opens the existing sidebar drawer. Invisible at tablet and desktop widths.

**Performance indexes** (migration `20261116020000_s8_performance_indexes`): 10 new indexes on `grade_entries`, `assignments`, `assignment_submissions`, `forum_replies`, and `announcements`. Eliminate N+1 patterns on the highest-traffic student queries.

**Cross-role Playwright test** (`e2e/student-s8-cross-role.spec.ts`): 14 tests covering cross-role story (tutor + student), mobile bottom nav (5 items, 44px targets, active state, navigation, drawer), dark mode, and page speed sanity (6 key pages under 3 seconds).

**Status docs**: `docs/STUDENT-STATUS.md` updated with one honest table.

## Test results

14/14 Playwright tests pass. Run: `npx playwright test e2e/student-s8-cross-role.spec.ts`.

## Load test

Run `npm run load:30` for the full k6 30-student concurrent load report (targets: p95 under 1 s, errors under 1 percent).
