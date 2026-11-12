# PROD-S5: LOAD AND PERFORMANCE PROOF

Built: `npm run load:30` (scripts/load-30.ts) checks k6, starts a local production server if needed, discovers seeded students + a PUBLISHED exam + a LIVE class from the DB (runs db:seed-topup if the 30-student cohort or a LIVE class is missing), runs k6 at 30 then 60 users, prints per-step p50/p95/p99/error/5xx and writes docs/LOAD-RESULTS.md with a verdict. Render gate via GATE_USER/GATE_PASSWORD. Rewrote load/students-30.js: fixed 3 bugs (login sends `identifier` not `email`; forum POST /api/forum with courseId+title+body; join POST /api/{id}/join), added per-step metrics and handleSummary JSON. Targets as thresholds: error rate <1%, page p95 <1s, login p95 <2s, no 5xx.

Verified here: tsc --noEmit PASS; k6 inspect PASS (scenario + thresholds parse); vitest 654 pass / 1 fail (role-integration DIRECTOR DB-connect timeout, environment only; my files are not imported by any test); orchestrator smoke run loads, detects k6, exits cleanly at the server check.

NOT RUN (needs k6 run + database; run yourself): k6 load 30 then 60 users (`npm run load:30`); Render staging run (send BASE_URL + GATE_USER + GATE_PASSWORD); Playwright (needs DB + production build).

Fix-what-breaks: indexes, rate limits, Redis fail-open and the Prisma connection pool are in place (docs/CAPACITY.md, verified). Run-driven fixes and the plan-size recommendation depend on the k6 output; update on first run.
