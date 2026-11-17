# P7: FINANCE, EQUIPMENT, STORAGE, SUPPORT

## Status: READY FOR IMPLEMENTATION

Specification for Principal's operational oversight features.

## P7.1 Finance and Fees (/principal/finance)

### Fee Structure Management
- View fee structure per programme (50%, 25%, 25% phases)
- Edit fee structure - changes go to Director for approval (includes diff view)
- Fee structure history with approval tracking
- Programme-specific fee amounts and phase percentages

### Student Fee Status
- All students with search and filters (programme, intake, class, payment status)
- Per student: outstanding balance, phases paid (1/3, 2/3, 3/3), next amount due
- Payment timeline showing all transactions with dates and amounts
- Payment status indicators: Fully Paid, Phase 1/2/3 Paid, Overdue, Hold Active
- Quick actions: View details, Place hold, Lift hold, View payment history

### Payment Records
- View all payment records (readonly for Principal)
- Search by student name, registration number, transaction ID
- Filter by date range, programme, payment method, status
- Transaction details: amount, date, method, phase, proof image, verified by
- Cannot approve payments - only Director can approve

### Payment Proofs Workflow
- View payment proofs collected by Admin
- See automatic checks: unique transaction ID, duplicate image detection, amount vs phase, time window
- Decision options: Forward to Director with comment, or Return to Admin with reason
- Proof details: student info, amount, phase, upload date, image viewer, Admin notes
- Forwarded proofs tracked in Approval Tracking

### Payment Holds
- Place hold on student account with reason (blocks class access)
- Lift hold with reason (restores access immediately)
- Both actions audit logged
- Student sees hold notice with reason and contact info
- Hold history per student with who placed/lifted and when

### Waivers and Refunds
- Prepare waiver requests (partial or full, with justification)
- Prepare refund requests (amount, reason, recipient bank details)
- Both go to Director for approval
- Track status in Approval Tracking
- Cannot approve own waivers/refunds

### Reconciliation View
- Total collected vs expected by programme and intake
- Outstanding balances grouped by phase
- Overdue payments (expected date passed)
- Waivers granted summary
- Export reconciliation report (audit logged)

### Reports
- Payments collected by date range, programme, phase
- Outstanding balances by programme and intake
- Payment methods breakdown
- Waivers and refunds summary
- Export CSV/PDF (audit logged)

## P7.2 Equipment (/principal/equipment)

### Equipment Per Practical Session
- View all equipment assigned to practical sessions
- Grouped by course unit and session
- Equipment details: name, quantity required, quantity available, status
- Link to session details (timetable, instructor, enrolled students)

### Equipment Requests
- Requests prepared by Admin (new equipment, quantity increase, replacement)
- Request details: item name, quantity, justification, estimated cost, priority
- Decision options: Approve (Principal decides alone), or Forward to Director
- Approved requests notify Admin and Procurement
- Forwarded requests tracked in Approval Tracking

### Stock Levels
- Current stock by equipment item
- Quantity available vs total required across active sessions
- Stock status: Adequate, Low (below 20% buffer), Critical (insufficient)
- Missing items report (required but not in stock)
- Reorder suggestions based on usage patterns

### Equipment History
- All equipment requests with status and decision date
- Stock adjustments (additions, disposals, corrections) with reasons
- Equipment assignment history per session
- Audit trail for all changes

## P7.3 Storage (/principal/storage)

### Storage Overview
- Total used vs total capacity (GB and percentage)
- Breakdown by course programme
- Breakdown by type: recordings, notes/PDFs, student uploads, system
- Visual chart showing distribution
- Warning banner when over 80% capacity

### Previous Semester Clearing
- Storage clearing preview before closing a semester
- Lists recordings and materials from completed semesters
- Shows sizes, last accessed date, retention policy
- Checkboxes to select items for archival
- Preview total space to be freed
- Confirm button - sends notification to Director

### 14-Day Trash
- Items moved to trash (not hard deleted)
- Countdown showing days remaining until permanent deletion
- Search and filter trash items
- Restore individual items or bulk restore
- Manually empty trash before 14 days (confirmation required)
- Trash usage counts toward storage quota

### Storage Management Actions
- Archive old recordings (moved to cold storage, lower quality preview remains)
- Delete student uploads after course completion (14-day trash first)
- Download and remove option for large materials
- Compress video recordings (quality options, estimates space saved)

## P7.4 Support (/principal/support)

### View All Tickets
- All support tickets across institution (IT Admin handles resolution)
- Search by ticket number, student/staff name, title
- Filter by status (Open, In Progress, Resolved, Closed), priority, category, date range
- Ticket details: requester, category (Technical, Access, Content, Other), description, screenshots
- Ticket timeline: opened, assignments, comments, status changes, resolved/closed

### Actions Available to Principal
- View ticket details (cannot claim or resolve - only IT Admin can)
- Add comment to ticket (visible to requester and IT Admin)
- Escalate ticket (changes priority to High, notifies IT Admin immediately)
- Merge duplicate tickets (links them, marks one as duplicate)
- Reassign ticket to IT Admin (if accidentally assigned to Principal)

### Ticket Statistics
- Open tickets count by priority
- Average resolution time
- Tickets by category breakdown
- Most common issues report
- IT Admin performance metrics (for Director review)

## Tests Required

### Finance
- [ ] View fee structure for all programmes
- [ ] Edit fee structure - goes to Director approval workflow
- [ ] View student fee status with correct phases paid
- [ ] Payment proof forwarding to Director
- [ ] Payment proof returned to Admin with reason
- [ ] Place hold on student - student sees it and is blocked
- [ ] Lift hold - student access restored immediately
- [ ] Prepare waiver request - goes to Director
- [ ] Prepare refund request - goes to Director
- [ ] Reconciliation view shows correct totals
- [ ] Export payment report - audit logged
- [ ] Principal cannot approve payments (blocked)

### Equipment
- [ ] View equipment per practical session
- [ ] Approve equipment request (takes effect immediately)
- [ ] Forward equipment request to Director
- [ ] Stock levels show correct availability
- [ ] Missing items report accurate
- [ ] Equipment history shows all changes

### Storage
- [ ] Storage overview shows correct usage and breakdown
- [ ] Warning appears when over 80%
- [ ] Clearing preview lists correct items with sizes
- [ ] Confirm clearing - Director notified
- [ ] View trash with countdown
- [ ] Restore item from trash
- [ ] Empty trash with confirmation
- [ ] Archive recordings - space freed

### Support
- [ ] View all support tickets
- [ ] Filter tickets by status and priority
- [ ] Add comment to ticket
- [ ] Escalate ticket - IT Admin notified
- [ ] Cannot claim or resolve tickets (blocked)
- [ ] Ticket statistics accurate

### Responsive & Theme
- [ ] All P7 pages work at 390px and 1440px
- [ ] Light and dark theme AA contrast
- [ ] All tables and charts responsive

### Security & Audit
- [ ] Principal cannot approve payments (Director only)
- [ ] Cannot approve own waiver or refund
- [ ] Place/lift hold audit logged
- [ ] Fee structure changes audit logged
- [ ] Equipment approvals audit logged
- [ ] Storage clearing audit logged
- [ ] Export actions audit logged
- [ ] Ticket escalation audit logged

## Database Schema Notes

### Finance
```prisma
// Fee structure per programme
model FeeStructure {
  id           String   @id @default(cuid())
  programmeId  String
  phases       Json     // [{phase: 1, percent: 50}, ...]
  totalAmount  Decimal
  effectiveFrom DateTime
  status       String   // DRAFT, SUBMITTED, APPROVED, ACTIVE
  approvalId   String?
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
}

// Payment holds
model PaymentHold {
  id          String    @id @default(cuid())
  studentId   String
  reason      String    @db.Text
  placedBy    String
  placedAt    DateTime  @default(now())
  liftedBy    String?
  liftedAt    DateTime?
  liftedReason String?  @db.Text
}
```

### Equipment
```prisma
model Equipment {
  id          String @id @default(cuid())
  name        String
  totalStock  Int
  available   Int
  unit        String
  status      String // ADEQUATE, LOW, CRITICAL
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}

model EquipmentRequest {
  id          String   @id @default(cuid())
  itemName    String
  quantity    Int
  justification String @db.Text
  estimatedCost Decimal?
  priority    String   // LOW, MEDIUM, HIGH
  status      String   // PENDING, APPROVED, FORWARDED, REJECTED
  requestedBy String
  decidedBy   String?
  approvalId  String?
  createdAt   DateTime @default(now())
  decidedAt   DateTime?
}
```

### Storage
```prisma
model StorageItem {
  id          String    @id @default(cuid())
  type        String    // RECORDING, NOTE, UPLOAD, SYSTEM
  path        String
  size        BigInt    // bytes
  courseId    String?
  semesterId  String?
  lastAccessed DateTime?
  trashedAt   DateTime?
  archivedAt  DateTime?
  createdAt   DateTime  @default(now())
}
```

### Support (extend existing Ticket model)
```prisma
model Ticket {
  // ... existing fields
  priority    String   @default("MEDIUM") // LOW, MEDIUM, HIGH
  escalatedAt DateTime?
  escalatedBy String?
}
```

## API Endpoints

### Finance
- `GET /api/principal/finance/structure` - Fee structures
- `POST /api/principal/finance/structure/change` - Submit structure change (creates approval)
- `GET /api/principal/finance/students` - Student fee status
- `GET /api/principal/finance/payments` - Payment records (readonly)
- `POST /api/principal/finance/proofs/[id]/forward` - Forward to Director
- `POST /api/principal/finance/proofs/[id]/return` - Return to Admin
- `POST /api/principal/finance/holds/place` - Place hold
- `POST /api/principal/finance/holds/lift` - Lift hold
- `POST /api/principal/finance/waivers/request` - Request waiver (creates approval)
- `POST /api/principal/finance/refunds/request` - Request refund (creates approval)
- `GET /api/principal/finance/reconciliation` - Reconciliation data
- `POST /api/principal/finance/export` - Export report (audit logged)

### Equipment
- `GET /api/principal/equipment` - All equipment and stock
- `GET /api/principal/equipment/sessions` - Equipment per session
- `GET /api/principal/equipment/requests` - Pending requests
- `POST /api/principal/equipment/requests/[id]/approve` - Approve (Principal decides alone)
- `POST /api/principal/equipment/requests/[id]/forward` - Forward to Director
- `GET /api/principal/equipment/history` - Equipment history

### Storage
- `GET /api/principal/storage/overview` - Usage and breakdown
- `GET /api/principal/storage/clearing-preview` - Items for clearing
- `POST /api/principal/storage/clearing/confirm` - Confirm clearing (notifies Director)
- `GET /api/principal/storage/trash` - Trash items
- `POST /api/principal/storage/trash/[id]/restore` - Restore item
- `POST /api/principal/storage/trash/empty` - Empty trash
- `POST /api/principal/storage/archive` - Archive recordings

### Support
- `GET /api/principal/support/tickets` - All tickets
- `GET /api/principal/support/tickets/[id]` - Ticket details
- `POST /api/principal/support/tickets/[id]/comment` - Add comment
- `POST /api/principal/support/tickets/[id]/escalate` - Escalate ticket
- `GET /api/principal/support/statistics` - Ticket statistics

## Implementation Notes

1. **Finance**: Principal prepares but Director approves payments, waivers, refunds. Only holds can be decided by Principal alone.
2. **Equipment**: Principal OR Director can approve (either one). Use same approval model as marks changes.
3. **Storage**: Clearing confirmation notifies Director (informational, not blocking). 14-day trash prevents accidental data loss.
4. **Support**: Principal has read and comment access but cannot claim/resolve tickets (IT Admin only).
5. **All exports audit logged** with what was exported, date range, filters applied.
6. **All operational actions audit logged**: holds, equipment approvals, storage clearing, ticket escalation.
7. **Approval workflow integration**: Fee changes, waivers, refunds use existing approval model from P3.

## Files to Create

- `/src/app/(principal)/principal/finance/page.tsx`
- `/src/app/(principal)/principal/finance/FinanceView.tsx`
- `/src/app/(principal)/principal/finance/structure/FeeStructureManager.tsx`
- `/src/app/(principal)/principal/finance/holds/PaymentHoldsManager.tsx`
- `/src/app/(principal)/principal/equipment/page.tsx`
- `/src/app/(principal)/principal/equipment/EquipmentView.tsx`
- `/src/app/(principal)/principal/storage/page.tsx`
- `/src/app/(principal)/principal/storage/StorageView.tsx`
- `/src/app/(principal)/principal/support/page.tsx`
- `/src/app/(principal)/principal/support/TicketsView.tsx`
- API routes for all endpoints listed above
- Playwright tests: `e2e/principal-p7-finance.spec.ts`, `e2e/principal-p7-equipment.spec.ts`, `e2e/principal-p7-storage.spec.ts`, `e2e/principal-p7-support.spec.ts`

## Next Steps After P7

After P7 implementation complete:
- Move to P8: Reports, Audit, Communication
- Then P9: Speed, Security and Final Proof
- Update docs/PRINCIPAL-STATUS.md with P7 completion evidence
