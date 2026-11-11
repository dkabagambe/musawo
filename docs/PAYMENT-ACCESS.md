# Payment and Content Access Rules

This document explains how **payment percentage (paidPercent)** unlocks content access in Musawo Training Center.

## Payment Plan: 50/25/25

Students on the **instalment plan** pay in **three phases**:

1. **First instalment = 50%** of the total fee → student reaches 50% paid
2. **Second instalment = 25%** of the total fee → student reaches 75% paid
3. **Third instalment = 25%** of the total fee → student reaches 100% paid (fully paid)

This 50/25/25 split is implemented in `src/app/api/payments/route.ts` and ensures students cross the 50% threshold on their first payment, unlocking Block 1 and allowing them to start the course immediately.

## Full Payment Option

Students may also pay **100% upfront** (full payment, no instalments) and gain immediate access to all content except the final exam (unlocked after practical completion).

---

## Access Thresholds and What They Unlock

The system uses **paidPercent** (0-100) to determine access. The thresholds are:

| Paid % | Access Level | What is unlocked | Status |
|--------|--------------|------------------|--------|
| **0%** | PREVIEW | Free preview lessons only; cannot enrol in paid lessons, take exams, or access the forum | PENDING_PAYMENT |
| **1-49%** | PENDING | Same as PREVIEW (no paid content) | PENDING_PAYMENT |
| **50%** | PARTIAL | ✅ **Block 1** lessons, notes, videos<br>✅ **Forum access**<br>✅ **Class participation**<br>❌ Block 2 and Block 3 locked<br>❌ Exams locked<br>❌ Practical booking locked | PARTIALLY_PAID |
| **75%** | PARTIAL | ✅ Block 1 **and Block 2** lessons<br>✅ **Block 3** lessons<br>✅ **Block 1 exam**<br>✅ **Practical day booking**<br>❌ Final exam (Block 4+) locked | PARTIALLY_PAID |
| **100%** | FULL | ✅ **All blocks unlocked**<br>✅ **All exams** (after practical)<br>✅ **Certificate issuance** upon passing | ACTIVE |

---

## Real-World Student Scenarios

### Scenario 1: Student pays first instalment (50%)
- **Before payment**: status = `PENDING_PAYMENT`, paidPercent = 0, access = PREVIEW
- **After payment**: status = `PARTIALLY_PAID`, paidPercent = 50
- **Access granted**:
  - Block 1 lessons (read notes, watch videos, attend live classes)
  - Forum discussions
  - Timetable and announcements
- **Still locked**:
  - Block 2 and Block 3 lessons
  - All exams
  - Practical booking
  - Certificate

### Scenario 2: Student pays second instalment (reaches 75%)
- **Before payment**: paidPercent = 50, Block 1 only
- **After payment**: paidPercent = 75
- **Access granted**:
  - Block 2 lessons
  - Block 3 lessons
  - Block 1 exam (can take and see results)
  - Practical booking
- **Still locked**:
  - Final exam (Block 4+ content)
  - Certificate (until course is fully completed)

### Scenario 3: Student pays final instalment (reaches 100%)
- **Before payment**: paidPercent = 75
- **After payment**: status = `ACTIVE`, paidPercent = 100
- **Access granted**:
  - All lessons (Block 1, 2, 3, and any Block 4+ content)
  - All exams (after practical completion)
  - Certificate issuance upon passing final exam

### Scenario 4: Student pays 100% upfront
- **Immediately**: status = `ACTIVE`, paidPercent = 100
- **Access granted**: same as Scenario 3 (all content unlocked immediately)

---

## Overdue Students (Missed Instalments)

If a student misses an instalment due date:

1. Status changes from `PARTIALLY_PAID` to `OVERDUE`
2. **Grace period** (default 7 days): student retains access to already-unlocked blocks
3. **After grace period**: all paid blocks remain unlocked, but no new blocks open until payment is caught up
4. **Overdue warning** appears on the dashboard with a "Pay now" button

Once the overdue payment is received:
- Status returns to `PARTIALLY_PAID` or `ACTIVE`
- Access progresses according to the new paidPercent

---

## Provisional Access (Bank Transfers)

When a student submits a **bank transfer receipt** pending admin approval:

- Admin may grant **provisional access** for a limited time (e.g. 48 hours)
- Status remains `PENDING_PAYMENT` but `provisionalUntil` is set
- **Access granted**: Block 1 lessons only (same as 50% access)
- **Duration**: until the payment is confirmed or the provisional period expires

This allows students to start learning immediately while the bank transfer is being verified.

---

## Technical Implementation

- **Access check**: `src/lib/enrolment/access.ts` → `canAccessLesson()` and `getLockedReason()`
- **Payment processing**: `src/lib/payments/index.ts` → `processConfirmedPayment()`
- **Instalment creation**: `src/app/api/payments/route.ts` → 50/25/25 split
- **Tests**: `src/tests/payments.test.ts` (8 tests), `src/tests/manual-claims.test.ts` (threshold checks)

### Access Thresholds Configuration

The thresholds are defined in `src/lib/enrolment/access.ts`:

```typescript
export const DEFAULT_ACCESS_THRESHOLDS = {
  preview: 0,
  block1: 50,   // 50% unlocks Block 1
  block2: 75,   // 75% unlocks Block 2
  block3: 75,   // 75% unlocks Block 3
  final: 100,   // 100% unlocks final exam
};
```

Courses can override these thresholds via the `accessThresholds` field in the `courses` table (JSONB), allowing custom payment plans per course.

---

## Lock Messages Shown to Students

When a student tries to access a locked lesson, they see:

- **Block 1 locked**: "Pay 50% to start your course and unlock Block 1"
- **Block 2 locked**: "Pay 75% to unlock Block 2 and take the Block 1 exam"
- **Block 3 locked**: "Pay 75% to unlock Block 3 and book your practical day"
- **Final exam locked**: "Pay in full to access the final exam and earn your certificate"
- **Overdue**: "Your instalment is overdue - pay now to maintain access"

These messages are generated by `getLockedReason()` in `src/lib/enrolment/access.ts`.

---

## Summary Table: Payment → Access

| paidPercent | Status | Forum | Block 1 | Block 2 | Block 3 | Exams | Practical | Certificate |
|-------------|--------|-------|---------|---------|---------|-------|-----------|-------------|
| 0% | PENDING_PAYMENT | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| 1-49% | PENDING_PAYMENT | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| 50% | PARTIALLY_PAID | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| 75% | PARTIALLY_PAID | ✅ | ✅ | ✅ | ✅ | Block 1 only | ✅ | ❌ |
| 100% | ACTIVE | ✅ | ✅ | ✅ | ✅ | All | ✅ | ✅ (after passing) |

---

## Changes in This Version

**Fixed**: Instalment split changed from equal-thirds (33/33/33) to **50/25/25**. The old split meant students paying the first instalment (33%) stayed in `PENDING_PAYMENT` with no access. Now the first instalment (50%) correctly unlocks Block 1 and changes status to `PARTIALLY_PAID`.

**Reference**: remarks.md Section 2 (website cleanup): "fees for all courses are paid in three phases, 50% of tuition before reporting, then 25%, then the final 25%."
