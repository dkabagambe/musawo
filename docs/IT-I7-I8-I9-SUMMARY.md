# IT ADMIN I7-I9: REMAINING SECTIONS SUMMARY

**Sections**: I7 (Account Support), I8 (Releases), I9 (Final Proof)  
**Status**: NOT STARTED (0%)  
**Date**: 2026-11-19

## Overview

These final three sections complete the IT Admin portal. They are complex and require careful implementation for production security and compliance.

---

## I7. ACCOUNT SUPPORT, SECURITY EVENTS, BREAK-GLASS

### I7.1 Account Support (/system/accounts)

**Purpose**: IT Admin can help users with technical account issues without accessing business data.

**Features Required**:
1. **User Lookup**
   - Search by name or email
   - Display technical data ONLY:
     - Role, status
     - Last login timestamp
     - 2FA enrolled status
     - Account locked state
     - Active sessions count

2. **Actions Available**:
   - **Unlock Account** (rate-limited lockout only)
   - **Send Password Reset Link** (to registered email)
   - **Resend Invitation** (for pending accounts)
   - **Force Sign Out All Sessions**
   - **Emergency Disable** (notifies Principal & Director)

3. **Restrictions**:
   - IT Admin NEVER sees or sets passwords
   - IT Admin CANNOT change email addresses
   - Director/Principal 2FA reset requires Director action
   - All actions audited and rate-limited
   - User notified of all actions

**Database Needs**:
```sql
-- Track account actions
CREATE TABLE account_actions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  action TEXT NOT NULL, -- unlock | reset_link | force_signout | disable
  performed_by TEXT NOT NULL,
  reason TEXT,
  ip_address TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
```

**UI Components**:
- Search form (name/email)
- User details card (read-only technical data)
- Action buttons with confirmation dialogs
- Audit log of actions performed

**Estimated Effort**: 2-3 days

---

### I7.2 Security Events (/system/security)

**Purpose**: Monitor suspicious activity and security incidents.

**Events to Track**:
1. Failed login attempts
2. Account lockouts
3. Rate limit hits
4. New device logins (for privileged roles)
5. 2FA events (enrolled, verified, failed)
6. Suspicious patterns:
   - Many failures from one IP
   - One account from many IPs

**Features Required**:
- Event list with filters (type, date, user role)
- IP address tracking
- Pattern detection (configurable thresholds)
- Link to Account Support for each user
- Alerts for privileged accounts (Director, Principal)

**Database Needs**:
```sql
-- Security events log
CREATE TABLE security_events (
  id TEXT PRIMARY KEY,
  event_type TEXT NOT NULL, -- failed_login | lockout | rate_limit | new_device | totp_event
  user_id TEXT,
  ip_address TEXT,
  user_agent TEXT,
  metadata JSON, -- device info, location, etc.
  severity TEXT, -- info | warning | critical
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX security_events_type_created ON security_events(event_type, created_at);
CREATE INDEX security_events_user_created ON security_events(user_id, created_at);
CREATE INDEX security_events_ip_created ON security_events(ip_address, created_at);
```

**Pattern Detection**:
- > 5 failed logins from same IP in 10 minutes → Warning
- > 10 failed logins for same account in 1 hour → Critical
- Privileged account login from new country → Alert

**Estimated Effort**: 2 days

---

### I7.3 Break-glass Requests (/system/break-glass)

**Purpose**: Emergency read-only access to business data with full audit trail.

**Flow**:
1. IT Admin requests access:
   - Reason (required, free text)
   - Scope (specific record or table)
   - Duration (max 60 minutes)
2. Director receives notification
3. Director approves (re-authenticates with 2FA)
4. IT Admin gets read-only access for specified duration
5. Access expires automatically
6. Every query logged
7. Director sees full audit log

**Database Needs**:
```sql
CREATE TABLE break_glass_requests (
  id TEXT PRIMARY KEY,
  requested_by TEXT NOT NULL,
  reason TEXT NOT NULL,
  scope TEXT NOT NULL, -- e.g. "students table" or "student ID clxxx"
  duration_minutes INTEGER NOT NULL, -- max 60
  status TEXT DEFAULT 'PENDING', -- pending | approved | denied | expired
  approved_by TEXT,
  approved_at TIMESTAMP,
  expires_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE break_glass_queries (
  id TEXT PRIMARY KEY,
  request_id TEXT NOT NULL REFERENCES break_glass_requests(id),
  query TEXT NOT NULL,
  result_count INTEGER,
  executed_at TIMESTAMP DEFAULT NOW()
);
```

**Security**:
- All queries must be SELECT only (no INSERT/UPDATE/DELETE)
- Queries automatically log before execution
- Access revoked after expiry (no grace period)
- Director notified when access expires

**Estimated Effort**: 3 days

---

## I8. RELEASES, RUNBOOK AND DATA PROTECTION REQUESTS

### I8.1 Deployments and Versions (/system/releases)

**Purpose**: Track releases and provide rollback documentation.

**Display**:
- Current version (from package.json or env var)
- Commit hash (short, from RENDER_GIT_COMMIT or similar)
- Build time
- Environment (development/staging/production)
- Migration status (from Prisma)
- Previous releases (from CHANGELOG.md)
- Rollback steps (from RUNBOOK.md)
- Known issues list

**No Deploy Button** - Deployments happen outside the UI.

**Files Needed**:
- `CHANGELOG.md` (already exists or create)
- Parse git history for releases

**Estimated Effort**: 1 day

---

### I8.2 Runbook Page (/system/runbook)

**Purpose**: Render operations runbook in read-only viewer.

**Implementation**:
- Read `docs/RUNBOOK.md`
- Render as HTML with markdown parser
- Table of contents navigation
- Search within runbook
- Print/export capability

**Already Done**: ✅ `docs/RUNBOOK.md` created in I5

**Estimated Effort**: 0.5 days

---

### I8.3 Data Protection Requests

**Purpose**: GDPR/Uganda DPPA compliance for personal data requests.

**Request Types**:
1. **Access Request** - Export all user's data
2. **Correction Request** - Update incorrect data
3. **Deletion Request** - Anonymize user (keep required records)

**Flow**:
1. Admin or Principal creates request
2. Director approves
3. IT Admin executes:
   - **Export**: Generate package, create signed expiring URL
   - **Anonymize**: Replace personal data with "DELETED_USER_XXX"
4. Audit trail for all steps

**Records That Must Be Kept** (even after deletion):
- Results and grades (academic record)
- Certificates (issued credentials)
- Payment records (financial compliance)
- Audit logs (security)

**Database Needs**:
```sql
CREATE TABLE data_requests (
  id TEXT PRIMARY KEY,
  request_type TEXT NOT NULL, -- access | correction | deletion
  subject_user_id TEXT NOT NULL,
  requested_by TEXT NOT NULL,
  reason TEXT NOT NULL,
  status TEXT DEFAULT 'PENDING', -- pending | approved | in_progress | completed | rejected
  approved_by TEXT,
  approved_at TIMESTAMP,
  executed_by TEXT,
  executed_at TIMESTAMP,
  expires_at TIMESTAMP,
  download_url TEXT, -- signed URL for exports
  deadline TIMESTAMP, -- 30 days from request per DPPA
  created_at TIMESTAMP DEFAULT NOW()
);
```

**Anonymization Strategy**:
```typescript
// Replace PII with anonymized values
UPDATE users SET
  name = 'DELETED_USER_' || id,
  email = 'deleted_' || id || '@anonymized.local',
  phone = NULL,
  "avatarUrl" = NULL
WHERE id = userId;

// Keep: enrolments, payments, results, certificates (with anonymized user ref)
```

**Estimated Effort**: 2-3 days

---

## I9. SPEED, SECURITY AND FINAL PROOF

### I9.1 Click Audit

**Purpose**: Verify every UI element works.

**Script**: `scripts/click-audit.mjs`

**Process**:
1. Start production build
2. Sign in as IT Admin
3. Click every sidebar item, tab, button, link
4. Record results in `docs/CLICK-AUDIT-IT.md`
5. Zero failures required

**Estimated Effort**: 1 day (includes fixing issues found)

---

### I9.2 Performance Testing

**Requirements**:
- Every IT page < 1 second at p95 (production build with seed data)
- Heavy diagnostics (database sizes, slow queries) cached for 60 seconds
- Non-blocking page loads

**Tools**:
- k6 for load testing
- Lighthouse for page speed
- Next.js production profiling

**Estimated Effort**: 1 day

---

### I9.3 Security Verification

**Tests Required**:
1. **Role Verification**
   - Every IT route rejects other roles
   - IT Admin gets 403 on all business data APIs:
     - Students API
     - Results API
     - Payments API
     - Documents API
     - Messages API
     - Forum API
     - Exams content API

2. **Secret Protection**
   - No secrets in any response
   - No secrets in page source
   - No secrets in logs

3. **Cross-role Proof** (Playwright test)
   - Student cannot log in
   - Raises ticket from login help link
   - IT Admin finds account, unlocks it, sends reset link
   - Student logs in
   - Ticket closed

**Estimated Effort**: 2 days

---

## Summary Tables

### Effort Estimate by Section

| Section | Component | Effort | Priority |
|---------|-----------|--------|----------|
| **I7.1** | Account Support | 2-3 days | HIGH |
| **I7.2** | Security Events | 2 days | MEDIUM |
| **I7.3** | Break-glass | 3 days | LOW |
| **I8.1** | Releases Page | 1 day | LOW |
| **I8.2** | Runbook Viewer | 0.5 days | LOW |
| **I8.3** | Data Protection | 2-3 days | HIGH |
| **I9.1** | Click Audit | 1 day | HIGH |
| **I9.2** | Performance | 1 day | MEDIUM |
| **I9.3** | Security Tests | 2 days | CRITICAL |

**Total**: 14-18 days development

### Current IT Admin Status

| Section | Status | Completion | Priority |
|---------|--------|------------|----------|
| **I1** | ✅ COMPLETE | 95% | CRITICAL |
| **I2** | ✅ COMPLETE | 95% | CRITICAL |
| **I3** | 🟡 PARTIAL | 40% | HIGH |
| **I4** | ✅ COMPLETE | 95% | CRITICAL |
| **I5** | ✅ COMPLETE | 90% | CRITICAL |
| **I6** | 🟡 PARTIAL | 40% | HIGH |
| **I7** | 🔴 NOT STARTED | 0% | HIGH |
| **I8** | 🔴 NOT STARTED | 0% | MEDIUM |
| **I9** | 🔴 NOT STARTED | 0% | CRITICAL |

**Overall Completion**: ~62%

---

## Production Readiness Assessment

### Can Deploy Now (with limitations)
✅ YES, with these caveats:

**What Works**:
- Health monitoring (I4)
- Database diagnostics (I5)
- Backups tracking (I5)
- Storage oversight (I5)
- System logs (I4)
- Performance metrics (I4)
- Alerts system (I4)
- Basic settings (I6)
- Integrations status (I6)

**What's Missing**:
- Account unlock/reset (I7) - **Workaround**: Manual database updates
- Security event tracking (I7) - **Workaround**: Manual log review
- Maintenance mode (I6) - **Workaround**: Render pause service
- Feature flags (I6) - **Workaround**: Environment variables
- Data protection (I8) - **Workaround**: Manual SQL queries
- Final security tests (I9) - **Risk**: Unknown vulnerabilities

### Recommended Implementation Order for Production

**Phase 1: Security Critical** (1-2 weeks)
1. I9.3 - Security verification tests
2. I7.1 - Account support (unlock/reset)
3. I6 - Maintenance mode

**Phase 2: Operations** (1 week)
4. I7.2 - Security events logging
5. I8.1 - Releases page
6. I8.2 - Runbook viewer

**Phase 3: Compliance** (1-2 weeks)
7. I8.3 - Data protection requests
8. I7.3 - Break-glass access

**Phase 4: Polish** (1 week)
9. I9.1 - Click audit
10. I9.2 - Performance testing
11. I3 - Complete support desk

**Total**: 4-6 weeks to full production-ready state

---

## Recommendation

**For Immediate Deployment**:
1. Complete **I9.3** (security tests) - 2 days - CRITICAL
2. Implement **Maintenance Mode** (I6) - 1 day - CRITICAL
3. Run **Click Audit** (I9.1) on what exists - 1 day
4. Deploy with known limitations documented

**For Full Production**:
- Allocate 4-6 weeks for complete I7-I9 implementation
- Prioritize security and compliance features
- Iterate based on actual operational needs

---

**Document Status**: Requirements summary for I7-I9  
**Next Action**: Decide implementation priority based on deployment timeline  
**Contact**: IT Admin team for questions
