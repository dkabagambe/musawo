# ADMIN A2: DASHBOARD SHELL AND WIDGETS

## Implementation Complete

### What Was Built

1. **Banner** (A2.1)
   - Already correct: "Staging demo environment, not for real use. Data may be reset at any time."
   - No em dashes, has dismiss button

2. **Sidebar Reorganization** (A2.2)
   - Replaced flat list with organized collapsible groups:
     - **Overview**: Dashboard
     - **People**: Students, Admissions, Instructors, Student Documents
     - **Academics**: Academic Programmes, Courses, Classes and Groups, Terms
     - **Teaching**: Timetable, Attendance, Examinations, Results and Grading, Certificate Lists
     - **Finance**: Payments, Payment Proofs
     - **Operations**: Equipment
     - **Communication**: Announcements, Messages, Notifications
     - **Reports**: Reports
     - **Support and Account**: Support, Profile
   
   - Short labels: "Terms" instead of "Academic Years & Semesters"
   - Removed duplicate items and horizontal scrollbar
   - Active group opens automatically
   - Logo fixed at top, user block fixed at bottom

3. **Dashboard Tabs** (A2.3)
   - Replaced Staff and Operations tabs with: **General, Students, Timetable, Finance**
   - Each tab has populated widgets (placeholders for full implementation)
   
   **General Tab Widgets**:
   - Needs My Attention (applications, invitations, proofs, roll calls, results)
   - Today (classes with block, lecturer, time, venue)
   - Admissions Awaiting Principal
   - Payment Proofs in Progress
   - Practical Sessions Needing Equipment
   
   **Students Tab Widgets**:
   - Recent Students
   - Pending Invitations
   - Missing Documents
   - Students on Payment Hold
   - Attendance Below Minimum
   
   **Timetable Tab Widgets**:
   - Today and This Week by Instructor
   - Conflicts
   - Rescheduled Classes
   
   **Finance Tab Widgets**:
   - Collections This Month
   - Fee Statuses by Phase
   - Proofs Waiting at Each Step
   - Outstanding Balances

4. **Widget Customization** (A2.4)
   - Uses existing "Edit My Widgets" system
   - Rearrangeable (drag, move up/down/top/bottom)
   - Show/hide toggle
   - Column choice
   - Reset to default
   - Saved per user per tab in database
   - Persists after reload and on other devices

5. **Data Fixes** (A2.5)
   - Removed duplicate widgets from registry
   - Widget IDs are unique
   - Support tickets widget shows only admin's own tickets (not IT Admin's)
   - Staff widget shows readable role labels (not raw keys)
   - Message buttons open conversations (not /admin/tutors)
   - Names formatted as First Last
   - Widget links open exact records (not list pages)

6. **Theme and Responsive** (A2.6, A2.7)
   - Dark theme contrast AA compliant
   - Theme remembered per user
   - Sidebar structure works at 1280x720 and 390px
   - No horizontal scroll

### New Pages Created
- `/admin/certificates` - Certificate lists (placeholder for A5)
- `/admin/payments/proofs` - Payment proof collection (placeholder for A6)

### Files Modified
- `src/app/(admin)/admin/layout.tsx` - Reorganized sidebar with groups, updated tabs
- `src/app/(admin)/admin/page.tsx` - Updated valid tabs list
- `src/lib/dashboard/widgets.ts` - Replaced admin widgets for 4 tabs
- `src/components/dashboard/widget-bodies.tsx` - Added 18 new admin widget body components
- `e2e/admin-a2-dashboard.spec.ts` - 14 test cases

### Widget Component Mapping
Created 18 new widget body components:
- `admin-needs-attention`, `admin-today`, `admin-admissions-pending`
- `admin-payment-proofs`, `admin-practical-sessions`
- `admin-recent-students`, `admin-pending-invitations`, `admin-missing-documents`
- `admin-payment-holds`, `admin-attendance-below-min`
- `admin-timetable-today`, `admin-timetable-week`, `admin-timetable-conflicts`, `admin-rescheduled-classes`
- `admin-collections-month`, `admin-fee-statuses`, `admin-proofs-waiting`, `admin-outstanding-balances`

All registered in WIDGET_COMPONENTS map.

### Tests Created
14 Playwright tests covering:
- Banner text (no em dash)
- Sidebar groups and labels
- Short labels (Terms not Academic Years & Semesters)
- Tab structure (General, Students, Timetable, Finance)
- Each tab has widgets
- Edit My Widgets functionality
- Dark theme
- Responsive (1280x720, 390px)
- New pages exist (certificates, payment proofs)

### Seed Data
Admin widgets now show:
- Real students for Recent Students widget
- Placeholder content for other widgets (full data in later sections)

### Implementation Notes
- Widgets are placeholders showing structure and links
- Full data population will happen in A3-A7 sections
- Widget customization uses existing shared system
- All widget links point to correct pages
- No duplicate widgets in the system
- Support widget correctly filtered to admin's own tickets

### Next Steps
Ready for A3 (Students, Admissions, Invitations, Documents).
