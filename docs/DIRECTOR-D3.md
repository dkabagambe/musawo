# D3 - Approvals

## Completed

**Approvals list (`/director/approvals`)**
- Filtered to Director-authorised types only: ACADEMIC_PROGRAMME_CHANGE, COURSE_CHANGE, RESULTS_PUBLICATION, CERTIFICATE_ISSUANCE, PAYMENT_PROOF, EQUIPMENT_REQUEST, ROLE_ASSIGNMENT, FEE_CHANGE, WAIVER, REFUND.
- Excluded from Director view: ADMISSION (Principal decides), MARKS_CHANGE (Principal decides), STORAGE_CLEARING (Director notified only).
- Pending tab sorted oldest first; other tabs newest first.
- Aging colours on pending items: amber after 3 days, red after 7 days.
- Readable type labels (e.g. "Payment proof" not "PAYMENT_PROOF").
- Status badges: "Waiting", "In review", "Approved", "Applied", "Rejected".
- Reviewer chain shown when a Principal forwarded the item.
- Pending count badge matches layout sidebar badge (same query and filter).

**Approval detail (`/director/approvals/[id]`)**
- Full request details: type (with icon), date and age, requester and role, student with registration number, course/programme, amount, reason, and evidence link.
- Reviewer chain with dates.
- Decided banner shows who decided, when, and the decision note.
- High-risk warning shown for PAYMENT_PROOF, FEE_CHANGE, WAIVER, REFUND, ROLE_ASSIGNMENT, RESULTS_PUBLICATION, CERTIFICATE_ISSUANCE.
- Warning shown if the type is not normally a Director decision.

**DirectorDecisionForm (new, `src/app/(director)/director/approvals/[id]/DirectorDecisionForm.tsx`)**
- Three actions: Approve, Reject, Send back for changes.
- Comment required (minimum 5 characters) for all three.
- Handles `REAUTH_REQUIRED` response by redirecting to `/director/reauth?next=...`.
- Self-approval guard: form is replaced with a warning when `initiatorId === currentUserId`.

**PATCH /api/approvals/[id] additions**
- SEND_BACK action: sets status to REJECTED, prefixes note with "[Sent back for changes]", writes APPROVAL_REJECTED audit with `sentBack: true` metadata, sends email and in-app notification to initiator.
- requireRecentTotp gate: called for DIRECTOR role on high-risk types before the decision. Returns `{ error, code: "REAUTH_REQUIRED" }` with HTTP 403 when re-auth is needed.

**Audit log**
- Every decision step writes to audit_logs: APPROVAL_FORWARDED, APPROVAL_APPROVED, APPROVAL_REJECTED, APPROVAL_APPLIED.
- SEND_BACK writes APPROVAL_REJECTED with `metadata.sentBack = true`.
- Side-effects each write their own audit entry (PAYMENT_CLAIM_VERIFIED, GRADE_RELEASED, CERTIFICATE_ISSUED, etc.).

**Initiator notification on rejection/send-back**
- Existing email via `approval-decision` template.
- New in-app Notification with type APPROVAL_SENT_BACK.

## Verified

- `npx tsc --noEmit --skipLibCheck`: 0 errors in src/
- Playwright test: `e2e/director-d3.spec.ts`
  - NOT RUN (requires production build + seeded database)
  - Command: `npm run build && npm start` then `npx playwright test e2e/director-d3.spec.ts`
