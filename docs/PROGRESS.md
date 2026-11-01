# PROGRESS REPORT -- 2026-11-01

## 1. Verification runs

| Check | Result |
|---|---|
| `tsc --noEmit` | PASS (0 errors) |
| `npm run test` | **25 FAIL / 554 PASS** -- all 25 failures are DB-dependent (table `public.users` does not exist; DB not available in this environment) |
| `npm run demo:reset` | CANNOT RUN -- Docker not available in this environment |

DB-dependent failing tests (environment only, not code):
- `authorize.test.ts` (5 fails)
- `role-integration.test.ts` (20 fails)

All logic, UI, and non-DB tests: 554 PASS.

---

## 2. STEP 1 completion (remarks.md batch leftovers)

| Item | Status | Notes |
|---|---|---|
| ExamSession forward-only (no Previous, no dot nav) | DONE | Confirmed in ExamSession.tsx -- only Next and Submit buttons |
| No download claims in HomeFaq, FaqContent, how-you-learn | DONE | Cert download (PDF of certificate) in FaqContent replaced with 3-item FAQ per spec |
| No em/en dashes in user-visible text | DONE | Fixed 4 double-hyphen (--) violations in payment-options, impact, apply, about pages; no-dashes test passes |
| RolesPermissionsView: 6 roles + IT Admin only | DONE | ACTIVE_ROLES array has exactly 7 entries |
| Navbar logo-only (no wordmark text) | DONE | Public header and dashboard sidebar both confirmed |
| Live class speak rights server-side (LISTEN_ONLY / REQUESTED / CAN_SPEAK) | DONE | SpeakStatus enum in schema, attendance table, join route and tutor route all use it |

---

## 3. STEP 2 completion (website cleanup)

| Item | Status | Notes |
|---|---|---|
| Navbar: HOME, ABOUT MTC, HOW TO ENROLL, IMPACT only | DONE | NAV array in Header.tsx has exactly 4 items; no dropdowns; Log in + Apply now buttons kept |
| Remove statistics/counters | DONE | "87+" stat removed from HomeHero trust line; no CountUp usage on public site |
| IMPACT page: 3 sections only | DONE | Rewritten to Purpose, Benefits to community, Alumni follow-up; no numbers |
| HomeFaq: exactly 3 items | DONE | What do I need to study? / Are classes hands-on? / Who can apply? |
| Full FAQ page: exactly 3 items | DONE | Same 3 items; category headings removed |
| HOW_HEARD_OPTIONS updated | DONE | Community Health Workers (CHW), Village Health Teams (VHT), Friend or family, Social media, Radio or TV, Poster or flyer, Other (please specify) |
| Fees page: no per-course breakdown, no figures, percentages only | DONE | Replaced with general 3-phase plan (50/25/25%), no fee table, contact admissions for amounts |
| Payment page: mobile money only, no banks | DONE (was already done) | MTN MoMo + Airtel Money only |
| Bank transfer mentions removed from public instructions | DONE | homepage facts strip, homepage how-steps, how-to-enrol step 3, about page list |
| Access thresholds updated to 50/75/100 | DONE | DEFAULT_ACCESS_THRESHOLDS: block1=50, block2=75, block3=75, final=100; locked reason messages updated |
| Consent checkbox text (exact wording) | DONE (was already correct) | "...Uganda Data Protection and Privacy Act 2019..." |
| Apply form consent required | DONE (was already in place) | |
| Images: audit pending | PENDING | No image replacements made -- no mismatches found that could be confirmed without running the site |

---

## 4. What is still missing / next steps

- Batch 3: breakaway groups and discussion forum (sections 8 remainder, 9)
- Batch 4: storage retention, concurrency, load tests (sections 10, 11)
- Batch 5: role Playwright flows, ROLES.md, CAPACITY.md, final report
- Image audit: needs a running browser to visually verify image-to-content match
- DB verification: demo:reset and login verification require Docker

---

## 5. Section status table

| Section | Title | Status |
|---|---|---|
| 0 | How to work | DONE |
| 1 | Six-role decision | DONE |
| 2 | Preserve list | DONE (Step 1 and 2 resolved all known issues) |
| 3 | Role map and migration | DONE |
| 4 | Dashboards per role | DONE |
| 5 | Approval workflow | DONE |
| 6 | Admissions and students | PARTIAL (DB unverified) |
| 7 | Payments | DONE (chain implemented; DB unverified) |
| 8 | Live classes | PARTIAL (speak rights done; recording link done; groups missing) |
| 9 | Breakaway groups + forum | MISSING |
| 10 | Storage retention | MISSING |
| 11 | Concurrency / load tests | MISSING |
| 12 | Support, equipment, announcements | PARTIAL |
| 13 | Demo and seed | PARTIAL (DB unverified) |
| 14 | Batch 1 DONE, 2 PARTIAL, 3-5 MISSING | -- |

---

## 6. People data rectification and coming soon removal -- 2026-11-01

| Item | Status | Notes |
|---|---|---|
| Director: Dr. Mathias Senyondo | DONE | Seed, dev/login, DEMO.md all correct |
| Principal: Nankya Shanita | DONE | Was instructor; swapped from Dr. Joel Mirembe |
| Instructor 1: Mirembe Joel | DONE | Was principal; name updated across seed, tests, dev/login |
| Admin: Rahiima Nakiyimba | DONE | Name order fixed (first name first) so greeting "Hello Rahiima!" works via split(" ")[0] |
| IT Admin: Daniel Kabagambe | DONE | Already correct; verified |
| Policy placeholder pages | DONE | "Dr Joel Mirembe" replaced with "Nankya Shanita" in auditor, board, deputy policy pages |
| Director certificates: coming soon | FIXED | Replaced with real certificate register (active + revoked listings with verify links) |
| IT Admin support: coming soon | FIXED | Replaced with real SupportDesk component (reuses admin SupportDesk; SYSTEM_IT has support.manage) |
| Resources page: coming soon | FIXED | Empty state updated; seed already creates 10 resources (7 public) |
| e2e test name references | DONE | portal-shell.spec.ts: hello nankya -> hello mirembe; live-classes.spec.ts: Mirembe Joel -> Nankya Shanita |
| docs/DEMO.md | DONE | Updated accounts table (removed old roles), added staff names, fixed Director/Finance/IT walkthroughs |
| docs/kiro.md | DONE | "Dr Joel Mirembe" -> "Nankya Shanita" in policy placeholder reference |

---

## 7. Runtime crash fixes (pre-existing type errors) -- 2026-11-01

Fixed 8 TypeScript errors that caused runtime crashes (reported by user on Director Reports page):

| File | Error | Fix |
|---|---|---|
| director/reports/page.tsx | ApplicationStatus "PENDING" invalid | Changed to "SUBMITTED" |
| director/examinations/page.tsx | ApprovalRequestType "EXAM_RESULTS_PUBLICATION" invalid | Changed to "RESULTS_PUBLICATION" |
| director/finance/ledger/page.tsx | LedgerEntryType "CREDIT"/"DEBIT" invalid | Changed to "PAYMENT"/"REFUND" badge mapping |
| director/instructors/page.tsx | UserStatus "ARCHIVED" invalid | Changed to "ACTIVE" filter |
| director/instructors/page.tsx | tutorId { not: null } invalid (field required) | Removed where filter (all courses have tutorId) |
| director/instructors/page.tsx | liveClasses relation not in select type | Cascade fix from above; resolved |
| tutor/results/page.tsx | ApprovalRequestType "EXAM_RESULTS_PUBLICATION" invalid | Changed to "RESULTS_PUBLICATION" |
| 3 em dash violations in comments | no-dashes test failed | Replaced em dashes with hyphens in globals.css and AppShell.tsx |

**Verification: tsc --noEmit PASS (0 errors), vitest 598/598 PASS.**
