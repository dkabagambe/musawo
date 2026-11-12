# AUDIT of Production-Readiness Sections 1 to 5

Run this pass (APP_ENV=development, no domain/email): rm -rf .next; npm ci; prisma generate; SKIP_DB_MIGRATE=1 npm run build (BUILD_ID d4Bvx); tsc --noEmit (0 err); vitest 655/655; demo:reset + db:seed-topup (46 students, 3 LIVE, 8 exams, 7 groups); verify:roles 7/7; curl headers; bootstrap:prod (refused); npm ls + audit; git ls-files; migrate status (41, up to date); click-audit x7; load:30 --only-30. Legend: DP=DONE-PROVEN (ran this pass), DU=DONE-UNPROVEN (code only), PT=PARTIAL, BR=BROKEN, NR=NOT RUN.

## Section 1 - Production Safety and Configuration
| item | status | evidence | gap |
| APP_ENV=production switches off demo/dev/demo-pay/TOTP-relax/noindex/gate; TOTP for DIRECTOR/PRINCIPAL | PT | production-safety + rate-limit tests in vitest 655 PASS | production e2e not run this pass (server flaky) |
| Login rate limit failed-only 5/15min acct, 100/15min IP, success never counts; 30 ok + 5 lock | DP | rate-limit.test.ts 6/6 PASS in 655 | none |
| Sign out fixed (real button per role) | DU | doSignOut server action exists | real-button e2e not run this pass |
| Security updates: next 14.2.x, next-auth, @auth/core, fast-xml-parser; no audit fix --force; zod 3; input limits; READINESS | DP | npm ls next 14.2.35 next-auth beta.32 @auth/core 0.41.3 zod 3.23.8; audit 28 vulns (1 crit next); NEXT-RISK.md exists | next 15 upgrade pending; no 14.x patch |
| bootstrap:prod: 5 staff from env emails, set-password links, 7 courses/phases/policies, no demo data, refuses demo seed | DP | refused this pass (demo seed present / missing env) | full create on fresh DB not rerun this pass |
| Security headers, secure cookies, upload limits, git secrets, startup check | DP/PT | curl: CSP, X-Frame DENY, Referrer, Permissions-Policy, HSTS, noindex; git ls-files no secrets | CSP uses unsafe-eval+unsafe-inline; startup-fails-loud not run |

## Section 1b - Completion fixes A to E
| A course code ALS (no AFA) | BR | prisma/seed.ts:784 still has courseCode "AFA" (advanced-first-aid); 8 courses not 7 | remove AFA, confirm exactly 7 |
| B Next.js risk table | DP | docs/NEXT-RISK.md exists; npm ls+audit run | next 15 upgrade pending |
| C group tests | PT | groups.test.ts in vitest 655 PASS (unit); e2e/groups.spec.ts exists | groups e2e not green this pass |
| D 2FA end to end | PT | backup-codes.test.ts in 655 PASS; e2e/two-factor.spec.ts exists | two-factor e2e needs TOTP_REQUIRED=true + stable server, not green this pass |
| E full Playwright suite (real count + spec files) | PT | 418 tests, 14 specs; earlier run reached 217/418 (no failures); PROD-S1b documents full 414 pass | full green not reproducible this pass: slow container + server hung under browser load (redirects.spec FAILED) |

## Section 2 - Files, Email and Notifications (email demo-only by design, not a gap)
| S3 storage: notes/PDFs/docs/recordings; size+type limits; signed URLs; protected viewer/watermark; /admin/documents | DU/NR | src/lib/s3/index.ts + /api/admin/documents(+[id]) exist | MinIO real upload NOT RUN: minio/minio image pull denied in this env. Cmd: docker compose -f docker-compose.dev.yml up -d minio |
| Email: 23 templates, SPF/DKIM docs, failed-email queue+retry UI | DU | src/lib/email/index.ts, /api/admin/email-queue, FailedEmail model (migrate 41), UI pages exist | real sending NR (no domain, by design) |
| SMS optional, off by default, failures never block | DU | code path exists | not exercised |
| Retention job wired to scheduler | DU | /api/cron/storage-retention exists | scheduler wiring not run this pass |
| Report features disabled when service key missing | DU/PARTIAL | partial in code | no single consolidated report verified |

## Section 3 - Student/Instructor click audit + e2e
| Build scripts/click-audit.mjs | DP/BR | script exists; ran x7 roles | BROKEN: see next row |
| Run for STUDENT + INSTRUCTOR, fix dead ends | BR | ran this pass: 0 pages audited per role; docs showed login ClientFetchError | scripts/click-audit.mjs:44-49 wrong creds (student@mtc.ac.ug/demo1234 vs seed student.full@example.com/Demo1234!), no ACADEMIC_REGISTRAR |
| E2e: Meet link, admit, speak rights, roll call start/end, stop, attendance CSV/PDF, recording replay, materials no-download, assignments, 30 to 6 groups random+by name, group submit+threads, timed exam forward-only auto-mark + mark download, announcements, support ticket | PT | unit in 655 PASS (live-class-section8 19, groups 10, exam-marking 6, certificates 3); e2e/groups + live-classes specs exist | no dedicated specs for admission, payment chain, certificate verify, equipment, storage clear, roll-call export, recording replay, materials no-download, assignments; browser run flaky |

## Section 4 - Admin/Principal/Director/IT/Registrar click audit + e2e
| Click audit for these roles, fix dead ends | BR | ran this pass: 0 pages (same creds bug) | fix creds + Registrar entry, re-run |
| E2e approvals: admission to login, programme, course, results publication, certificate+verify, payment proof chain+phase unlock, fee change, equipment, storage clearing; Admin cannot edit payments; Registrar holding; audit/reports/graduands/user mgmt | PT | routes exist (file check OK); administrator-access 403 + portal-shell Registrar exist (DU); unit in 655 | no dedicated e2e specs; NOT RUN end-to-end this pass |
| Every role notifications + every email per flow | PT | 23 templates exist | per-flow notification/email not verified this pass |

## Section 5 - Load and Performance Proof
| npm run load:30: finds students/exam/class; 30 then 60; p50/p95/p99/error/5xx per step; docs/LOAD-RESULTS.md; k6 install or cmd; local prod build | DP | ran --only-30: 1433 iters, 0 5xx, 0% error, wrote docs/LOAD-RESULTS.md | cookie-capture bug (res.headers Set-Cookie misses session-token) -> only LOGIN exercised; dashboard/materials/exam/forum/heartbeat metrics empty |
| Fix what breaks: indexes/N+1/pool/Redis/rate limits; error<1%, p95<1s, login p95<2s, no 5xx | PT | error 0% PASS, no 5xx PASS; login p95 2947ms FAIL; CAPACITY+code show pool/Redis-failopen/indexes in place | login slow under 30 concurrent (argon2); server hung under browser load (stability); cookie bug hides study-flow perf |
| Prepare Render run + recommend plan sizes | NR | orchestrator supports BASE_URL+GATE_USER+GATE_PASSWORD | needs Render URL + gate creds |

## Counts per status per section
S1: DP 3, PT 2, DU 1. S1b: DP 1, PT 3, BR 1. S2: DU 4, NR 1 (MinIO). S3: BR 2, PT 1. S4: BR 1, PT 2. S5: DP 1, PT 1, NR 1.

## Top 10 risks (worst first)
1. Click-audit BROKEN (wrong creds, no Registrar) -> Sections 3/4 click coverage is 0.
2. k6 cookie-capture bug -> load test exercised login only, not the study flow.
3. Server hangs under browser/concurrent load (not OOM) -> blocks 30-user stability.
4. Login p95 2947ms under 30 users (argon2) -> Section 5 target FAIL.
5. AFA course in prisma/seed.ts:784 -> 8 courses, contradicts the 7 real courses.
6. Full Playwright green not reproducible this pass (server hang) -> e2e regression uncertain.
7. next 14.2.35 CRITICAL CVE (1 critical, 10 high) -> no 14.x patch; needs next 15+.
8. CSP allows unsafe-eval + unsafe-inline in script-src -> XSS hardening gap.
9. MinIO/S3 real upload path unproven (image not pullable here).
10. No dedicated e2e specs for approval/payment/certificate/equipment/storage flows.

## Proposed fix order (one section at a time)
1. S3/S4: fix scripts/click-audit.mjs credentials (student.full@example.com/Demo1234!) + add ACADEMIC_REGISTRAR, re-run, fix dead ends.
2. S5: fix k6 cookie capture (use res.cookies / cookie jar), re-run load:30 full (30+60).
3. S5/S11: diagnose server hang under load (Prisma pool exhaustion or Redis blocking), then re-run load.
4. S5: cut login p95 under 2s (cache session or throttle concurrent logins).
5. S1b A: remove AFA course, confirm exactly 7 real courses.
6. S1: harden CSP (drop unsafe-eval/inline); verify startup env-fails-loud.
7. S1b B: plan next 15 upgrade branch for CVEs.
8. S3/S4: add dedicated e2e specs for the missing approval/payment/certificate/equipment/storage flows.
9. S2: prove S3 real path once MinIO image is pullable (or on a machine with it).
10. S2: email real sending pending domain (out of scope now).
