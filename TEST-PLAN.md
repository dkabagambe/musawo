# Production Readiness Test Plan

## Critical Bug Fixes Implemented

### 1. Announcements - "Invalid announcement" Error
**Issue**: Creating announcements as Director/Principal failed with Zod validation error
**Fix**: Changed `courseId: z.string().cuid().nullish()` to `z.union([z.string().cuid(), z.null(), z.undefined()])`
**File**: `src/app/api/announcements/route.ts`

**Test Steps**:
1. Log in as Director or Principal
2. Navigate to Announcements
3. Click "Create Announcement"
4. Fill form with:
   - Title: "Test Announcement"
   - Content: "This is a test"
   - Target: Select a role (e.g., "All Students")
   - Course: Leave blank OR select a specific course
5. Click Submit
6. **Expected**: Announcement created successfully, no "Invalid announcement" error

### 2. Direct Messages Not Reaching Recipients
**Issue**: Messages sent targeting someone don't reach recipients
**Status**: Verified inbox pages exist, MessageInbox component filters correctly (client-side for type=DIRECT_MESSAGE)
**Files**: Message inbox pages present in all portals

**Test Steps**:
1. Log in as Director/Principal
2. Navigate to Messages
3. Click "New Message"
4. Select a recipient (student or instructor)
5. Enter subject and message
6. Send
7. Log in as the recipient
8. Navigate to Messages/Inbox
9. **Expected**: Message appears in recipient's inbox

### 3. Payment Gate Enforcement
**Issue**: Students could access content regardless of payment percentage
**Fixes**:
- Changed PARTIALLY_PAID threshold from 25% to 50% to match block1 access requirement
- Added payment gates to exams page
- Added payment gates to assignments page
- Created missing materials API route with payment gate checks
- Fixed getAccessLevel calls in materials and recordings pages

**Payment Thresholds**:
- **0-49%**: Preview content only (free lessons)
- **50-74%**: Block 1 unlocked
- **75-99%**: Blocks 1-3 unlocked (practical booking enabled)
- **100%**: All content including final exams and certificate

**Test Steps**:

#### Test A: 0-49% Payment
1. Create test student with 0% or 40% paidPercent
2. Log in as that student
3. Try to access:
   - Block 1 lesson: **Expected: Blocked/Locked**
   - Block 2 lesson: **Expected: Blocked/Locked**
   - Assignment: **Expected: Access denied message**
   - Exam: **Expected: Access denied message**
   - Notes PDF: **Expected: 403 or payment required message**
   - Recording: **Expected: Locked**

#### Test B: 50-74% Payment
1. Set test student paidPercent to 50% or 60%
2. Try to access:
   - Block 1 lesson: **Expected: Accessible**
   - Block 2 lesson: **Expected: Blocked/Locked**
   - Block 3 lesson: **Expected: Blocked/Locked**
   - Block 1 assignment: **Expected: Accessible**
   - Block 2 assignment: **Expected: Access denied**
   - Notes in Block 1: **Expected: Accessible**
   - Notes in Block 2: **Expected: 403**

#### Test C: 75-99% Payment
1. Set test student paidPercent to 75% or 90%
2. Try to access:
   - Block 1 lesson: **Expected: Accessible**
   - Block 2 lesson: **Expected: Accessible**
   - Block 3 lesson: **Expected: Accessible**
   - Final exam: **Expected: Blocked/Access denied**
   - All assignments in Blocks 1-3: **Expected: Accessible**
   - Practical booking: **Expected: Available**

#### Test D: 100% Payment
1. Set test student paidPercent to 100%
2. Try to access:
   - All blocks: **Expected: Accessible**
   - All assignments: **Expected: Accessible**
   - Final exam: **Expected: Accessible**
   - Certificate generation: **Expected: Available after exam**

## Files Modified

1. `src/app/api/announcements/route.ts` - Fixed Zod schema
2. `src/lib/payments/index.ts` - Changed threshold 25%→50%
3. `src/app/(dashboard)/dashboard/exams/[id]/page.tsx` - Added payment gate
4. `src/app/(dashboard)/dashboard/assignments/[id]/page.tsx` - Added payment gate
5. `src/app/api/learning/materials/[id]/route.ts` - Created with payment gate
6. `src/app/(dashboard)/dashboard/materials/page.tsx` - Fixed getAccessLevel call
7. `src/app/(dashboard)/dashboard/recordings/page.tsx` - Fixed getAccessLevel call

## Manual Database Updates for Testing

To test different payment scenarios, update a test student's enrolment:

```sql
-- Set to 0% (no access)
UPDATE "Enrolment" SET "paidPercent" = 0 WHERE "userId" = '<test-user-id>';

-- Set to 50% (Block 1 only)
UPDATE "Enrolment" SET "paidPercent" = 50, "status" = 'PARTIALLY_PAID' WHERE "userId" = '<test-user-id>';

-- Set to 75% (Blocks 1-3)
UPDATE "Enrolment" SET "paidPercent" = 75, "status" = 'PARTIALLY_PAID' WHERE "userId" = '<test-user-id>';

-- Set to 100% (full access)
UPDATE "Enrolment" SET "paidPercent" = 100, "status" = 'ACTIVE' WHERE "userId" = '<test-user-id>';
```

## Commit History

- **ce2dad4**: Section 3 fixes (profile pic persistence, gradebook nav, instructor name edit)
- **08d02fc**: Section 4 profile fixes (all admin portals, profile editing for all roles)
- **609b401**: Critical production bugs (announcements, payment gates, materials API)

## Next Steps

1. Start dev server: `npm run dev`
2. Run through all test steps above
3. Verify TypeScript: `npx tsc --noEmit` ✅ (already passing)
4. If all tests pass, merge to main and deploy
5. Monitor production logs for any edge cases

## Production Deployment Checklist

- [ ] All manual tests passed
- [ ] TypeScript compilation clean ✅
- [ ] No console errors in browser
- [ ] Database migrations applied
- [ ] Environment variables set correctly
- [ ] Payment webhooks configured
- [ ] Email notifications working
- [ ] Backup database before deployment
