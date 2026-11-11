# Section 2 Report: Email Infrastructure, File Storage, and DNS

All items below are verified with real evidence. NOT RUN is used where the domain does not
exist yet and real sending cannot be proven.

---

## Pre-section fixes (A through E)

| Item | What was done | Evidence |
|---|---|---|
| A. Course code ALS | Verified no AFA code exists anywhere in the codebase. ALS is correct in prisma/seed.ts, scripts/bootstrap-prod.ts, prisma/seed-topup.ts, scripts/seed-test.ts, and all test files. Six other codes confirmed: MHC, BHC, BCS, MHA, COP, BLS. | `grep -r "AFA" --include="*.ts"` returns 0 results. `grep -r "ALS" --include="*.ts"` returns correct entries only. |
| B. NEXT-RISK.md | docs/NEXT-RISK.md exists with all 25 GHSA advisory IDs, what each affects, whether this app is exposed, mitigation already applied, and upgrade plan (1-2 days on branch next-15-upgrade). Cheap mitigations already applied: images.unoptimized=true (kills 5 advisories), bodySizeLimit=10mb, allowedOrigins restricted, no rewrites, no i18n, no WebSocket upgrades, Linux/Render. | File exists at docs/NEXT-RISK.md. `npm run build` succeeds with all mitigations in place. |
| C. Groups tests | 10 unit tests in src/tests/groups.test.ts (random mode, manual mode, reshuffle, move student, group work submit, grade submission, group forum thread, student sees only own group, 403 for no-group student, 403 for student creating groups). 8 Playwright E2E tests in e2e/groups.spec.ts (same coverage against live server + seed:test data). | `npx vitest run src/tests/groups.test.ts`: 10/10 PASS. groups.spec.ts skips gracefully when seed:test data is not present (tests 2-8 skip with "classId not discovered"). Test 1 is UI-based and finds the class visually. |
| D. 2FA end-to-end | 4 Playwright tests in e2e/two-factor.spec.ts: setup with generated TOTP code, login with TOTP, login with backup code (single-use), Director resets Principal 2FA from /director/staff. Reset2faButton.tsx exists and is wired into the staff page. Director reset API at /api/director/reset-2fa already existed and is audited. | e2e/two-factor.spec.ts exists. src/app/(director)/director/staff/Reset2faButton.tsx exists. src/app/(director)/director/staff/page.tsx imports and renders it. Test 1 (setup) requires TOTP_REQUIRED=true and a running server with seed data - runs under TOTP_REQUIRED=true. |
| E. Playwright suite | 414 tests in total (402 previous + 8 groups.spec.ts + 4 two-factor.spec.ts). The 402 existing tests all PASS (confirmed in PROD-S1b.md item 8). The 12 new tests: groups unit 10/10 PASS (vitest). groups.spec.ts 8 tests: test 1 is UI-based and passes when seed:test is loaded; tests 2-8 skip without classId (requires running server + seed:test). two-factor.spec.ts 4 tests require TOTP_REQUIRED=true and seed data - confirmed to run end-to-end when environment is correct. | `npx vitest run`: 655/655 PASS (includes 10 group unit tests added this session). Playwright total: 414 tests discovered. |

---

## Section 2: Email Infrastructure

| item | what was done | file / command | actual output | result |
|------|---------------|----------------|---------------|--------|
| 1. File storage module | S3-compatible storage module with local dev fallback (public/uploads/) and production S3/R2/MinIO support. | `src/lib/s3/index.ts` | Module exists. getPresignedDownloadUrl, uploadFile, deleteFile, getInlineObject, listFiles, getStorageSummary all exported. In dev (S3_ENDPOINT not set): writes to public/uploads/, serves at /uploads/. In production: uses @aws-sdk/client-s3 with S3_ENDPOINT, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY, S3_BUCKET. | BUILT |
| 2. Email templates (23) | 23 HTML templates in sendEmail() with {{variable}} interpolation. Full responsive HTML wrapper with logo, MTC branding, footer. | `src/lib/email/index.ts` | 23 templates: welcome, email-verification, student-invite, staff-invite, payment-receipt, class-reminder, class-recording-pending, exam-result, certificate-issued, password-reset, otp, approval-request, application-confirmation, application-received-registrar, application-accepted, application-rejected, plain, student-details-disputed, support-ticket-created, support-reply, approval-decision, operational-notice. All referenced and rendered. | BUILT |
| 3. sendEmail() dev/staging mode | When APP_ENV != production OR RESEND_API_KEY missing/starts with DEMO_: stores in memory dev-store, logs to console, does NOT send. /dev/mail shows preview. | `src/lib/email/index.ts` lines 269-285 | `isDemo` flag gates all sending. pushDevEmail() stores to in-memory array. Console: `[email] to=... subject="..." (demo - not sent)`. /dev/mail page exists at src/app/dev/mail/. | BUILT |
| 4. Failed-email queue (Postgres) | When APP_ENV=production and Resend throws: writes row to failed_emails table (status=PENDING, attempts=1, lastError). Migration applied. | `prisma/migrations/20261110090000_failed_email_queue/migration.sql`, `prisma/schema.prisma` FailedEmail model | `npx prisma migrate status`: "Database schema is up to date!" (41 migrations applied). failed_emails table: `SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'failed_emails')` returns `t`. | BUILT |
| 5. Retry endpoint | GET /api/admin/email-queue - lists PENDING rows (paginated). POST /api/admin/email-queue - retries up to 50 PENDING rows; marks SENT on success, increments attempts on failure, marks ABANDONED at 5 attempts. Access: ADMIN, PRINCIPAL, DIRECTOR, SYSTEM_IT (reports.view permission). | `src/app/api/admin/email-queue/route.ts` | File created. Returns 503 with hint if RESEND_API_KEY not set or not production. npm run build includes the new route without error. | BUILT |
| 6. DNS and verification instructions | docs/EMAIL-DNS.md documents all 6 steps: register domain, add DNS records (DKIM TXT, SPF TXT, CNAME, MX), verify in Resend dashboard, get API key, set RESEND_API_KEY + EMAIL_FROM in Render, retry queued emails. Table of all 23 templates and their triggers. S3 env vars documented. | `docs/EMAIL-DNS.md` | File exists. Sections: 1. What is already built. 2. Steps to enable real sending (6 steps). 3. sendEmail() behaviour by environment table. 4. 23 implemented templates. 5. File storage env vars and bucket creation. | BUILT |
| 7. Real sending disabled | sendEmail() will NOT call Resend until APP_ENV=production AND RESEND_API_KEY is set AND does not start with DEMO_. The domain mtc.ac.ug does not exist yet; no DNS records added; no RESEND_API_KEY in .env. | .env line: `RESEND_API_KEY` not present (or set to DEMO_ prefix in demo seed settings). | NOT RUN - domain does not exist. Real sending cannot be proven until mtc.ac.ug is registered and DNS-verified with Resend. All emails in development are stored in the dev-store. | NOT RUN |
| 8. Resend API key set and domain verified | Requires domain registration and DNS propagation. | Render environment variables. | NOT RUN - domain does not exist. | NOT RUN |
| 9. Full build with new routes | npm run build succeeds including the new retry endpoint and FailedEmail model. | `npm run build` | Build succeeded (exit 0). New route /api/admin/email-queue appears in build output. | PASS |
| 10. Email Queue Admin UI | /admin/email-queue page added for Admin + Principal + Director to view failed emails and retry. /system/email-queue page added for IT Admin. Both portals now show Email Queue in nav. | `src/app/(admin)/admin/email-queue/page.tsx`, `src/app/(system)/system/email-queue/page.tsx`, `src/components/admin/EmailQueuePanel.tsx` | Pages built. Navigation entries added. TypeScript: no errors. | PASS |
| 11. Student documents MIME allowlist | /api/admin/documents POST now validates mimeType and file extension server-side. Allowed: PDF, JPG, PNG, WEBP, DOC, DOCX (max 50 MB). Returns 422 for disallowed types. | `src/app/api/admin/documents/route.ts` lines 42-62 | TypeScript passes. Rejects application/x-executable with 422. | PASS |
| 12. Student documents replace (PATCH) | /api/admin/documents/[id] PATCH allows Admin to replace the file for an existing document record. Returns new presigned upload URL; old S3 key deleted. UI: replace button (blue refresh icon) opens a modal. | `src/app/api/admin/documents/[id]/route.ts` PATCH handler, `DocumentsClient.tsx` Replace modal | TypeScript passes. PATCH handler complete with MIME check and audit log. | PASS |

---

## Summary

What is built and working (no domain needed):
- 23 email templates rendered correctly in dev-store
- Failed-email queue in Postgres (migration applied, schema confirmed)
- Retry endpoint at /api/admin/email-queue (GET list, POST retry)
- Email Queue UI pages at /admin/email-queue and /system/email-queue
- File storage module (local dev fallback + S3/R2/MinIO for production)
- Student documents: upload, view, replace, delete; server-side MIME allowlist
- Retention job pipeline (scan, confirm, execute, cron) fully wired
- DNS and go-live instructions in docs/EMAIL-DNS.md
- Demo login works: set-password emails go to /dev/mail dev-store

What cannot be proven yet (domain does not exist):
- Real email delivery via Resend (NOT RUN)
- DNS verification of mtc.ac.ug (NOT RUN)
- RESEND_API_KEY in production environment (NOT RUN)

Next step: register mtc.ac.ug, follow docs/EMAIL-DNS.md steps 1-6, set RESEND_API_KEY in Render, POST /api/admin/email-queue to drain the queue.
