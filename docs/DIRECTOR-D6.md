# D6 - Finance and Payment Approvals

## Completed

**Finance overview (`/director/finance`)**
- Period selector: Last 30 days, 90 days, 1 year, All time. All queries respect the period.
- Pending approval panel: payment proofs, fee changes, waivers, refunds awaiting the Director - with aging colours (amber at 3 days, red at 7 days), chain shown (Admin, Principal, Director), direct Review link to `/director/approvals/[id]`. No link to any removed route.
- Key figures: Revenue collected (from COMPLETED payments), Outstanding (sum of totalAmountUgx - paidAmountUgx for non-terminal enrolments), Total fees billed, Refunds/waivers approved.
- Revenue by payment method: bar breakdown with UGX amounts and percentages for MTN MoMo, Airtel Money, Bank transfer.
- Collected vs outstanding table by enrolment phase (Active, Partial, Overdue, Pending, Completed) with totals row.
- Monthly revenue table with inline bar chart.
- Recent finance decisions table (last 10).
- Recent payments table with method, phase %, status.
- Export CSV button (GET `/api/director/export/payments`).

**All payments (`/director/finance/payments`)**
- Search by student name, filter by status and payment method, pagination (40 per page).
- Table columns: Student (links to `/director/students/[id]`), Programme, Amount, Method, Phase %, Reference (tx ID or gateway ref), Status, Approval (badge linking to `/director/approvals/[id]`), Date.
- Fraud-flagged rows highlighted.
- Export CSV button (passes current filters).

**Finance approvals (`/director/finance/approvals`)**
- Two tabs: Pending and Recent decisions.
- Pending: each item shows type, status, amount, age, reason, full chain (Admin, Principal, Director), direct Review and decide link.
- Payment proof items include an Automatic checks panel: method, tx ref, duplicate tx ID flag (checked against all existing payments), proof image attached status, fraud flag.
- History tab: paginated table of decided items with type, initiator, amount, decision, decider, date.

**Export route (`/api/director/export/payments`)**
- Respects status, method, q, period filters. Max 10,000 rows. Audit-logged as BULK_EXPORT. Returns 403 for roles without `payments.export`.

## Verified

- `npx tsc --noEmit --skipLibCheck`: 0 errors in `src/`
- Playwright test: `e2e/director-d6.spec.ts` (15 tests)
  - NOT RUN (requires production build + seeded database)
  - Command: `npm run build && npm start` then `npx playwright test e2e/director-d6.spec.ts`
