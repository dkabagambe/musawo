# S5 & S6 Implementation Plan

## Overview
Implementing S5 (Examinations, Results, Certificates) and S6 (My Fees and Access Control) in a single comprehensive commit with full E2E test coverage.

---

## S5: Examinations, Results, Certificates

### 5.1 Student Exam List Page
**Route**: `/dashboard/exams`

**UI**:
- Header: "My Exams"
- Status filters: All, Upcoming, Available, Completed
- Exam cards showing:
  - Exam title + course name
  - Block number (e.g., "Block 1 Final Exam")
  - Status badge: LOCKED (red), AVAILABLE (green), IN_PROGRESS (blue), PASSED (green ✓), FAILED (red ✗)
  - Timer icon if exam has time limit
  - Attempts: "Attempt 1 of 2"
  - Grade if passed/failed: "Score: 85/100 (85%) - PASSED"
  - Action buttons:
    - If AVAILABLE: "Start Exam" button
    - If IN_PROGRESS: "Resume Exam" button (blue)
    - If LOCKED: Lock icon + unlock reason ("Pay 100% to access this exam")

**Exam list logic**:
1. Query all exams for courses user is enrolled in
2. Filter by status=PUBLISHED (live exams only)
3. For each exam:
   - Check access via `canAccess(resource: {type: "exam", blockOrder: exam.block.order}, enrolment)`
   - Get latest attempt: `ExamAttempt.findFirst({examId, userId, status: "MARKED"})` for final score
   - Get in-progress: `ExamAttempt.findFirst({examId, userId, status: "IN_PROGRESS"})`
   - Determine display status:
     - IN_PROGRESS (resume)
     - MARKED + passed=true (passed)
     - MARKED + passed=false (failed)
     - MARKED + number < attemptLimit (failed, can retake)
     - number >= attemptLimit + passed=false (failed, no more attempts)
     - No attempts yet (available to start)

**Sorted by**: Block order ascending, then exam title

---

### 5.2 Exam Taking Page (Forward-Only Interface)
**Route**: `/dashboard/exams/[examId]`

**Entry point logic**:
1. Load exam details: title, instructions, timeLimitMin, perQuestionSec, attemptLimit, currentAttemptNumber
2. Click "Start Exam" → POST `/api/exams?action=start` with `{examId}`
   - Returns: `attemptId`, `questions` (Q1-QN in attempt order), `timeLimitEndsAt`, `perQuestionSec`, `questionDeadlineAt`, `currentQuestionIndex`
3. UI transitions to exam interface

**Exam Interface**:
- **Header bar**:
  - Exam title + "Attempt X of Y"
  - Timer displays:
    - Total time remaining (MM:SS, red at <5min)
    - Per-question timer if applicable (MM:SS, yellow at <30s)
  - Tab-switch warning: "⚠ Switching tabs is tracked" (grey text)
  - Exam instructions button (modal)

- **Question display**:
  - "Question X of N" header
  - Question text (formatted)
  - For MCQ:
    - Radio buttons with 4-5 options
    - Each option: `{id: string, text: string}`
  - For TRUE_FALSE:
    - 2 radio buttons: "True" / "False"
  - For SHORT_ANSWER:
    - Textarea (2 rows, max 500 chars with counter)
  - Explanation button (shows after selecting an answer): tooltip with tutor explanation

- **Navigation**:
  - "Next question" button (or "Next" if last question shows "Submit")
  - After answering current question: POST `/api/exams?action=answer` with `{attemptId, questionId, answer, index}`
    - Server validates forward-only, time limits
    - Returns: `{ok, currentQuestionIndex, finished, questionDeadlineAt}`
    - UI increments to next question (disable "Previous" button)
  - If timeout or question deadline expires:
    - Disable answer button
    - Show: "Time expired for this question. Moving to the next..."
    - Auto-advance after 2s

- **Submit screen** (last question):
  - "Review your answers" summary:
    - List all Q numbers with "Answered ✓" or "Skipped ⚠"
    - No ability to revisit/change (forward-only enforced)
  - "Submit exam" button (red, prominent)
  - On click: POST `/api/exams?action=submit` with `{attemptId}`
    - Returns: `{score, maxScore, percentage, passed, needsTutorReview, breakdown}`
    - Shows result screen

- **Result screen**:
  - "Exam Submitted Successfully" (green checkmark)
  - Score display: "Your Score: 85/100 (85%)"
  - Pass/Fail badge: "PASSED ✓" (green) or "FAILED ✗" (red)
  - If passed: "Congratulations! You passed this exam."
  - If failed + attempts remaining: "You have 1 more attempt remaining. Try again?"
  - If failed + no attempts: "You've used all your attempts for this exam."
  - If short-answer to review: "⏱ This exam includes short-answer questions. Your tutor will review and provide feedback."
  - "View results" button → navigates to `/dashboard/results/[examId]`
  - "Back to my exams" button

- **Responsive**:
  - Mobile (360px): Full-width layout, timer stacked vertically
  - Desktop (1440px): Side-by-side timer + question

**Tab-switch tracking**:
- On visibility change (blur/focus): POST `/api/exams?action=tab-switch` with `{attemptId}`
- UI shows non-blocking warning on each switch (yellow toast): "⚠ Tab switches are tracked"

---

### 5.3 Exam Results Page
**Route**: `/dashboard/results` and `/dashboard/results/[examId]`

**List page** (`/dashboard/results`):
- Header: "My Results"
- Status filters: All, Passed, Failed, Pending Review
- Cards for each exam attempt:
  - Exam title + course name
  - Attempt: "Attempt 1 of 2"
  - Score: "85/100 (85%)"
  - Badge: "PASSED ✓" (green) or "FAILED ✗" (red) or "PENDING REVIEW ⏱" (grey)
  - Date submitted
  - "View details" button

**Detail page** (`/dashboard/results/[examId]`):
- Exam title + course + block info
- **Top section**:
  - Score display: "Your Score: 85/100 (85%)"
  - Pass/Fail badge
  - Submitted date + time
  - Attempt indicator: "Attempt 1 of 2" with link to previous attempts if any
  - If PENDING REVIEW: "⏱ This exam is being reviewed by your tutor. Check back soon for feedback."

- **Question breakdown**:
  - For each question:
    - Question text (truncated, expandable)
    - Your answer (shown)
    - For MCQ/T-F: Correct answer display
    - Points: "3/3 ✓" (green) or "0/3 ✗" (red)
    - If SHORT_ANSWER: "Awaiting tutor review (max 5 points)" (grey) or "Tutor feedback: 4/5 - Well explained!" (once reviewed)
  - Total row: "Total: 85/100 (85%)"

- **Tutor comments**:
  - If GradeEntry.comments exists: "Overall feedback from tutor: {text}" (formatted)

- **Previous attempts**:
  - Tabbed interface: "Attempt 1 (Latest)" + older attempts
  - Switch between to compare scores

- **Actions**:
  - "Retake exam" button (if FAILED and attempts remaining)
  - Back to results list

---

### 5.4 Certificate Eligibility & Issue Page
**Route**: `/dashboard/certificates`

**Before certificate issued**:
- Header: "My Certificates"
- For each completed course (or course requiring certificate):
  - Course title + instructor name
  - **Requirements checklist**:
    - ☐ Completed all lessons in all blocks (show progress: "24/24 lessons completed ✓")
    - ☐ Passed all block exams (show: "Block 1 Exam: 85% ✓", "Block 2 Exam: PENDING ⏱")
    - ☐ Paid in full (show: "100% paid ✓" or "75% paid - Pay 25% more")
    - ☐ Attended practicals (if applicable, show: "Practical day: 2026-01-15 ✓")
  - Status badges:
    - If all complete: "✓ Ready for certificate" (green button "Request certificate")
    - If pending: "⏱ In progress" (requirements progress bar)
    - If waiting approval: "⏳ Awaiting approval" (grey)
    - If denied: "✗ Not eligible" (requirements not met)

**After certificate issued**:
- Display issued certificate:
  - Certificate frame graphic (white card, MTC logo, formal styling)
  - Student name, course name, issue date
  - Certificate number (uniqueId): "MTC-2026-CNA-00042"
  - Tutor signature line (simulated)
  - **Download PDF button** (initiates download)
  - **Share / Verify link**:
    - Copy button: "https://musawotraining.ug/verify/MTC-2026-CNA-00042"
    - QR code (links to verify page)
    - "Anyone can verify this certificate online"

---

### 5.5 Public Certificate Verification Page
**Route**: `/verify/[certificateId]` (no auth required)

**UI**:
- Simple layout, centered
- Certificate frame display (same styling as student view)
- Verification status badge:
  - ✓ VALID (green): "This certificate is authentic and has not been revoked."
  - ✗ REVOKED (red): "This certificate has been revoked. {Reason}"
  - ✗ NOT FOUND (grey): "No certificate found with this ID."
- Display info:
  - Student name
  - Course name
  - Issue date
  - Certificate ID
- Verification metadata (bottom):
  - "Verified on {date/time}"
  - Number of times verified

---

## S6: My Fees and Access Control

### 6.1 My Fees Dashboard Page
**Route**: `/dashboard/fees`

**Header**: "My Fees and Payment Status"

**Current payment status** (top card):
- Course title
- **Status indicator**:
  - 🟢 ACTIVE: "Fully paid - Full access"
  - 🟡 PARTIALLY_PAID: "Partially paid - {X}% complete"
  - 🔴 PENDING_PAYMENT: "Payment not started"
  - ⚠️ OVERDUE: "Instalment overdue - Payment due now"
- **Payment progress bar**: Visual indicator 0-100%
- **Fee breakdown table**:
  - Total fee: "UGX 1,500,000"
  - Paid to date: "UGX 750,000"
  - Balance due: "UGX 750,000"
  - Due date (if instalment): "Due by 2026-02-15"

**Payment history** (ledger):
- Table with columns: Date | Description | Amount | Status | Receipt
- Each row:
  - "2026-01-15" | "Instalment 1 of 3 (via MTN Momo)" | "UGX 750,000" | "✓ Completed" | Download link
  - "2026-01-20" | "Bank transfer uploaded, awaiting approval" | "UGX 500,000" | "⏳ Pending approval" | View receipt
- Sorted by date descending (latest first)

**Available payment methods** section:
- Mobile Money (MTN, Airtel)
- Card (Visa, Mastercard)
- Bank Transfer (with upload receipt flow)

**Next instalment** (if applicable):
- "Next instalment due: UGX 375,000 by 2026-02-15"
- "Pay now" button (initiates payment flow)
- If overdue: Red alert "⚠ This payment is overdue. Access to new content is limited until paid."

**Access thresholds visual**:
- 3 progress milestones:
  - 50%: "Unlock Block 1 & Start learning" (green ✓ if passed)
  - 75%: "Unlock Block 2 & Book practicals" (yellow if at 50%, green if passed)
  - 100%: "Unlock Final exam & Earn certificate" (grey/yellow/green depending on current %)

---

### 6.2 Payment Initiation & Gateway Flow
**Entry point**: "Pay now" button on My Fees page or My Courses (locked course)

**Payment dialog**:
1. **Select payment method**:
   - Radio buttons: MTN Momo, Airtel Money, Card, Bank Transfer
   - Selection shows relevant gateway form

2. **For Mobile Money / Card**:
   - Amount pre-filled: next instalment or remaining balance
   - Button: "Proceed to {gateway}" (Pesapal or Flutterwave)
   - On click: POST `/api/payments` with `{courseId, planType, intakeId, method}`
   - Returns: `{type: "redirect", redirectUrl}`
   - Redirect to Pesapal/Flutterwave

3. **For Bank Transfer**:
   - Shows bank details:
     - "Account name: Musawo Training Center"
     - "Account number: {from settings}"
     - "Bank: Stanbic / Standard Chartered / etc."
   - Amount: "Pay exactly UGX {amount}"
   - Instructions: "Transfer the exact amount to the account above. Include your student number as the reference."
   - Form: 
     - Text input: "Bank reference number" (e.g., "FT-2026-01234")
     - File upload: "Upload bank receipt" (jpg, png, pdf)
     - On submit: Creates `Payment` with `status=PENDING_APPROVAL`
     - Shows: "✓ Receipt uploaded successfully. Your payment is pending approval. You'll be notified once confirmed."
     - Display reference number for tracking

---

### 6.3 Access Control Messages
**Locked content displays** (throughout dashboard):

**Materials**:
- Locked lesson: "🔒 Pay {X}% more to unlock this lesson"
- Link to My Fees page

**Assignments**:
- Locked assignment: "🔒 This assignment is not available yet. {unlock_reason}"
- Link to My Fees page

**Exams**:
- Locked exam: "🔒 Pay {X}% more to access this exam"
- Link to My Fees page

**Practicals** (if applicable):
- Locked practical booking: "🔒 Pay 75% to unlock practical booking"
- Link to My Fees page

**Forum**:
- If not enrolled: "Join this course to participate in discussions"
- If PENDING_PAYMENT: "Start your payment to access the forum"
- Otherwise: accessible

---

### 6.4 Admin Payment Approval Page
**Route**: `/admin/payments` (Admin/Principal only)

**Header**: "Payment Approvals"

**Filter tabs**: All, Pending Bank Transfer, Pending Proof, Completed, Rejected

**Payment queue** (table):
- Columns: Date Submitted | Student Name | Course | Amount | Method | Status | Actions
- Each row:
  - "2026-01-20 15:30" | "John Doe" | "CNA 2026" | "UGX 500,000" | "Bank Transfer" | "🕐 Pending"
  - View button → opens approval modal

**Approval modal** (on "View"):
- Student info: Name, email, student number, phone
- Payment details:
  - Amount: "UGX 500,000"
  - Course: "CNA 2026"
  - Instalment: "1 of 3"
  - Bank transfer reference: "FT-2026-01234"
  - Date submitted: "2026-01-20 15:30"
  - Uploaded receipt (image/PDF preview)
- **Verification checklist**:
  - ☐ Receipt verified (editable checkbox)
  - ☐ Amount matches (auto-checked if amount correct)
  - ☐ Reference number correct (editable checkbox)
- **Action buttons**:
  - "Approve" (green) → Sets `status=COMPLETED`, updates enrolment.paidPercent, sends student email
  - "Reject" (red) → Sets `status=FAILED`, opens rejection reason dialog
- **Rejection dialog**:
  - Text area: "Reason for rejection"
  - "Reject" button → Sets `status=FAILED`, `bankRejectedReason`, sends student email

---

## E2E Test Suite (40+ scenarios)

**File**: `e2e/student-s5-s6.spec.ts`

### S5 Tests (25 scenarios)

**Exam list page**:
1. ✅ Exam list loads with all published exams
2. ✅ Locked exams show unlock reason
3. ✅ Passed exams show score badge
4. ✅ Failed exams show score + "retake" button
5. ✅ Exam status filters work (All/Upcoming/Available/Completed)

**Exam taking**:
6. ✅ Can start an available exam
7. ✅ Questions display in attempt order
8. ✅ Can answer MCQ and move to next question
9. ✅ Can answer TRUE_FALSE and move next
10. ✅ Can answer SHORT_ANSWER (textarea)
11. ✅ Forward-only: cannot go back to previous question
12. ✅ Timer displays and counts down
13. ✅ Tab-switch warning appears on visibility change
14. ✅ Per-question timer enforces deadline
15. ✅ Exam submit completes attempt successfully
16. ✅ Score calculated correctly (MCQ + T-F auto-marked)
17. ✅ SHORT_ANSWER questions marked PENDING_REVIEW
18. ✅ Result screen shows pass/fail and score

**Results page**:
19. ✅ Results list shows all attempts
20. ✅ Results detail shows question breakdown
21. ✅ Tutor comments display if present
22. ✅ Can view previous attempt scores
23. ✅ "Retake exam" button available if failed + attempts left

**Certificates**:
24. ✅ Certificate eligibility checklist shows requirements
25. ✅ Public certificate verification page validates certificate ID

### S6 Tests (15 scenarios)

**My Fees page**:
1. ✅ Shows current payment status (PENDING/PARTIAL/ACTIVE)
2. ✅ Shows payment progress bar (0-100%)
3. ✅ Shows fee breakdown (total/paid/balance)
4. ✅ Shows payment history with ledger entries
5. ✅ Next instalment displays if applicable
6. ✅ Access thresholds visual shows 50%/75%/100% milestones

**Payment initiation**:
7. ✅ Mobile money payment flow redirects to Pesapal
8. ✅ Card payment flow redirects to Flutterwave
9. ✅ Bank transfer shows bank details form
10. ✅ Bank transfer receipt upload works

**Access control**:
11. ✅ Locked lessons show "Pay X% more" message
12. ✅ Locked exams show unlock reason
13. ✅ Locked assignments show unlock reason
14. ✅ Clicking unlock reason links to My Fees page

**Admin approval** (admin role):
15. ✅ Admin can approve pending bank transfer payment

---

## Implementation Checklist

### Frontend Pages (S5)
- [ ] `/dashboard/exams` - exam list page
- [ ] `/dashboard/exams/[examId]` - exam taking UI
- [ ] `/dashboard/results` - results list
- [ ] `/dashboard/results/[examId]` - results detail
- [ ] `/dashboard/certificates` - certificate eligibility
- [ ] `/verify/[certificateId]` - public verification page

### Frontend Pages (S6)
- [ ] `/dashboard/fees` - payment dashboard

### Admin Pages
- [ ] `/admin/payments` - payment approval queue

### Components
- [ ] ExamTimer (countdown display)
- [ ] QuestionDisplay (MCQ/T-F/SHORT_ANSWER)
- [ ] AccessLockMessage (reusable locked content message)
- [ ] PaymentProgressBar (0-100% with threshold markers)
- [ ] CertificateFrame (styled certificate display)

### Backend (all existing, verify integration)
- [ ] `/api/exams?action=start|answer|submit|tab-switch` ✓
- [ ] `/api/payments` (payment initiation) ✓
- [ ] `/api/admin/payments/approve` (approval) - may need enhancement
- [ ] `/api/results` - retrieve exam attempt details
- [ ] `/api/certificates` - certificate listing & PDF generation (if needed)
- [ ] `/api/verify/[certificateId]` - public verification endpoint

---

## Database Schema (verify existing)
- ✓ Exam, ExamAttempt, QuizQuestion, ShortAnswerReview
- ✓ Certificate, CertVerification
- ✓ Enrolment (paidPercent, status)
- ✓ Payment, Instalment, LedgerEntry
- ✓ GradeEntry (releasedAt for results publication)
- ✓ ApprovalRequest (types: RESULTS_PUBLICATION, CERTIFICATE_ISSUANCE)

---

## Responsive Design Checklist
- Mobile (360px): Stack layouts vertically, full-width cards
- Tablet (768px): 2-column layouts where appropriate
- Desktop (1440px): Multi-column, side-by-side timers
- Dark mode: AA contrast for all text, badges, timers
- Touch-friendly: 44px tap targets for buttons
- No horizontal scroll
- Lazy-load images

---

## Performance Targets
- Exam list page: < 1 sec (paginate after 50 exams)
- Exam taking page: < 500ms (server-side answer validation)
- Results page: < 1 sec (cached grade entries)
- Certificate eligibility: < 500ms (computed on-demand)
- My Fees page: < 500ms (ledger entries cached)
- Payment approval: < 200ms (simple query + update)

---

## Security Checklist
- ✓ Exam time limits server-enforced (no client-side manipulation)
- ✓ Forward-only validation server-side (cannot answer earlier questions)
- ✓ Payment approval re-auth required (TOTP for high-risk)
- ✓ Results only shown after releasedAt is set (admin-controlled)
- ✓ Certificates locked by Director approval workflow
- ✓ Access to exam determined by paidPercent (server-side)
- ✓ Public verify page has no PII exposure (certificate ID only)

---

## Approval Workflows

### Results Publication
1. Instructor/Admin requests RESULTS_PUBLICATION approval
2. Director reviews and approves
3. On approval: Exam.status=PUBLISHED, GradeEntry.releasedAt set
4. Students notified, results visible

### Certificate Issuance
1. Admin requests CERTIFICATE_ISSUANCE for student+course
2. Director reviews and approves
3. On approval: Certificate created with uniqueId, PDF generated
4. Student notified, certificate downloadable

---

## Next Steps
1. Implement S5 frontend pages (exams, results, certificates)
2. Create E2E tests for S5 (25 scenarios)
3. Implement S6 frontend pages (fees, payment approval)
4. Create E2E tests for S6 (15 scenarios)
5. Commit to main: "S5+S6: Exams, Results, Certificates, Fees & Access Control with E2E tests"
6. Verify all tests pass locally before pushing to Render

