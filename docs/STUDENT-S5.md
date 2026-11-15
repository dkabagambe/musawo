# S5: Examinations, My Results, Certificates

## What was done
- **Exams** (/dashboard/exams): schedule with start time, duration, course, status.
  Payment-phase locking with exact reasons. Waiting room countdown before start.
  Forward-only questions (server-enforced), per-question timer, autosave, tab-switch
  logging, 5/1 min warnings, auto-submit, instant marking, one active session,
  attempt limit. "Upcoming exam" To Dos link to the exact exam.
- **Results** (/dashboard/results): only published results (releasedAt set).
  Per-course marks, letter grade, tutor comments, Pass/Fail chips.
  Printable results statement PDF (own data only).
- **Certificates** (/dashboard/certificates): eligibility checklist per course
  (lessons, exams, attendance 70%, fees 100%). Issued certs with PDF download,
  QR code, public verify link. Revoked certs show as revoked.

## Changes
- Exams: page.tsx, [id]/page.tsx, ExamSession.tsx, ExamWaitingRoom.tsx (new).
- Results: page.tsx, api/results/statement (new route + PDF component).
- Certificates: page.tsx, api/certificates/[uniqueId]/download/route.tsx.
- Verify: /verify/[certId]/page.tsx (added QR code).
- API: approvals route releases GradeEntry rows + notifies students.
  Gradebook returns only published grades. Seed adds grade entries with comments.
- Schema: GradeEntry.comments field added (migration 20261116010000).
- Package: @react-pdf/renderer upgraded 4.1.6 to 4.9.0 (fixes unitsPerEm bug).

## Tests
`npx playwright test e2e/student-s5-exams-results-certs.spec.ts`
9 passed. Covers locked exams, published results with comments, letter grades,
PDF downloads, certificate verify, forward-only server enforcement.
