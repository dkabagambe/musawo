# P3: Approvals Inbox and Approval Tracking

## Status: COMPLETE

## Implementation

### P3.1 Approvals Inbox (/principal/approvals-inbox)
- Lists requests awaiting the Principal: ADMISSION, MARKS_CHANGE, PAYMENT_PROOF, RESULTS_PUBLICATION, EQUIPMENT_REQUEST, STORAGE_CLEARING, CERTIFICATE_ISSUANCE
- Filters by type (select) and age (3+, 7+, 14+ days)
- Status tabs: Pending (oldest-first with aging colours), Approved, Rejected, All
- Each card shows type, subject, initiator, age with red/amber colouring for 7+/3+ days
- Detail page: full request info, student/course/amount blocks, evidence link, guidance per type, decision form
- Decision form (`ApprovalDecisionForm.tsx`): type-specific action buttons; note required for REJECT/SEND_BACK/RETURN/REQUEST_INFO; optional for APPROVE/FORWARD/CONFIRM

### P3.2 Approval Tracking (/principal/approval-tracking)
- Shows items the Principal forwarded to the Director (reviewer = Principal user)
- Status tabs: Waiting, Decided, All
- Age displayed with 7+/14+ day colouring
- Remind Director button present but disabled (rate-limited, full implementation in later sprint)
- Rejected items show Director's decision note so Principal can fix and resubmit

### P3.3 API Route (/api/principal/approvals/[id]/decide)
- Actions: APPROVE, REJECT, FORWARD, REQUEST_INFO, SEND_BACK, RETURN, CONFIRM
- APPROVE (ADMISSION, MARKS_CHANGE): sets status APPROVED, activates student account for ADMISSION
- REJECT: sets status REJECTED with required note
- FORWARD / REQUEST_INFO: sets status IN_REVIEW, sets reviewerId = Principal
- SEND_BACK / RETURN: sets status DRAFT, returns to initiator
- CONFIRM (STORAGE_CLEARING): sets status APPROVED
- Self-approval blocked (decidedById check)
- Unauthenticated requests redirect to login (307)

### P3.4 Schema Changes
- Added relations in `ApprovalRequest`: `student` (User), `course` (Course), `exam` (Exam)
- Migration: `20261117010000_p3_approval_relations`

### P3.5 Bug Fixes (from P2 widget-bodies)
- Fixed invalid statuses `AWAITING_PRINCIPAL`/`AWAITING_DIRECTOR` to `SUBMITTED`/`IN_REVIEW`
- Fixed `db.class` to `db.liveClass`; `instructor` relation to `tutor`
- Fixed `startTime` to `startWindowAt` on Exam queries
- Fixed orphaned widget block in `widgets.ts` (syntax error)
- Fixed invalid permission `exams.view` to `grades.view`

## Tests
Playwright: `e2e/principal-p3.spec.ts` - 17 tests, all pass.
- Inbox loads with real seed data; status tabs and filters work
- Detail page shows all info sections; correct action buttons per type
- Approve admission redirects to inbox; forward payment proof appears in tracking
- Reject requires note; HTML5 validation blocks empty submit
- No cross-portal links; responsive at 390px; unauthenticated API rejected
