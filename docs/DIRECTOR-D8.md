# D8: STAFF, ROLES, POLICIES, COMMUNICATION

## Status: COMPLETE

All D8 requirements implemented and tested.

## Implementation

### 1. Staff Accounts (/director/staff)
- Read-only list of all staff with photo, role, email, status, 2FA status, last access review
- Role badges color-coded (Director: danger, IT: warning, others: info/success)
- Director slot counter (2/2 max)
- Access control notice: staff changes require approval requests
- Actions: Request suspend (via approval flow), Reset 2FA (for non-Directors)
- 2FA reset client component with confirmation dialog
- Reset 2FA API: `/api/director/reset-2fa` with audit logging
- Cannot reset own 2FA or another Director's
- No direct edit buttons (read-only enforced)

### 2. Roles and Permissions (/director/roles)
- Comprehensive read-only matrix view
- Role hierarchy (organogram) tree with levels
- Active roles only: Director, Principal, Admin, Academic Registrar, Instructor, Student, IT Admin
- No removed roles: Board Member, Deputy Principal, Teaching Assistant, Finance Officer, HR, Auditor
- Capability matrix generated from real permission code (`can()` function)
- Color-coded cells: Allowed (green), Scoped to own (yellow), Not permitted (gray)
- Capability groups: Students, Courses, Classes, Exams, Certificates, Finance, Staff, Governance, Settings, Reports
- Inheritance rules documented: senior roles inherit junior permissions
- Override rules: nobody approves own request, payment verification needs two people, marks changes need Principal
- Implementation notes: permission-based checks only, record-level scoping, delegation
- Mobile responsive with horizontal scroll for matrix

### 3. Policies and Settings (/director/policies)
- Institution-wide policy settings editable by Director
- Settings: admission approval, payment phases (50/25/25), USD rate, mobile money codes, storage retention, max Director accounts
- Boolean, number, and text input types
- Save all settings button with loading state
- API: `/api/admin/settings` with audit logging for each change
- Each setting change logged with old and new values
- Settings take effect immediately after save
- Success/error messages on form

### 4. Announcements (/director/announcements)
- Read all institution-wide announcements
- Post to all staff or all students (audit logged)
- Uses shared SiteAnnouncementComposer component
- Shows recent 20 announcements with author, pinned status, date
- Every post sends notifications to all recipients

### 5. Messages (/director/messages)
- Inbox section for received messages (shared MessageInbox component)
- Direct message composer with recipient selector
- Send to staff: Principal, Admin, Instructors, Students
- Recipient list shows name and role label
- Sent messages history from audit log (OPERATIONAL_NOTICE_SENT)
- Shows last 20 sent messages with recipient, subject, body, timestamp
- Delivery within 10 seconds via notification system
- Students cannot message Director (enforced by permissions)

### 6. Notifications (/director/notifications)
- Displays all Director notifications: approval needed, approved, rejected, class reminders, payment receipts, system alerts, direct messages, announcements
- Type icons for visual categorization (🔔📢✉️⚠️✅❌)
- Unread count in header
- "Mark all read" button when unread exist
- Unread notifications highlighted with primary color border and background
- Sorted by creation date (newest first)
- Each notification shows subject, body, timestamp, "New" badge if unread
- Empty state when no notifications

## Tests
- Playwright test `e2e/director-d8.spec.ts` with 17 test cases
- Staff page loads with all staff, shows 2FA status, read-only enforced
- Roles matrix loads with 7 active roles, no removed roles mentioned
- Capability matrix shows inheritance and override rules
- Policies page loads with settings form
- Announcements, messages, and notifications pages load correctly
- Mobile (390px) and desktop (1440px) responsive tested for all pages
- Role hierarchy shows correct levels

## Technical Details
- Reset 2FA API checks: cannot reset own, cannot reset another Director, must have 2FA enabled
- Audit log: TOTP_RESET with target user details
- Settings API validates each setting, upserts to database, logs SETTINGS_CHANGED
- RolesPermissionsView generates matrix from RBAC code using `can()` function
- Cell marks: full (allowed), scoped (own records only), denied
- Capability groups match permission structure in `@/lib/rbac`
- ROLE_LABELS map role codes to display names
- ACTIVE_ROLES excludes all removed roles from legacy system

## Files Changed/Created
- `src/app/(director)/director/staff/page.tsx` (existing, verified)
- `src/app/(director)/director/staff/Reset2faButton.tsx` (existing, verified)
- `src/app/(director)/director/roles/page.tsx` (existing, verified)
- `src/app/(director)/director/policies/page.tsx` (existing, verified)
- `src/app/(director)/director/policies/PoliciesEditor.tsx` (existing, verified)
- `src/app/(director)/director/announcements/page.tsx` (existing, verified)
- `src/app/(director)/director/messages/page.tsx` (existing, verified)
- `src/app/(director)/director/notifications/page.tsx` (existing, verified)
- `src/app/api/director/reset-2fa/route.ts` (new)
- `src/app/api/admin/settings/route.ts` (new)
- `src/components/roles/RolesPermissionsView.tsx` (existing, verified)
- `e2e/director-d8.spec.ts` (new)
- `docs/DIRECTOR-D8.md` (this file)
