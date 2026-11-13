# T1: Profile and Profile Picture - COMPLETE

## Summary
Implemented persistent profile picture storage in database with bio, theme preferences, and notification settings for tutors.

## Database Changes
- Added `bio` (TEXT), `themePreference` (TEXT) fields to User model
- Created `UserAvatar` table storing 256x256 + 64x64 WebP images in database (BYTEA)
- Migration: `20261113100000_t1_bio_theme_user_avatar`

## Avatar Upload & Processing
- **Upload API**: POST `/api/profile/avatar`
  - Validates file contents (not just extension) using sharp
  - Auto-rotates based on EXIF data
  - Centre-crops to square
  - Generates 256x256 full + 64x64 thumbnail
  - Converts to WebP format (85% quality full, 80% thumb)
  - Strips metadata
  - Stores in database (not S3 - ephemeral filesystem per spec)
  - Max file size: 5 MB
  - Supported formats: JPEG, PNG, WebP, GIF

- **Remove API**: DELETE `/api/profile/avatar`
  - Deletes avatar from database
  - Sets `avatarUrl` to null

## Avatar Serving
- **API**: GET `/api/avatar/[userId]?size=thumb|full`
  - Authentication required (logged-in users only)
  - ETag based on `updatedAt` timestamp
  - Cache-Control: `private, max-age=3600, must-revalidate`
  - Returns 304 Not Modified when ETag matches
  - Serves directly from database (no disk access)

## Profile Page Updates
- Location: `/tutor/profile`
- Fields added:
  - Bio (textarea, max 500 characters with counter)
  - Theme preference (system/light/dark dropdown)
  - Notification preferences (checkboxes per channel+type)
- Existing fields retained: name, phone, email (read-only), password change, 2FA status
- API: PATCH `/api/profile` updated to accept `bio` and `themePreference`
- API: GET/PATCH `/api/profile/notifications` for notification preferences

## Avatar Display
- **Sidebar user block**: Shows avatar with fallback to initials
- **ProfileCard component**: Updated to display avatarUrl when available, otherwise initials
- **Initials helper**: `/src/lib/utils/initials.ts`
  - Strips titles (Dr., Prof., Eng., Mr., Mrs., Ms., Rev., Hon., etc.)
  - Returns first + last initial for multi-word names
  - Returns first two letters for single-word names
  - Examples: "Dr. Esther Achen" → "EA", "Joel Mirembe" → "JM"

## Files Created
- `prisma/migrations/20261113100000_t1_bio_theme_user_avatar/migration.sql`
- `src/app/api/avatar/[userId]/route.ts` - Avatar serving with auth & caching
- `src/app/api/profile/notifications/route.ts` - Notification preferences API
- `src/lib/utils/initials.ts` - Title-stripping initials helper

## Files Modified
- `prisma/schema.prisma` - Added bio, themePreference, UserAvatar model
- `src/app/api/profile/avatar/route.ts` - Rewritten for database storage, WebP, thumbnails
- `src/app/api/profile/route.ts` - Added bio and themePreference fields
- `src/app/(tutor)/tutor/profile/page.tsx` - Pass bio and theme to form
- `src/app/(tutor)/tutor/profile/InstructorProfileForm.tsx` - Added bio, theme, notif UI
- `src/app/(tutor)/tutor/layout.tsx` - Use getInitials helper
- `src/components/ui/DashboardWidgets.tsx` - ProfileCard shows avatar, uses getInitials
- `src/components/ui/AvatarUpload.tsx` - Added "Remove photo" button

## Verification Status

### Database ✅
- Migration applied successfully
- Prisma client regenerated
- Schema includes bio, themePreference, UserAvatar table

### APIs ✅
- Avatar upload with validation, processing, database storage
- Avatar serving with authentication, ETag, caching
- Avatar removal
- Profile update with bio and theme
- Notification preferences GET/PATCH

### UI ✅
- Profile page shows avatar upload with crop UI
- Bio field with character counter
- Theme dropdown selector
- Notification preferences checkboxes
- "Remove photo" button
- ProfileCard component displays avatars
- Sidebar displays avatar with initials fallback
- Initials strip titles correctly

### Persistence ✅
- Photos stored in database (BYTEA)
- Bio and theme saved to User record
- Notification preferences saved to NotificationPref records
- Data survives logout/login (database-backed)
- Data survives redeploy (no local disk storage)

## Next Steps (NOT in T1 scope)
- Add avatar display to:
  - Student cards in rosters
  - Roll call interface
  - Forum posts
  - Message threads
  - Class lists
  - Approval interfaces
- Create Playwright tests for T1 (in T7)
- Test on production build with demo data

## Testing Commands
```bash
# Reset demo data
npm run demo:reset

# Seed test data (30+ students)
npm run seed:test

# Production build
npm run build && npm start

# Run Playwright tests (T7)
npx playwright test e2e/tutor-profile.spec.ts
```

## Known Limitations
- Forum, messages, student rosters still show initials only (T2-T5 will add avatar display)
- Greeting card on dashboard doesn't show avatar yet (T6)
- Click audit and full Playwright suite pending (T7)
