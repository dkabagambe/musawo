# S2 Analysis - Dashboard Shell & Widgets

**Date:** 23 Nov 2026  
**Status:** Code Analysis in Progress  
**Scope:** Dashboard shell, sidebar, widgets, tabs

---

## S2 Requirements Overview

### 1. Banner Fix
- ✅ Remove em dash from banner text
- ✅ Reword to: "Staging demo environment, not for real use. Data may be reset at any time."
- ✅ Add dismiss button with localStorage persistence

### 2. Sidebar Reorganization  
- ✅ Replace "General" wrapper with flat collapsible groups:
  - Overview: Dashboard, My Profile
  - Learning: My Programmes, My Courses, Learning Materials, Assignments, Discussion Forum
  - Classes: My Timetable, Live Classes, Class Replays, Attendance
  - Assessment: Examinations, My Results, Certificates
  - Finance: My Fees
  - Communication: Messages, Announcements, Notifications, Support
- ✅ Active section opens automatically
- ✅ Unique icons per group
- ✅ No horizontal scrollbar
- ✅ Logo fixed at top, user block fixed at bottom
- ✅ User block shows: avatar, full name, "Student" label
- ✅ Fully visible at 1280x720

### 3. Widget System
- ✅ "Edit My Widgets" button with:
  - Drag handle
  - Move to top/up/down/bottom buttons
  - Show/hide toggle
  - Column choice
  - Reset to default
- ✅ Persist per user per tab in database
- ✅ Apply after reload and on another device
- ✅ Cache invalidation on save
- ✅ Test: Move "Upcoming Classes" to top, reload, verify DOM order

### 4. Tabs & Widgets
**General Tab:**
- To Dos
- Upcoming Classes
- Payment and Fees summary
- My Courses
- Inbox

**Studies Tab:**
- Course progress
- Assignments due
- Recent results
- Forum activity

**Finance Tab:**
- Fees progress (phase 1 of 3, 50% paid)
- Payment history
- Receipts
- Pay now

**Classes Tab:**
- Timetable this week
- Live now
- Class Replays
- Attendance summary

### 5. Data Fixes
- ✅ "Upcoming Classes" should show real classes (not "none")
- ✅ "To Dos" links should open correct pages (exams → exam page, assignments → assignment page)
- ✅ Show date and time on To Dos
- ✅ Course titles should wrap to 2 lines with tooltip
- ✅ Use real course names (not "CNA Final Certification Exam")
- ✅ Use full course names in Inbox (not "MHC")
- ✅ Add Payment Holds widget

### 6. Dark Theme
- ✅ AA contrast for muted text, links, chips, pills
- ✅ Theme remembered per user

### 7. Tests
- ✅ Sidebar structure at 1280x720 and 360px
- ✅ Widget move persists
- ✅ Every tab has widgets
- ✅ Every widget link opens the right page

---

## Current Implementation Status

### Navigation Structure (layout.tsx)
✅ **Existing:**
- NAV array with all items
- Groups: general, learning, classes, assessment, finance, communication
- Icons assigned
- 4 tabs: general, studies, finance, classes

**Issue:** Need to verify if AppShell component properly handles group organization and displays as collapsible groups.

### Dashboard Page (page.tsx)
✅ **Working:**
- Accepts tab query param
- Routes to DashboardTabBody component
- Passes userId, role, tab

### DashboardTabBody Component
**Location:** `src/components/dashboard/DashboardTabBody.tsx`  
**Purpose:** Renders widgets for each tab  
**Status:** Need to verify implementation

---

## Files to Investigate

1. `src/components/dashboard/DashboardTabBody.tsx` - Tab rendering
2. `src/lib/dashboard/widgets.ts` - Widget system
3. `src/components/dashboard/widget-bodies.tsx` - Individual widget implementations
4. `src/components/ui/AppShell.tsx` - Sidebar and banner
5. Database schema for widget preferences

---

## Implementation Plan

### Phase 1: Banner & Sidebar
1. Fix banner text (remove em dash)
2. Add dismiss button to banner
3. Verify sidebar group organization
4. Add Payment Holds widget

### Phase 2: Widget System
1. Implement widget rearranging logic
2. Add database storage for preferences
3. Implement drag handle + buttons
4. Implement show/hide toggle
5. Implement column choice
6. Implement reset to default
7. Cache invalidation on save

### Phase 3: Widgets & Tabs
1. Populate widgets with real data
2. Verify all 4 tabs have widgets
3. Verify widget links open correct pages
4. Fix data display issues

### Phase 4: Testing
1. Sidebar structure at 1280x720 and 360px
2. Widget move persistence
3. Widget links resolution
4. Dark theme contrast

---

## Next Steps

1. Investigate DashboardTabBody component
2. Check widget implementations
3. Analyze database schema for widget preferences
4. Begin Phase 1 (banner & sidebar)

---

## Notes

- Rules apply: Work on ONE section at a time (S2 only)
- Use root-cause approach
- Test against production build
- Document with STUDENT-S2.md after completion
- Use 2 browser contexts for multi-role testing
- Commit and push when complete
- Wait for "next" before proceeding to S3
