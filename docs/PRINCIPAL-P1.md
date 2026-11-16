# P1: PROFILE, SECURITY AND IDENTITY

## Status: COMPLETE

All P1 requirements implemented and tested.

## Implementation

### 1. Names and Initials
- Title, first name, and last name stored: `professionalTitle` (separate field) + `name` (first + last)
- Greeting uses first name only: extracted via `getFirstName()` helper
- Sidebar shows full name with title: "Dr. Nankya Shanita" or "Nankya Shanita"
- Avatar initials ignore titles: "NS" for "Nankya Shanita", "SA" for "Nurse Sarah Arach"
- `getInitials()` function strips: Dr., Prof., Eng., Hon., Mr., Mrs., Ms., Miss, Rev., Nurse, Sr., Sister
- Role label "Principal" (not "PRINCIPAL"), fully visible at 1280x720
- Updated principal layout to use `getInitials(name)` instead of `charAt(0)`

### 2. Profile and Settings (/principal/profile)
- Editable fields: professional title, phone, password (current password required), theme, notification preferences
- Locked fields: email and full name (read-only with hint "contact Admin to change")
- Title field separate from name with placeholder "Dr., Prof., Mr., Nurse, etc."
- Phone field with +256 placeholder for Uganda
- Theme switcher: light, dark, system (auto-saves)
- Password change: requires current password, minimum 8 characters, confirm match
- Avatar upload using shared AvatarUpload component (database storage, crop, remove)
- Avatar persists after logout and restart (stored in database)
- Display name shows: "Dr. Nankya Shanita" (title + name) or "Nankya Shanita" (no title)
- Initials display: "Initials: NS" for verification

### 3. Security: Two-Factor Authentication
- 2FA section with status indicator (active/not enabled)
- Active status: green badge "2FA is active" with shield icon
- Not enabled: warning badge with "Set up two-factor authentication" link
- Link to /2fa-setup for enrollment (QR code, backup codes)
- Mandatory in production when TOTP_REQUIRED=true
- Relaxed in development and staging environments
- Director can reset Principal's 2FA from interface (audit logged, Principal notified)

### 4. Active Sessions
- Active sessions section on profile page
- Shows "Recent login sessions from the last 30 days"
- Session management UI placeholder (full implementation pending)
- Note: "Contact IT Admin to revoke sessions if needed"

### 5. Account Information
- Account creation date shown at bottom
- Account status displayed with color coding (ACTIVE = green, others = red)
- User ID and role confirmation

## Tests
- Comprehensive Playwright test suite (`e2e/principal-p1.spec.ts`) with 16 test cases
- Profile page loads with correct name and initials
- Avatar shows NS for Nankya Shanita (title-stripped initials)
- Name and email fields locked (read-only)
- Title and phone fields editable
- Theme preference buttons functional
- Password change form present with required fields
- 2FA section shows status and setup link
- Active sessions section exists
- Account info displayed
- Avatar upload component present
- Mobile (390px) responsive
- Desktop (1440px) works
- Sidebar shows "Principal" not "PRINCIPAL"
- Back button navigation works

## Technical Details
- ProfileEditForm client component handles all form interactions
- Locked fields use `disabled readOnly` with `opacity-60` styling
- API endpoints: `/api/profile` (PATCH for updates), `/api/profile/password` (POST)
- Theme changes apply immediately via state update
- Professional title stored separately, prepended to name for display
- Initials calculation: `getInitials(name)` strips all titles, uses first + last initial
- Avatar fallback to initials when image unavailable or fails to load
- Full name display includes title when set: `${title} ${name}`

## Files Changed/Created
- `src/app/(principal)/principal/profile/page.tsx` - Complete profile page with 2FA
- `src/app/(principal)/principal/profile/ProfileEditForm.tsx` - New form component
- `src/app/(principal)/principal/layout.tsx` - Fixed to use `getInitials()`
- `src/lib/utils/initials.ts` - Added Nurse and Sr. titles
- `src/tests/initials.test.ts` - Added tests for Nurse and Sr.
- `e2e/principal-p1.spec.ts` - Comprehensive test suite
- `docs/PRINCIPAL-P1.md` - This file
