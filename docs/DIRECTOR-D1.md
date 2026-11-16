# D1 - Profile, Security and Identity

## Completed

**Greeting fix**
- Seed updated: `name = "Mathias Senyondo"`, `professionalTitle = "Dr."` (separated).
- Director layout fetches both fields; passes `userName = "Mathias Senyondo"` to AppShell
  (feeds the greeting via `getFirstName` -> "Hello Mathias!") and `userDisplayName = "Dr. Mathias
  Senyondo"` for the sidebar user block.
- `userInitial` is now `"M"` (first char of name without title).

**Avatar / broken image fix**
- Sidebar avatar `<Image>` now has `alt=""` (the containing `<span>` is `aria-hidden`).
  No browser-rendered text appears when the image fails; React `onError` falls back to
  `getInitials(userName)` = "MS".
- `AppShell` accepts an optional `userDisplayName` prop (backward-compatible); other portals
  unaffected.

**Profile page (`/director/profile`)**
- Fetches `professionalTitle` and `themePreference`; full display name shown correctly.
- `ProfileEditForm` rewritten: editable fields are title, phone, theme; full name and email
  are locked. Password change requires current password. 2FA status shown with setup link
  when not enabled.

**Two-factor authentication**
- 2FA setup and backup-code flow already existed; now linked from the profile page.
- `totpVerifiedAt` written on every successful TOTP or backup-code login (was a dead field).
- Re-auth guard utility: `src/lib/auth/require-recent-totp.ts` (15-minute window).
- Applied to `POST /api/director/reset-2fa`.
- Re-auth page at `/director/reauth` with TOTP or backup-code input.
- API at `POST /api/director/reauth` verifies code and refreshes `totpVerifiedAt`.

**Active sessions**
- `GET /api/profile/sessions` returns non-expired sessions with `isCurrent` flag.
- `DELETE /api/profile/sessions/[id]` revokes a session (cannot revoke current session).
- Profile page shows active sessions list with sign-out buttons.

**Security event notifications**
- Login audit: every successful email+password login writes an `AuditLog` entry with
  `action = LOGIN`, role, identifier, IP.
- New-device detection: compares login IP to known IPs in audit logs (30-day window); if new,
  creates an in-app `Notification` for the Director (or for the Director if the Principal logs in
  from a new IP).
- Repeated failures: after 3 failed logins on a DIRECTOR or PRINCIPAL account, creates an
  in-app notification to the Director (deduplicated per hour).
- 2FA reset: `POST /api/director/reset-2fa` now notifies both the target user and the Director.

## Verified

- `npx tsc --noEmit --skipLibCheck` : 0 errors
- `npm run build` : compiled successfully, 287 static pages
- `npx prisma db seed` : seeded cleanly, Director = `{name: "Mathias Senyondo", professionalTitle: "Dr."}`
