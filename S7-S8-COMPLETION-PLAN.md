# S7 + S8 Full Completion Plan

## Overview
S7 Communication (95% done) and S8 Mobile/Performance/Final Proof (70% done) need full completion.

## S7: Communication - What Needs Completion

### Status: 95% Done
- ✅ All models defined (Conversation, DirectMessage, Announcement, Notification, SupportTicket)
- ✅ All database schema features (read tracking, approval workflow, SLA)
- ✅ All API routes (messaging, announcements, notifications, support)
- ✅ All 7 role pages (student, tutor, admin, principal, director, system, registrar)
- ⚠️ **TODO**: Verify all pages are FULLY functional (not just placeholders)
- ⚠️ **TODO**: Institution-wide announcement Director approval E2E test
- ⚠️ **TODO**: Support ticket lifecycle E2E test (create, assign, reply, resolve)
- ⚠️ **TODO**: Notification type routing complete and working
- ⚠️ **TODO**: All notification channels implemented (EMAIL, SMS, WHATSAPP, IN_APP)

### Pages to Verify & Complete (7 roles, 4 features each = 28 pages)
1. `/dashboard/messages` - Student messaging inbox
2. `/tutor/messages` - Tutor message dispatch + compose
3. `/admin/messages` - Admin messaging
4. `/principal/messages` - Principal messages
5. `/director/messages` - Director messages
6. `/system/messages` - System IT messages
7. `/dashboard/announcements` - Student view announcements
8. `/tutor/announcements` - Tutor create + publish
9. `/admin/announcements` - Admin announcements
10. `/principal/announcements` - Principal view + approve
11. `/director/announcements` - Director view
12. `/system/announcements` - System IT announcements
13. `/registrar/announcements` - Registrar announcements
14. `/dashboard/notifications` - Student notification center
15. `/dashboard/support` - Student support tickets
16. `/tutor/support` - Tutor support
17. `/admin/support` - Admin support queue
18. `/principal/support` - Principal support
19. `/system/support` - IT support desk (ITSupportDesk component)
20. All notification bell badge displays (topbar integration)
21. All message count badges (topbar integration)

---

## S8: Mobile/Performance/Final Proof - What Needs Completion

### Status: 70% Done
- ✅ Mobile drawer navigation implemented
- ⚠️ **TODO**: Bottom navigation tab bar NOT implemented (skeleton exists but not rendered)
- ✅ Image optimization
- ✅ Code splitting
- ⚠️ **TODO**: Database query optimization audit & fixes
- ✅ Click audit script exists
- ⚠️ **TODO**: Run click audit and document results
- ✅ Load test script (k6) exists
- ⚠️ **TODO**: Execute load test and generate LOAD-RESULTS.md
- ⚠️ **TODO**: Cross-role E2E: Director approval workflow test

### Specific Tasks

#### 1. Bottom Navigation Tab Bar (Mobile Only)
**Current State**: Lines 632-685 in AppShell.tsx define BOTTOM_NAV_GROUPS but NOT rendered

**Implementation Required**:
1. Create mobile-only bottom nav component
2. Wire into AppShell render (conditional on sm/md breakpoint)
3. Render 5 primary groups: Dashboard, Classes, Learn, Fees, More
4. "More" opens side drawer for secondary pages
5. Active state highlighting
6. Smooth transitions

**File**: src/components/ui/AppShell.tsx (add rendering logic ~line 850)
**Expected**: Mobile nav switches from drawer to tabs, improving UX

#### 2. Performance Benchmarking & Optimization
**Current State**: Query patterns exist, indices present, but comprehensive audit incomplete

**Tasks**:
1. Run database query analysis (find any remaining N+1 patterns)
2. Add Redis caching for frequently accessed resources:
   - Course announcements (cache 5 min)
   - Notifications list (cache 1 min)
   - Enrolment data (cache 2 min)
3. Add Cache-Control headers to static assets
4. Verify image optimization across all pages
5. Measure baseline performance (pre-optimization)

**Expected Output**: docs/PERFORMANCE-BASELINE.md documenting before/after metrics

#### 3. Click Audit Execution & Documentation
**Current State**: Script exists and is runnable

**Tasks**:
1. Run: `npm run click:audit`
2. Review generated docs/CLICK-AUDIT-*.md files
3. Fix any FAIL verdicts (4xx/5xx responses, missing pages)
4. Document known limitations (intentional 403s for unpermitted access, etc.)
5. Create summary: docs/CLICK-AUDIT-SUMMARY.md

**Expected Output**: All roles PASS on all accessible pages (zero failures/404s)

#### 4. Load Test Execution & Analysis
**Current State**: k6 script fully configured, never run

**Tasks**:
1. Ensure database is seeded: `npm run demo:reset && npm run db:seed-topup`
2. Run load test: `npm run load:30`
   - Auto-builds and starts production server
   - Runs 30 VUs for 5 min + 60 VUs for headroom
   - Generates docs/LOAD-RESULTS.md
3. Analyze results:
   - p95 pages < 1000 ms? ✓ or identify bottlenecks
   - p95 login < 2000 ms? ✓ or identify auth slowness
   - Error rate < 1%? ✓ or identify failing endpoints
   - Any 5xx errors? Must be zero
4. Document findings: Create docs/LOAD-TEST-FINDINGS.md

**Expected Output**: docs/LOAD-RESULTS.md + findings doc confirming all targets met

#### 5. Cross-Role E2E Tests
**Current State**: Tutor↔Student messaging works, assignment workflow works, but Director approval workflow missing

**Missing E2E Tests**:
1. **Director Approval Workflow**: 
   - Create institution-wide announcement (audienceType="ALL")
   - Verify PENDING_APPROVAL status
   - Director approves announcement
   - Verify students see announcement
   - Create result publication approval (RESULTS_PUBLICATION type)
   - Director approves
   - Verify students see grades

2. **Support Ticket Lifecycle**:
   - Student creates ticket
   - Student sees ticket in dashboard
   - System IT admin sees ticket in /system/support
   - Admin assigns to self
   - Admin replies with canned response
   - Student sees reply via notification
   - Admin marks RESOLVED
   - Student sees resolved status

3. **Announcement Workflow (Institution-Wide)**:
   - Tutor creates course announcement (auto-approved)
   - Director creates institution-wide announcement (requires approval)
   - Verify approval chain works

**Files to Create**: e2e/s8-director-approval.spec.ts, e2e/s8-support-workflow.spec.ts

**Expected Output**: 100% E2E coverage for all communication workflows

---

## Implementation Checklist

### S7 Communication Completion
- [ ] Verify `/dashboard/messages` page is fully functional
  - [ ] List conversations with unread badges
  - [ ] Can send/receive messages in real-time
  - [ ] Read status updates
  - [ ] Mobile responsive (360px)
  - [ ] Dark mode support
- [ ] Verify `/tutor/messages` page
  - [ ] "Message class" broadcast form visible
  - [ ] Can message individual students
  - [ ] Can send broadcast to class
- [ ] Verify `/dashboard/announcements` page
  - [ ] Shows institution + course announcements
  - [ ] Can view announcement details
  - [ ] Sorted by pinned, then date
- [ ] Verify announcement creation pages (all roles)
  - [ ] Can create draft announcement
  - [ ] Approval workflow for institution-wide
  - [ ] Publish/archive states
- [ ] Verify notification system end-to-end
  - [ ] Notification bell badge shows unread count
  - [ ] Clicking bell opens notification drawer (if exists)
  - [ ] Notification type routing works (message → /messages, announcement → /announcements, etc.)
  - [ ] Mark as read functionality
- [ ] Verify support ticket system
  - [ ] Student can create ticket
  - [ ] Admin can view/assign/reply
  - [ ] IT can use canned replies
  - [ ] SLA tracking (first response time)
  - [ ] Ticket status transitions (OPEN → IN_PROGRESS → RESOLVED → CLOSED)
- [ ] Verify all notification channels
  - [ ] IN_APP notifications (primary)
  - [ ] Email notifications (if configured)
  - [ ] User can control per-channel preferences

### S8 Mobile/Performance/Final Proof Completion
- [ ] **Bottom Navigation**
  - [ ] Component created and styled
  - [ ] Renders on mobile (<768px)
  - [ ] Shows 5 primary groups + "More" drawer
  - [ ] Active state highlights
  - [ ] All routes accessible
- [ ] **Performance Optimization**
  - [ ] Database query audit completed
  - [ ] Any N+1 patterns identified and fixed
  - [ ] Redis caching added for frequently accessed data
  - [ ] Cache-Control headers added to routes
  - [ ] Baseline performance metrics documented
- [ ] **Click Audit**
  - [ ] Script executed for all roles: STUDENT, INSTRUCTOR, ADMIN, PRINCIPAL, DIRECTOR, SYSTEM_IT
  - [ ] All generated docs/CLICK-AUDIT-*.md files reviewed
  - [ ] Zero failures (all PASS verdicts)
  - [ ] Known intentional failures documented
- [ ] **Load Test**
  - [ ] k6 script executed: `npm run load:30`
  - [ ] docs/LOAD-RESULTS.md generated
  - [ ] All performance targets verified
    - [ ] p95 pages < 1000 ms
    - [ ] p95 login < 2000 ms
    - [ ] Error rate < 1%
    - [ ] Zero 5xx errors
  - [ ] Findings documented
- [ ] **Cross-Role E2E Tests**
  - [ ] Director approval workflow test written and passing
  - [ ] Support ticket lifecycle test written and passing
  - [ ] All 7 roles tested in real workflows
  - [ ] Mobile responsive tests (360px, 390px, 1440px)
  - [ ] Dark mode verified in key E2E tests

### Integration & Final Verification
- [ ] All S1-S8 sections tested together
- [ ] No regression in S1-S6 functionality
- [ ] Mobile navigation works seamlessly
- [ ] Performance targets maintained
- [ ] All E2E tests passing
- [ ] Click audit shows all pages accessible
- [ ] Load test passes all thresholds
- [ ] Code cleanup and formatting complete
- [ ] Commit message comprehensive and clear

---

## Files Modified/Created

### S7: Communication
- Verify/complete all 28 communication pages (may already be functional)
- Create: e2e/s7-communication.spec.ts (messaging, announcements, notifications, support workflows)
- Create: docs/S7-COMMUNICATION-GUIDE.md (user guide for each role)

### S8: Mobile/Performance/Final Proof
- Modify: src/components/ui/AppShell.tsx (add bottom nav rendering)
- Create: src/components/ui/BottomNav.tsx (mobile tab bar component)
- Create: scripts/optimize-db.ts (query optimization audit script)
- Create: e2e/s8-director-approval.spec.ts (Director approval workflows)
- Create: e2e/s8-support-workflow.spec.ts (Support ticket lifecycle)
- Create: docs/PERFORMANCE-BASELINE.md (before/after metrics)
- Create: docs/CLICK-AUDIT-SUMMARY.md (click audit results)
- Create: docs/LOAD-TEST-FINDINGS.md (k6 results analysis)
- Create: S7-S8-COMPLETION-SUMMARY.md (this implementation summary)

---

## Total E2E Test Coverage Target

**S1-S8 E2E Tests**: 50+ scenarios
- S1: Profile & Avatar (5 tests)
- S2: Dashboard Shell (5 tests)
- S3: Recordings/Timetable (5 tests)
- S4: Learning Module (18 tests)
- S5+S6: Exams/Results/Fees (35 tests)
- S7: Communication (25+ new tests)
  - Messaging (tutor↔student, unread, rate limits)
  - Announcements (create, publish, institution-wide approval)
  - Notifications (bell badge, type routing, mark read)
  - Support (create ticket, assign, reply, resolve)
- S8: Cross-Role + Performance (20+ new tests)
  - Director approval workflow
  - Support ticket lifecycle
  - Mobile navigation
  - Load test results validation

---

## Success Criteria for Full S7+S8

1. ✅ **S7 Communication**: All 28 role pages functional, all workflows E2E tested
2. ✅ **S8 Mobile**: Bottom navigation rendered and usable on mobile
3. ✅ **S8 Performance**: Load test passes all targets (p95 < 1s, error < 1%, zero 5xx)
4. ✅ **S8 Click Audit**: All accessible pages return PASS status
5. ✅ **S8 E2E**: Complete director approval + support ticket workflows tested
6. ✅ **Overall**: Zero regressions in S1-S6, all features production-ready

---

## Timeline & Effort Estimate

| Task | Effort | Priority |
|------|--------|----------|
| Verify S7 pages functional | 2-3 hrs | High |
| Implement bottom nav component | 1 hr | High |
| Run click audit + fix issues | 2 hrs | High |
| Run load test + document | 1 hr | High |
| Write missing E2E tests | 3 hrs | High |
| Performance optimization audit | 2 hrs | Medium |
| Documentation & summaries | 1 hr | Medium |
| **Total** | **~12 hrs** | - |

---

## Success Metrics

- [ ] 100% of communication pages accessible and functional (28/28)
- [ ] 100% of E2E tests passing (50+/50+)
- [ ] 100% click audit PASS status (all roles, all accessible pages)
- [ ] 100% load test targets met (p95 < 1s, error < 1%, zero 5xx)
- [ ] 0 regressions in S1-S6 functionality
- [ ] Mobile navigation responsive and functional
- [ ] All workflows complete (from student enrollment through final certification)

