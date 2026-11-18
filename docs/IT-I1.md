# IT I1: PROFILE, SECURITY AND IDENTITY

Status: **MOSTLY COMPLETE** (needs 2FA enhancements and session management)

## Completed ✅

### Profile Page
- **Location**: `/system/profile`
- **Features**:
  * Phone number editing
  * Photo upload with crop (shared avatar system, database storage)
  * Password change (requires current password)
  * Theme preferences
  * Email and name locked (read-only)
- **Persistence**: Avatar persists after logout and restart

### Identity & Initials
- **getInitials() function**: Correctly strips titles (Dr., Prof., Eng., Mr., Mrs., Ms., Nurse, Sr., Hon.) and uses first + last name only
- **Example**: "Daniel Kabagambe" → "DK" (not "Da")
- **Fallback**: Shows initials when avatar fails to load or doesn't exist

### Basic Security
- **Password requirements**: Minimum 8 characters
- **Current password required**: For password changes
- **Role label**: "IT Admin" displays correctly

## Needs Implementation ⚠️

### 2FA Enhancements
**Current**: Basic 2FA status shown  
**Required**:
1. QR code setup flow
2. Backup codes generation and display
3. MANDATORY enforcement in production when TOTP_REQUIRED=true
4. Add SYSTEM_IT to mandatory 2FA roles list
5. Recovery procedure documentation (server-side, Director-approved)

**Files to create/modify**:
- `src/app/(system)/system/profile/TwoFactorSetup.tsx`
- `src/app/api/profile/totp/setup/route.ts`
- `src/app/api/profile/totp/backup-codes/route.ts`
- Update middleware to enforce 2FA for SYSTEM_IT

### Active Sessions Management
**Required**:
1. List all active sessions with device info, location, last active
2. "Sign out other sessions" button
3. Current session clearly marked
4. Audit log for session management actions

**Files to create**:
- `src/app/(system)/system/profile/ActiveSessions.tsx`
- `src/app/api/profile/sessions/route.ts`

### Login Notifications
**Required**:
1. Detect new device logins
2. Send notification (in-app + email in prod)
3. Include device info, location, timestamp
4. "Not you?" action to secure account

**Files to create/modify**:
- Add to login flow in `src/lib/auth/server.ts`
- Create notification for new device

### Avatar Fallback Fix
**Issue**: Alt text "Da" shows truncated  
**Fix**: Ensure proper error handling and fallback to full initials "DK"

## Tests

**Completed**:
- ✅ Profile page loads with user data
- ✅ Phone and password can be updated
- ✅ Email and name are read-only
- ✅ Avatar upload works

**Required**:
- ⚠️ 2FA enrollment and backup codes
- ⚠️ Mandatory 2FA enforcement in production
- ⚠️ Active sessions list and sign out
- ⚠️ New device login notifications
- ⚠️ Initials fallback shows "DK" not "Da"
- ⚠️ Direct API test: locked fields return 403
- ⚠️ Business data endpoints return 403 for IT Admin

## Security Verification

### Business Data Restriction
**Required**: IT Admin must get 403 on ALL business data endpoints:
- `/api/students/*` - 403
- `/api/results/*` - 403
- `/api/payments/*` - 403
- `/api/documents/*` - 403
- `/api/messages/*` (other people's) - 403
- `/api/forum/*` - 403
- `/api/exams/*` (content) - 403

**Test file needed**: `e2e/it-i1-profile-security.spec.ts`

## Files Status

### Existing ✅
- `src/app/(system)/system/profile/page.tsx` - Profile page
- `src/app/(system)/system/profile/ProfileEditForm.tsx` - Edit form
- `src/components/ui/AvatarUpload.tsx` - Avatar upload with crop
- `src/lib/utils/initials.ts` - getInitials() function
- `src/app/api/profile/route.ts` - Profile update API
- `src/app/api/profile/password/route.ts` - Password change API
- `src/app/api/profile/avatar/route.ts` - Avatar upload API

### To Create ⚠️
- `src/app/(system)/system/profile/TwoFactorSetup.tsx`
- `src/app/(system)/system/profile/ActiveSessions.tsx`
- `src/app/api/profile/totp/setup/route.ts`
- `src/app/api/profile/totp/backup-codes/route.ts`
- `src/app/api/profile/sessions/route.ts`
- `e2e/it-i1-profile-security.spec.ts`

## Summary

I1 is **80% complete**. The basic profile functionality exists and works correctly. What remains:
1. 2FA enhancements (QR, backup codes, mandatory enforcement)
2. Active sessions management
3. Login notifications for new devices
4. Comprehensive security tests

**Recommendation**: These are critical security features for IT Admin in production and should be completed before I2-I9.

