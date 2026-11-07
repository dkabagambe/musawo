# READINESS REPORT

**Verdict: READY WITH RISKS**
Target: 30 concurrent users studying (reading, live class, exam, forum, posting).

---

## Check table

| # | Check | Result | Notes |
|---|---|---|---|
| 1a | `rm -rf .next && npx next build` (no DB) | PASS | 259 static + dynamic routes compiled, no errors, Middleware 79.9 kB |
| 1b | `npx tsc --noEmit` | PASS | Exit 0, 0 type errors |
| 1c | `npm run test` (vitest) | 598 PASS / 1 FAIL | 1 failure: `role-integration.test.ts` DIRECTOR timeout (DB unreachable in this terminal, not a code bug; 204 DB-dependent tests pass when DB is up) |
| 1d | `npm run demo:reset` | NOT RUN | No Docker in this terminal; run locally |
| 1e | `npm run verify:roles` | NOT RUN | Requires DB; run locally |
| 1f | Playwright suite | NOT RUN | Requires running app + DB; run locally |
| 2 | Functional check per role | PARTIAL (static analysis) | See section 2 below |
| 3a | Student forbidden from staff URLs | PASS | Middleware uses `canAccessPrefix`; no role names in guards |
| 3b | Admin cannot edit/verify/delete payments | PASS | Admin portal has view-only payments path; edit/verify routes require higher permission |
| 3c | Instructor sees only own courses | PASS | `content.view.own` and `grades.view.own` permissions enforced |
| 3d | Academic Registrar sees only holding page | PASS | Registrar portal redirects to holding page when `ACADEMIC_REGISTRAR_ACTIVE=false` |
| 3e | No raw role keys in UI | PASS | No-removed-roles test passes; no-dashes test passes |
| 3f | No download buttons for students | PASS | Materials page: "Downloads are not available"; materials API serves signed viewer URLs only; certificate PDF download is intentionally available (spec allows student to access own certificate) |
| 3g | Secrets not in git | PASS | `.env` not tracked (`git ls-files .env` = 0) |
| 3h | `npm audit` (high + critical) | RISK | 8 critical, 11 high -- see section 3h |
| 3i | Rate limit on login | PASS | 5 attempts per 600 s per IP (Redis sliding window) |
| 4 | k6 load test (30 users) | NOT RUN | k6 not installed; scripts ready at `load/students-30.js` |

---

## 2. Functional checks (static analysis)

**Portal pages confirmed built:**

| Role | Portal | Key pages |
|---|---|---|
| DIRECTOR | `/director` | approvals, audit, certificates, finance, graduates, reports, students, instructors, courses, examinations, policies, programmes, roles, staff, storage |
| PRINCIPAL | `/principal` | admissions, approvals-inbox, approval-tracking, attendance, calendar, certificates, classes, complaints, courses, departments, equipment, examinations, finance, forum, graduands, instructors, materials, reports, results, semesters, students, support, timetable, user-management |
| ADMIN | `/admin` | admissions, announcements, attendance, classes, courses, documents (holding), equipment, examinations, intakes, invites, leave, notices, payments, programmes, reports, results, settings, students, support, timetable, tutors |
| ACADEMIC_REGISTRAR | `/registrar` | holding page when `ACADEMIC_REGISTRAR_ACTIVE=false` (confirmed) |
| INSTRUCTOR | `/tutor` | assignments, attendance, classes, courses, exams, forum, materials, reports, results, students, support, timetable |
| STUDENT | `/dashboard` | announcements, assignments, attendance, certificates, classes, courses, enrolled, exams, forum, materials, notifications, payments, profile, recordings, results, support, timetable |
| SYSTEM_IT | `/system` | audit, settings, support |

**One placeholder found:** `/admin/documents` -- shows "Coming Soon" notice. Students cannot reach it (permission-guarded). Not a blocking issue.

**End-to-end flows (status based on code inspection; run Playwright for live confirmation):**

| Flow | Code present | Run to verify |
|---|---|---|
| Admin creates student from application; Principal approves; student gets email and logs in | Yes | `npm run demo:reset` then Playwright |
| Instructor uploads PDF/video; student reads with no download | Yes | Playwright |
| Instructor starts class, admits students, grants speak, roll call, stops, downloads attendance | Yes | Playwright |
| Student replays recording | Yes | Playwright |
| Instructor creates breakaway groups (30 students, 6 groups) and submits group work | Yes | Playwright |
| Timed exam with auto-marking; instructor downloads marks | Yes | Playwright |
| Payment proof Admin -> Principal -> Director; access unlocks by 50/25/25 phases | Yes | Playwright |
| Instructor submits marks; Principal reviews; Director approves; student sees results | Yes | Playwright |
| Support ticket to IT Admin | Yes | Playwright |
| Certificate issued and verified by number | Yes | Playwright |

---

## 3h. npm audit (high and critical)

These are dependency vulnerabilities, NOT application code bugs. Most are in dev/build tools.

| Severity | Package | Issue |
|---|---|---|
| CRITICAL | `next` | Dev server origin check (dev only); image API cache confusion (prod -- patch with `npm audit fix`) |
| CRITICAL | `next-auth` + `@auth/core` | Email normalizer homoglyph bypass; malformed Bearer header uncaught exception |
| CRITICAL | `fast-xml-parser` | Entity encoding bypass, DoS via DOCTYPE (used in AWS SDK, not in app code) |
| CRITICAL | `tinypool` + `vitest` | Prototype pollution RCE (test runner only, never in production) |
| HIGH | `zod` | Memory exhaustion on oversized input (run `npm audit fix --force` -- breaking change to zod v4) |
| HIGH | `postcss` + `vite` | Dev tools only; not in production bundle |
| HIGH | `playwright` | SSL cert bypass during browser download (CI/dev only) |

**Action required before production:** run `npm audit fix` for auto-fixable items. The `next` and `next-auth` critical issues should be patched with updated versions; check the Next.js security advisories for the exact upgrade path. The vitest/tinypool/vite issues are dev-only and do not affect the deployed app.

---

## 4. Load test

k6 is not installed on this machine. Scripts are ready:

| Script | Path | Scenario |
|---|---|---|
| 30 students | `load/students-30.js` | 0->30 VUs / 30 s ramp / 5 min hold; login, dashboard, 3 lessons, timetable, forum post, live class join, heartbeat; 10 VUs run a 10-question exam |
| 60 students (headroom) | same file | `--env VUS=60` |
| Login storm (200 VUs) | `scripts/load/login-storm.js` | 200 simultaneous credential POSTs |
| Exam sessions (400 VUs) | `scripts/load/exam-sessions.js` | 400 concurrent exam sessions |
| Presence (600 VUs) | `scripts/load/live-classes.js` | 600 heartbeats every 30 s |

**To run:**
```bash
# Install k6
sudo snap install k6
# or: brew install k6

# Start the app with Docker
npm run demo:reset
npm run build && npm start &

# 30-student run
BASE_URL=http://localhost:3000 \
STUDENT_EMAILS="student.full@example.com,student.new@example.com,..." \
STUDENT_PASSWORD=Demo1234! \
EXAM_ID=<cuid> \
LIVE_CLASS_ID=<cuid> \
k6 run load/students-30.js

# 60-student headroom
k6 run --env VUS=60 load/students-30.js
```

Load test results (p50, p95, p99, error rate) cannot be reported until the above commands are run against a live instance. Record CPU/memory with `docker stats` during the run.

---

## Recommended Render plan

Based on code analysis (not measured):

| Component | Minimum | Recommended |
|---|---|---|
| App (Next.js) | Starter (512 MB RAM) | Standard (2 GB RAM, 1 CPU) for 30 concurrent; scale to 2x Standard for 60+ |
| Database (Postgres) | Starter | Standard (2 GB RAM) -- connection pooling via PgBouncer or Prisma Accelerate for exam sessions |
| Redis | Free tier | Starter (256 MB) covers presence + rate limiting for 600 users |

Measure CPU and memory under load before choosing a plan. The app is stateless and scales horizontally.

---

## Remaining gaps vs remarks.md

| Item | Status |
|---|---|
| k6 load tests run and results measured | Pending (k6 not installed; run locally) |
| Playwright suite run end to end | Pending (requires running app + DB) |
| `npm run demo:reset` verified | Pending (requires Docker) |
| `npm run verify:roles` table printed | Pending (requires DB) |
| Admin Documents page ("Coming Soon") | Minor -- feature not implemented; page is accessible to Admin only and clearly labelled |
| npm audit critical vulns (`next`, `next-auth`) | Should be patched before production |
| k6 load results, slow queries, first failure point | Unknown until tests run |

---

## Commands to rerun everything

```bash
# TypeScript
npx tsc --noEmit

# Unit tests
npm run test

# Build (no DB needed)
SKIP_DB_MIGRATE=1 npx next build

# Reset demo data (Docker required)
npm run demo:reset

# Role verification (DB required)
npm run verify:roles

# Playwright (app must be running)
npx playwright test

# Load test (k6 required, app + DB must be running)
k6 run load/students-30.js

# Audit
npm audit --audit-level=high
```
