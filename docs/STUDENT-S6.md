# Student S6: My Fees and Access

## What was built

**My Fees page** (`/dashboard/payments`):
- Fee phases displayed (Phase 1: 50% before reporting, Phase 2: 25% mid-course, Phase 3: 25% final) with status per phase: not due, due, submitted (with Admin), with Principal, approved, rejected with reason.
- Payment progress bar showing paid percentage out of total.
- Summary row: total fee, amount paid, remaining (or "Fully paid").
- Payment hold banner for OVERDUE enrolments with reason and "Pay now" link.
- Active claims section tracking each claim through the Admin-Principal-Director chain.
- Transaction history with receipt PDF download for each completed payment.
- "Submit next payment" CTA for outstanding balances.

**Submit Payment page** (`/dashboard/payments/claim`):
- Mobile Money only: MTN MoMo and Airtel Money (no bank transfer or cash options).
- Merchant codes from site settings displayed before the form.
- Fields: course selector, payment method, transaction ID (unique enforced), amount, date/time, payer name, payer phone, optional screenshot (up to 5 MB).
- Duplicate transaction ID rejected with 409 by the API.

**Receipt PDF API** (`/api/payments/[paymentId]/receipt`):
- Students can download their own receipt only; another student's receipt returns 403.
- PDF generated with @react-pdf/renderer: issuer name, student name, registration number, course, amount, method, date and receipt number.

**Playwright tests** (`e2e/student-s6-fees.spec.ts`):
- Fee phases visible for new student; "Fully paid" for completed student.
- Payment hold banner visible for overdue student.
- Claim form shows only MTN and Airtel options; merchant code and ID visible.
- Receipt download returns a PDF file.
- Duplicate transaction ID rejected by the API (409).
- Cross-student receipt isolation: 403 when accessing another student's receipt.
