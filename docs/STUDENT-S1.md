# STUDENT S1: My Profile and Photo

## Status: COMPLETE

## What was done
- Student profile page now fetches bio, themePreference and enrolled programme.
- ProfileForm extended with bio textarea, theme select (system/light/dark),
  notification preferences (auto-creates defaults), and a locked Programme field.
- All locked fields (email, name, registration number, programme) show
  "Contact the Admin to change." and are rejected by the API (403) for students.
- ThemeSync component applies the DB theme on dashboard mount.
- Sidebar avatar falls back to getInitials (first+last, titles ignored) with
  onError handling. Same fix applied to AvatarOrInitials and AvatarUpload.
- Admin/Principal profile pages updated to pass new props.

## Files changed
- src/app/(dashboard)/dashboard/profile/page.tsx
- src/app/(dashboard)/dashboard/profile/ProfileForm.tsx
- src/app/(dashboard)/dashboard/layout.tsx
- src/components/ui/AppShell.tsx (shared)
- src/components/ui/AvatarUpload.tsx (shared)
- src/components/ui/AvatarOrInitials.tsx (shared)
- src/components/ui/ThemeSync.tsx (new)
- src/app/api/profile/route.ts
- src/app/api/profile/notifications/route.ts
- src/app/(admin)/admin/profile/page.tsx
- src/app/(principal)/principal/profile/page.tsx
- e2e/student-profile-avatar.spec.ts (new)

## Test evidence
- 6/6 student S1 Playwright tests pass (upload, logout/login, initials fallback,
  bio/theme persist, locked fields rejected, password requires current).
- 5/5 tutor T1 tests pass (no regression in shared components).
- Build passes, tsc clean.
