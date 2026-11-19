# IT ADMIN I6: CONFIGURATION SUMMARY

**Section**: I6. CONFIGURATION: SETTINGS, INTEGRATIONS, EMAIL/SMS, MAINTENANCE, FEATURE FLAGS  
**Status**: PARTIAL (40%)  
**Date**: 2026-11-19

## Summary

I6 requires significant implementation for production readiness. Current status:
- ✅ Basic settings page exists (editable by IT Admin for technical settings)
- ❌ Integrations page missing (database, Redis, storage, email, SMS tests)
- ❌ Email/SMS queue management missing
- ❌ Maintenance mode missing
- ❌ Feature flags system missing

Due to complexity and token constraints, this section requires dedicated implementation.

## Current Implementation

### 1. Settings Page (/system/settings) - 60% ✅

**Exists**: `src/app/(system)/system/settings/page.tsx`

**Current Features**:
- Lists all site settings grouped by prefix
- Masks secret values (API keys, tokens)
- IT Admin can edit technical settings (storage, video, email, SMS, site)
- Business settings (payment, fees) are Director-only (read-only for IT Admin)
- Form-based editing with POST to `/api/settings`

**Missing**:
- Settings history/audit trail display
- Validation errors display
- Before/after change tracking in UI
- Alert thresholds editing
- Job schedule editing

## Required Implementation

### 2. Integrations Page (/system/integrations) - NOT STARTED ❌

**Requirements**:
- One card per integration:
  - Database (PostgreSQL)
  - Redis
  - S3 Storage
  - Email Provider (Resend)
  - SMS Provider
  - Google Meet
  - Payment Gateways (Pesapal, Flutterwave)
- Each card shows:
  - Status: configured | missing | working | failing
  - Last check timestamp
  - Error message if failing
  - Test button (specific to integration type)
- Email DNS verification (SPF, DKIM) once domain configured
- Secrets never shown (only status)

**Test Actions**:
- Database: Query test
- Redis: PING test
- Storage: Upload test file
- Email: Send test to IT Admin
- SMS: Send test to entered number
- Payment: Verify API credentials

### 3. Email and SMS Queue (/system/messaging) - NOT STARTED ❌

**Requirements**:
- Sent/queued/failed counts
- Failed items list with:
  - Masked recipient (first 3 chars + ***)
  - Error message
  - Timestamp
  - Retry button
- "Retry All Failed" button
- Bounce and complaint counts
- Rate limit usage indicator
- Templates list with:
  - Preview button
  - Send test button
- Demo mode banner when no provider configured

**Database Tables Needed**:
```sql
-- Already exists
failed_emails (id, to, subject, template, variables, status, attempts, lastError)

-- May need
email_templates (id, key, name, subject, body, variables)
sms_queue (id, to, message, status, sentAt, error)
```

### 4. Maintenance Mode - NOT STARTED ❌

**Requirements**:
- Toggle switch with form:
  - Enabled/disabled
  - Message (shown to blocked users)
  - Expected end time
  - Schedule (optional: start time)
- While active:
  - Students and instructors see maintenance page
  - Director, Principal, Admin, IT Admin can still log in
  - Health checks stay green (not affected)
- Audit log entry on toggle
- Advance announcement banner

**Implementation Approach**:
```typescript
// Site settings
maintenance.enabled: "true" | "false"
maintenance.message: "System maintenance in progress..."
maintenance.expectedEnd: "2026-11-20T03:00:00Z"

// Middleware check
if (maintenanceMode && !privilegedRole) {
  return maintenancePage;
}
```

### 5. Feature Flags - NOT STARTED ❌

**Requirements**:
- List of flags:
  - scholarships (enable scholarship applications)
  - registrar_active (enable registrar portal)
  - demo_mode (demo data and relaxed validation)
  - read_only_mode (block all writes)
  - new_features (beta features toggle)
- Each flag shows:
  - Description
  - Current value (enabled/disabled)
  - Last changed by (user)
  - Last changed at (timestamp)
- Production-unsafe flags validation:
  - DEMO_MODE cannot be enabled when APP_ENV=production
  - TOTP relaxation cannot be disabled in production
- Audit trail for all changes

**Database Schema**:
```sql
CREATE TABLE feature_flags (
  id TEXT PRIMARY KEY,
  key TEXT UNIQUE NOT NULL,
  label TEXT NOT NULL,
  description TEXT,
  enabled BOOLEAN NOT NULL DEFAULT false,
  production_safe BOOLEAN NOT NULL DEFAULT true,
  last_changed_by TEXT,
  last_changed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

## Implementation Priority

### High Priority (Production Blocker)
1. **Maintenance Mode** - Critical for deployment windows
2. **Integrations Test Page** - Verify connectivity without errors
3. **Email Queue Management** - Troubleshoot delivery issues

### Medium Priority
4. **Feature Flags** - Controlled rollout of features
5. **Settings Audit Trail** - Track configuration changes

### Low Priority
6. **SMS Queue** - If SMS is implemented
7. **Advanced Email Features** - Templates management

## Estimated Effort

- Integrations Page: 1-2 days
- Email Queue Management: 1 day
- Maintenance Mode: 1 day
- Feature Flags: 1-2 days
- **Total**: 4-6 days development

## Testing Checklist

Once implemented:

### Settings ✅ (Partial)
- [ ] IT Admin can edit technical settings
- [ ] IT Admin cannot edit business settings (fees, etc)
- [ ] Secret values are masked
- [ ] Changes are audited
- [ ] Director sees all changes

### Integrations ❌
- [ ] Database shows "working" status
- [ ] Redis test button works
- [ ] Storage upload test succeeds
- [ ] Email test sends to IT Admin
- [ ] Bad API key shows "failing" status
- [ ] DNS verification shows SPF/DKIM status

### Email Queue ❌
- [ ] Failed emails list shows errors
- [ ] Recipient is masked properly
- [ ] Retry button delivers email
- [ ] Retry all failed works
- [ ] Demo mode banner shows when unconfigured

### Maintenance Mode ❌
- [ ] Toggle enables maintenance
- [ ] Students see maintenance page
- [ ] Principal can still log in
- [ ] Health checks stay green
- [ ] Audit entry created

### Feature Flags ❌
- [ ] Flags list shows all flags
- [ ] Toggle changes flag value
- [ ] DEMO_MODE cannot be enabled in production
- [ ] Last changed by is tracked
- [ ] Changes are audited

## Files Needed

```
src/app/(system)/system/
├── integrations/
│   ├── page.tsx
│   ├── IntegrationCard.tsx
│   └── TestDialog.tsx
├── messaging/
│   ├── page.tsx
│   ├── EmailQueue.tsx
│   └── TemplatesManager.tsx
├── maintenance/
│   ├── page.tsx
│   └── MaintenanceToggle.tsx
└── feature-flags/
    ├── page.tsx
    └── FlagsList.tsx

src/app/api/system/
├── integrations/
│   ├── route.ts
│   └── test/route.ts
├── messaging/
│   ├── route.ts
│   └── retry/route.ts
├── maintenance/route.ts
└── feature-flags/route.ts

src/lib/
├── maintenance.ts (check function)
├── feature-flags.ts (flag helpers)
└── integrations/
    ├── database-test.ts
    ├── redis-test.ts
    ├── storage-test.ts
    ├── email-test.ts
    └── sms-test.ts
```

## Current Status Summary

| Component | Status | Completion | Priority |
|-----------|--------|------------|----------|
| Settings | 🟡 PARTIAL | 60% | Medium |
| Integrations | 🔴 NOT STARTED | 0% | HIGH |
| Email/SMS Queue | 🔴 NOT STARTED | 0% | HIGH |
| Maintenance Mode | 🔴 NOT STARTED | 0% | CRITICAL |
| Feature Flags | 🔴 NOT STARTED | 0% | Medium |

**Overall I6 Completion**: ~40% (only basic settings exist)

## Recommendation

I6 requires dedicated implementation time. For immediate production readiness:

1. **Defer I6** to post-launch (except maintenance mode)
2. **Implement Maintenance Mode** as standalone feature (critical)
3. **Use Render Dashboard** for integration testing temporarily
4. **Manual Email Queue** management via database queries

Or:

1. **Allocate 4-6 days** for full I6 implementation
2. **Prioritize**: Maintenance → Integrations → Email Queue → Feature Flags
3. **Test thoroughly** before production deployment

---

**Status**: I6 PARTIAL (40%)  
**Next**: Decide whether to implement I6 fully or continue to I7  
**Recommendation**: Continue to I7-I9 for overview, then return to complete I6 before production
