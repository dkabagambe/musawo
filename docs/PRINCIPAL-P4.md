# P4: PEOPLE - Students, Admissions, Instructors, User Management

## Status: IN PROGRESS

Initial implementation of Students module complete. Admissions, Instructors, and User Management have basic list views but require full CRUD forms.

## Completed

### Students (/principal/students)
- List page with search by name or student number
- Pagination (25 per page)
- Filters: search query
- Student detail page (/principal/students/[id]) with:
  - Profile information (name, email, phone, DOB, gender, district, emergency contact)
  - Status badge (ACTIVE, SUSPENDED, PENDING_VERIFICATION, etc.)
  - Enrolments list with course, status, and paid percentage
  - Recent attendance records (last 10)
  - Recent exam attempts (last 10)
  - Certificates issued
- "New Student" button (form not yet implemented)
- "Edit" button on detail page (form not yet implemented)
- "Archive/Restore" button placeholder (API not yet implemented)
- Link from list to detail page via student number

## Not Yet Implemented

### Students
- Create student form
- Edit student form
- Archive/restore API and functionality
- Export CSV (audit logged)
- Registration number generator integration
- Documents upload/view
- Approvals history view
- Payment status detailed view

### Admissions (/principal/admissions)
- Currently has basic list with filters
- Needs: direct registration form, bulk approve, better integration with approval workflow

### Instructors (/principal/instructors)
- Currently has basic list
- Needs: create by invitation (email with set-password link), edit, archive/restore, performance view, detail page, assign to courses

### User Management (/principal/user-management)
- Currently has basic list with role filter
- Needs: invite, resend invite, password reset link, deactivate, archive/restore
- Role assignment for Admin/Instructor/Student (immediate)
- Role assignment for Director/Principal (approval workflow)
- Cannot create/edit Director
- Academic Registrar inactive display

## Technical Notes
- Student detail page includes all major relations (enrolments, attendance, examAttempts, certificates)
- List page uses proper pagination and search
- Status badges color-coded per UserStatus enum
- All pages use `force-dynamic` for fresh data
- Permission checks: `students.view`, `staff.view`, `applications.process`

## Next Steps
1. Student create/edit forms with validation
2. Archive/restore API endpoint
3. Export CSV endpoint with audit logging
4. Instructor invitation system
5. User management CRUD operations
6. Tests for each completed module

## Files Changed/Created
- `src/app/(principal)/principal/students/page.tsx` - rewritten with proper table and "New Student" button
- `src/app/(principal)/principal/students/[id]/page.tsx` - new detail page
- Existing pages verified: admissions, instructors, user-management (list views only)

