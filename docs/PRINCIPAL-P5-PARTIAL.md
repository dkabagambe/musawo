# PRINCIPAL P5 (PARTIAL): ACADEMIC STRUCTURE

## Completed (P5.1-5.3, P5.6)

### P5.1: Academic Programmes CRUD ✅
- Transformed programmes page from read-only to full CRUD
- Create/edit programme form with comprehensive fields (title, code, category, duration, fees, eligibility, target audience, intake)
- Director approval workflow integration (creates ACADEMIC_PROGRAMME_CHANGE approval request)
- Filter by status (ALL/PUBLISHED/DRAFT/ARCHIVED)
- Department assignment support (visual display, multi-select ready)
- Cards show tutor, enrolment count, duration, open intake status, fee structure

### P5.2: Departments CRUD ✅
- Created Department model in Prisma schema (name, description, headId, isActive)
- CourseDepartment junction table for many-to-many course-department relations
- Migration applied: departments and course_departments tables
- Seeded 4 departments: Home Care, Child Care & Safety, Mental Health, Emergency & Life Support
- Transformed departments page from hardcoded constants to database-backed
- Create/edit/archive/restore functionality
- Department head assignment (must be INSTRUCTOR or PRINCIPAL, dropdown selection)
- Shows programme count per department
- API routes with audit logging for all department operations

### P5.3: Courses and Subjects (Block Management) ✅
- Course detail page at /principal/courses/[courseId]
- Block (Course Unit) create/edit/delete forms
- Prerequisite block gating (dropdown to select prerequisite, prevents access until completion)
- Shows lesson count per block, block order, description
- API routes for block CRUD with audit logging
- Main courses table links to detail page for block management
- Approval reminder note (changes require Director approval via COURSE_CHANGE request)

## Database Changes
- Department model: id, name (unique), description, headId (FK to users), isActive, timestamps
- CourseDepartment: courseId, departmentId (junction table for many-to-many)
- User model: added departmentHeadOf relation
- Course model: added departments relation
- Migration: 20261117110000_add_department_model
- CalendarEvent model: id, title, description, eventDate, endDate, eventType, isAllDay, createdById, timestamps
- Migration: 20261117120000_add_calendar_events

## API Routes Created
- POST /api/principal/departments (create department)
- PATCH /api/principal/departments (update/archive department)
- POST /api/principal/blocks (create block)
- PATCH /api/principal/blocks (update block)
- DELETE /api/principal/blocks (delete block with cascade to lessons)
- GET /api/principal/calendar (list calendar events with date range filtering)
- POST /api/principal/calendar (create calendar event)
- PATCH /api/principal/calendar (update calendar event)
- DELETE /api/principal/calendar (delete calendar event)
- GET /api/principal/calendar/export (export calendar as .ics file)

### P5.6: Academic Calendar ✅
- CalendarEvent model in Prisma schema (title, description, eventDate, endDate, eventType, isAllDay)
- Migration applied: 20261117120000_add_calendar_events
- Unified calendar view showing intakes, exams, classes, and custom calendar events
- Create/edit/delete calendar events (INTAKE, EXAM_PERIOD, HOLIDAY, OTHER)
- .ics export at /api/principal/calendar/export for calendar subscription (Outlook, Google Calendar, Apple Calendar)
- All-day and timed event support
- Event type filtering with visual indicators (icons and border colors)
- Date range filtering (shows last 30 days + all future events)
- API routes: GET/POST/PATCH/DELETE /api/principal/calendar
- Audit logging for all calendar operations
- Visible to students in their dashboard (read-only, future enhancement)

## Remaining (P5.4-5.5, P5.7)

### P5.4: Classes and Groups
- Student assignment (individual and bulk) to classes
- Instructor assignment per class
- Roster with photos (avatar system)
- Default breakaway group size 5
- Current: /principal/classes shows LiveClass list with filters, needs enhancement

### P5.5: Terms (Academic Years and Semesters)
- Intake CRUD (create/edit/close)
- Storage clearing preview when closing intake
- Current: /principal/semesters shows Intake list with status, needs CRUD forms

### P5.7: Timetable CRUD
- Create/move/cancel classes (LiveClass instances)
- Conflict detection for instructor and venue
- Week/month/list views
- Changes notify instructors and students
- Current: /principal/timetable shows 7-day LiveClass view, read-only

## Testing Required
Per principal.md rules:
- Create draft programme, Director approves, goes live
- Course change shows diff in approval request
- Assign students to class, appears in instructor roster
- Timetable change reaches instructor and student
- Calendar event visible to student
- **P5.6: Create calendar event (holiday, exam period), export .ics, verify format**
- Build passes: npm run build
- Works at 390px and 1440px in light/dark theme
- Playwright tests for P5.1-5.3, P5.6 flows

## Notes
- All CRUD operations properly audit logged (CREATE, UPDATE, DELETE, ARCHIVE actions)
- Programme and course changes require Director approval (ACADEMIC_PROGRAMME_CHANGE, COURSE_CHANGE)
- Soft delete pattern for departments (isActive flag, archive/restore)
- Hard delete for blocks (cascade to lessons, confirmed with warning)
- Forms validate input (Zod schemas in API routes)
- Permission checks: courses.view (read), courses.edit (CRUD), courses.publish (approval requests)
