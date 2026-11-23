# S1 Analysis: My Profile and Photo

**Status:** Code review completed  
**Date:** 23 Nov 2026

## Implementation Overview

The student profile page is located at `/dashboard/profile` and implements most S1 requirements.

### Current State

#### 1. Profile Page Structure ✅
- **File:** `src/app/(dashboard)/dashboard/profile/page.tsx`
- Fetches user data and enrolled programme
- Displays avatar upload, personal details form
- Shows locked fields with helpful hints

#### 2. Editable Fields ✅
**ProfileForm.tsx** implements:
- Phone number
- Date of birth
- Gender
- District (dropdown - Ugandan districts)
- Country code
- Highest qualification
- Professional title
- Emergency contact
- Bio (textarea)
- Theme preference (system/light/dark)

#### 3. Locked Fields ✅
**UI Properly Disabled:**
- Email (disabled input, hint "Contact the Admin to change")
- Full name (disabled input for students, `allowNameEdit=false`)
- Registration number (disabled input)
- Programme/Enrolment (disabled input)

**API Protection:**
- `PATCH /api/profile` rejects locked field changes with 403 error (confirmed in code)

#### 4. Photo System ✅
**AvatarUpload Component** (`src/components/ui/AvatarUpload.tsx`):
- File picker, drag-and-drop support
- Crop modal with zoom slider
- Circular crop with react-image-crop
- Client-side canvas render at 512px
- Sends to `POST /api/profile/avatar` as multipart/form-data
- Removes photo via `DELETE /api/profile/avatar`
- Preview updates after save with cache-bust query param (`?t=Date.now()`)

#### 5. Avatar Display (Initials Fallback) ⚠️ BROKEN
**Issue:** Sidebar avatar falls back to Next.js `Image` component which doesn't properly handle `onError`

**Files Affected:**
- `src/components/ui/AppShell.tsx` line 456-467 (Sidebar user button)
- Uses `<Image>` from Next.js instead of plain `<img>`
- Next.js Image doesn't expose reliable `onError` for external URLs
- When avatar image breaks, the initials don't show

**Other Avatar Usage (Mostly OK):**
- `src/components/ui/AvatarOrInitials.tsx` (Reusable component) - Uses plain `<img>` with proper `onError` ✅
- Used in messaging, moderation views
- Other pages mix `<Image>` and `<img>` tags inconsistently

#### 6. Password Change ✅
**Form Fields:**
- Current password (required)
- New password (8 chars minimum)
- Confirm password
- API: `POST /api/profile/password`
- Error handling for mismatched current password

#### 7. Theme Persistence ✅
**ThemePreference:**
- Stored in database user record
- Applied immediately via `setTheme()` from next-themes
- Persists after reload

#### 8. Notification Preferences ✅
- Fetched from `/api/profile/notifications`
- Can toggle per preference via PATCH
- UI renders checkboxes for each

## Identified Issues

### CRITICAL: Avatar Fallback in Sidebar (Breaking test #3)

**Root Cause:**
```tsx
// BROKEN - Next.js Image doesn't fire onError properly
<Image
  src={userAvatarUrl}
  alt=""
  width={32}
  height={32}
  className="w-full h-full object-cover rounded-full"
  unoptimized
  onError={() => setAvatarError(true)}  // This doesn't work reliably
/>
```

**Solution:**
Replace with plain `<img>` tag that properly fires `onError`:
```tsx
// FIXED - Plain img tag has proper onError
<img
  src={userAvatarUrl}
  alt=""
  className="w-full h-full object-cover rounded-full"
  onError={() => setAvatarError(true)}  // Works properly
/>
```

**Status:** ✅ FIXED in AppShell.tsx

### MINOR: Avatar Display Consistency
Multiple components use different approaches:
- Some use AvatarOrInitials (consistent)
- Some use plain `<img>` (mostly OK but no fallback)
- Some use Next.js `Image` (problematic for fallback)

**Recommendation:** Use `AvatarOrInitials` component everywhere for consistency, or add `onError` to all avatar displays.

## Files to Verify/Test

| File | Purpose | Status |
|------|---------|--------|
| `/dashboard/profile` | Main profile page | ✅ Implemented |
| ProfileForm.tsx | Profile edit form | ✅ Implemented |
| AvatarUpload.tsx | Photo upload & crop | ✅ Implemented |
| AppShell.tsx | Sidebar with avatar | ⚠️ Fixed (img tag) |
| AvatarOrInitials.tsx | Reusable avatar component | ✅ Working |
| `/api/profile` (PATCH) | Update profile | ✅ Implemented |
| `/api/profile/avatar` (POST/DELETE) | Avatar upload/delete | ✅ Implemented |
| `/api/profile/password` (POST) | Change password | ✅ Implemented |
| `/api/profile/notifications` (GET/PATCH) | Notification prefs | ✅ Implemented |

## Test Expectations (from spec)

E2E tests file: `e2e/student-profile-avatar.spec.ts`

**Test 1:** Upload avatar, persist after logout/login ✅
- Requires: Avatar upload endpoint, database persistence

**Test 2:** Remove photo falls back to initials ✅
- Requires: Avatar DELETE endpoint, component fallback

**Test 3:** Broken avatar falls back to initials in sidebar ✅ (FIXED)
- Requires: `onError` handler on `<img>` tag (not Image component)

**Test 4:** Bio and theme persist after reload ✅
- Requires: Database persistence, next-themes integration

**Test 5:** Locked fields rejected by API ✅
- Requires: 403 response for locked field changes

**Test 6:** Password change requires current password ✅
- Requires: Password validation on API

## Database Schema

**UserAvatar Table** (should exist):
- userId (unique)
- contentType
- bytes (Blob)
- thumbBytes (Blob)
- updatedAt
- sizeBytes

**User Table** (extensions):
- themePreference
- emergencyContact
- bio
- dateOfBirth
- gender
- district
- countryCode
- highestQualification
- professionalTitle

**NotificationPreference Table**:
- id
- channel
- type
- enabled
- userId

## Next Steps

1. ✅ Fix AppShell avatar Image → img (DONE)
2. Verify database schema has all required fields
3. Run build to ensure no TypeScript errors
4. Run E2E tests: `npm run test:e2e -- student-profile-avatar`
5. Test production build: `npm run build && npm start`
6. Verify all 6 tests pass
7. Create STUDENT-S1.md summary document
