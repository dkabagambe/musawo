# D5 - Examinations, Certificates, Graduates

## Completed

**Examinations (`/director/examinations`)**
- Summary row: total exams, total submissions, overall pass rate, count of results awaiting approval.
- Pending RESULTS_PUBLICATION approvals panel: exam title, submitter, reviewer chain, age (amber at 3 days, red at 7 days), status badge, direct Review link to `/director/approvals/[id]`.
- Filters: course, exam status (DRAFT, PUBLISHED, ARCHIVED), pagination (30 per page).
- Per-exam table: title, course, question count, submission count, computed pass rate (coloured green/red vs the exam's passPercent threshold), average score, status.
- Director cannot edit marks (no edit button exists). Results become visible to students only after Director approves the RESULTS_PUBLICATION request.

**Certificates (`/director/certificates`)**
- Three tabs: Eligibility, Issued, Revoked.
- Eligibility tab: paginated list of enrolled students with per-row checklist (fees 100%, attendance >= 75%, all released exams passed). "Eligible: Yes/Not yet" column. If a CERTIFICATE_ISSUANCE approval is pending for a student, shows a "Pending approval" badge linking to `/director/approvals/[id]`. Summary counts (eligible, already issued, not yet eligible).
- Issued tab: certificate register with name, student number, programme, cert number (links to `/verify/[id]`), issued date. Filtered by programme and student name.
- Revoked tab: revoked certificates with revocation date and reason.
- Certificate approval and revocation go through the approval flow (no direct approve/revoke buttons on this page).

**Graduates (`/director/graduates`)**
- Paginated table (40 per page) with search by name, programme filter, year filter, revoked-only toggle.
- Year breakdown chips (graduation counts by year, clickable as quick filters).
- Graduate name links to `/director/students/[id]`.
- Verify link on each row to public `/verify/[id]`.
- Export CSV button: GET `/api/director/export/graduates` - returns CSV, writes BULK_EXPORT audit log, 403 for non-directors.

**Export route (`/api/director/export/graduates`)**
- Respects same filters as the page (q, course, year, revoked). Max 5000 rows. Audit-logged.

## Not built
- PDF export: no PDF generation library (pdfkit, puppeteer) is installed. PDF is marked as future work.
- Log book signed / practicals signed-off eligibility checks: no PracticalSession sign-off model exists in the schema. Checklist shows fees, attendance, and released exam results.

## Verified

- `npx tsc --noEmit --skipLibCheck`: 0 errors in `src/`
- Playwright test: `e2e/director-d5.spec.ts` (15 tests)
  - NOT RUN (requires production build + seeded database)
  - Command: `npm run build && npm start` then `npx playwright test e2e/director-d5.spec.ts`
