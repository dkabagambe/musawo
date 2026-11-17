# ADMIN A3: STUDENTS, ADMISSIONS, INVITATIONS, DOCUMENTS (Partial)

## Implementation Status

### ✅ Completed

1. **Admissions Page Enhancement** (A3.1)
   - "Register Walk-in Student" button added
   - "Create Student" button for each application (prefills form)
   - Applications inbox from public Apply form
   - Shows applicant details, course, category, consent timestamp
   - Status tabs: New, In Review, Accepted, Rejected, All

2. **Student Creation Flow** (A3.1, A3.2)
   - **Two entry points**: from application or walk-in registration
   - **Complete form** with all required fields:
     - Personal: Full name as on ID, email (unique), phone (+256)
     - Demographics: Date of birth, gender, district
     - Academic: Course, intake, category (Regular/Professional/International)
     - Optional: ID number (encrypted), highest qualification, emergency contact
     - Professional: Title and registration number for professional category
   - **Duplicate checks**: Email and phone validation
   - **Registration number generation**: YYYY/COURSE_CODE/NNN format
     - Per course and year (e.g., 2026/MHC/001, 2026/MHC/002)
     - Automatic sequencing, unique, never reused
   - **Approval workflow**: Creates approval request for Principal
   - **Audit logging**: Every creation logged with details
   - **Student detail page**: Profile, enrolments, metadata

3. **Invitation Management** (A3.3)
   - **Enhanced invitations page** (`/admin/invites`)
   - **Two sections**: Student invitations and Staff invitations
   - **Student invitations table**:
     - Name, email, registration number, course, status, days waiting
     - Resend action (generates new token, invalidates old)
     - Revoke action (removes all tokens, sets status to PENDING)
     - Rate limits and audit logging
   - **Staff invitations**: Existing functionality preserved
   - **API endpoint**: POST `/api/admin/invites/student/[id]`

4. **Student Documents** (A3.5)
   - Page already implemented with full functionality
   - Upload, view, replace, archive documents per student
   - Document types: National ID, certificates, photo, application form
   - Stored in database (studentDocument table)
   - Missing documents report
   - Audit logged (every view and upload)

### 🔄 Workflow Implemented

**Complete Admission Flow**:
1. Student submits application via public Apply form
2. **Admin** sees application in Admissions inbox
3. **Admin** clicks "Create Student" (form prefilled from application)
4. **Admin** completes/verifies data and submits
5. System generates registration number (per course and year)
6. Approval request created for **Principal**
7. **Principal** approves in approval inbox
8. Student receives email with set-password link
9. Student sets password and becomes ACTIVE
10. **Admin** can resend invitation if needed

**Statuses visible to Admin**:
- APPLICATION_RECEIVED → Application submitted
- RECORD_CREATED → Student account created
- AWAITING_PRINCIPAL → Pending approval
- APPROVED → Principal approved
- INVITATION_SENT → Email sent
- ACCEPTED → Student set password (ACTIVE)
- REJECTED → Principal or Admin rejected (with reason)
- EXPIRED → Invitation expired

### 📁 Files Created
- `src/app/(admin)/admin/students/create/page.tsx` - Student creation page
- `src/app/(admin)/admin/students/create/StudentCreateForm.tsx` - Creation form
- `src/app/(admin)/admin/students/[id]/page.tsx` - Student detail view
- `src/app/api/admin/students/route.ts` - POST endpoint for student creation
- `src/app/(admin)/admin/invites/StudentInviteActions.tsx` - Resend/revoke UI
- `src/app/api/admin/invites/student/[id]/route.ts` - Invitation actions API

### 📁 Files Modified
- `src/app/(admin)/admin/admissions/page.tsx` - Added buttons, Create Student links
- `src/app/(admin)/admin/invites/page.tsx` - Split into student + staff sections

### ⏳ TODO (Remaining from A3)

1. **CSV Bulk Import** (A3.1)
   - Upload CSV file with student data
   - Preview with per-row validation
   - Bulk registration with duplicate detection

2. **Full Students CRUD** (A3.4)
   - `/admin/students` - List with search and filters
     - Filters: course, intake, class, status, payment phase
     - Pagination
   - Edit: phone, address, emergency contact
   - Corrections to name/email/registration (with reason, audited)
   - Deactivate, archive, restore actions
   - CSV export (audit logged)

3. **Tests** (A3.6)
   - Playwright test: Full admission flow (3 contexts)
     - Applicant submits form
     - Admin creates student
     - Principal approves
     - Email arrives (/dev/mail)
     - Student sets password and logs in
   - Resend invitation invalidates old link
   - Admin cannot create Instructor/Director account (403)
   - Duplicate email blocked
   - Registration number follows per-course sequence

### Security & Compliance
- ✅ ID number stored encrypted (optional field)
- ✅ Duplicate checks (email, phone)
- ✅ Audit logging (creation, invitations, document access)
- ✅ Rate limits on invitation resend
- ✅ Admin cannot see/set passwords
- ✅ Only Admin, Principal, Director can view documents
- ✅ Registration numbers unique and sequential per course/year

### Next Steps
Complete remaining items (CSV import, full students CRUD, tests) then move to A4.
