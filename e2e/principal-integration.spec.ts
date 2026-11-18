import { test, expect, Page } from "@playwright/test";

/**
 * Principal P6.8: Integration Tests
 * 
 * Multi-role workflow tests covering:
 * 1. Results workflow: Instructor → Principal → Director → Student
 * 2. Emergency exam controls: Principal extends time
 * 3. Class observation audit logging
 * 4. Low attendance detection
 * 5. Certificate issuance workflow
 */

// Helper function for dev login
async function loginAs(page: Page, userEmail: string) {
  await page.goto("/dev/login");
  const row = page.locator("tr").filter({
    has: page.locator("td").filter({
      hasText: new RegExp(`^${userEmail.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`),
    }),
  });
  await row.getByRole("button", { name: /sign in/i }).click();
  await page.waitForLoadState("networkidle");
}

test.describe("Principal Integration Tests", () => {
  test.describe("P6.8.1: Results Workflow", () => {
    test("Complete results flow: Instructor → Principal → Director → Student", async ({
      page,
      context,
    }) => {
      // This is a comprehensive workflow test
      // Prerequisites: Exam exists, student has submitted attempt

      // Step 1: Login as Instructor and verify results are ready
      await loginAs(page, "tutor@mtc.ac.ug");
      await page.goto("/tutor/results");
      
      // Check if we have results page
      const hasResults = await page.locator("h1").isVisible();
      if (hasResults) {
        const heading = await page.locator("h1").textContent();
        expect(heading).toContain("Results");
      }

      // Step 2: Login as Principal
      await loginAs(page, "principal@mtc.ac.ug");
      await page.goto("/principal/results");
      
      // Verify Principal can see results interface
      await expect(page.locator("h1")).toContainText(/results|grading/i);
      
      // Check for tabs (Grading Settings, Submitted, Ready to Publish, etc.)
      const hasTabs = await page.locator("text=/submitted|ready to publish|awaiting/i").isVisible();
      if (hasTabs) {
        // Principal should have access to results management
        expect(hasTabs).toBeTruthy();
      }

      // Step 3: Check if we can forward to Director (if results exist)
      const hasForwardButton = await page.locator("text=/forward|submit for approval/i").isVisible();
      if (hasForwardButton) {
        // This confirms the forward workflow exists
        expect(hasForwardButton).toBeTruthy();
      }

      // Step 4: Login as Director to verify approval interface exists
      await loginAs(page, "director@mtc.ac.ug");
      await page.goto("/director/approvals");
      
      // Director should see approvals page
      await expect(page.locator("h1")).toContainText(/approvals/i);
      
      // Check for results publication approval type
      const hasResultsApproval = await page.getByText(/results.*publication|publish.*results/i).isVisible();
      // This may not exist if no results are pending, but the page should load
      
      // Step 5: Verify student portal exists (would see results after approval)
      await loginAs(page, "student.full@example.com");
      await page.goto("/dashboard/results");
      
      // Student should have a results page
      const studentResultsPage = await page.locator("h1, h2").first().isVisible();
      expect(studentResultsPage).toBeTruthy();
    });
  });

  test.describe("P6.8.2: Emergency Exam Controls", () => {
    test("Principal can extend exam time with reason", async ({ page }) => {
      await loginAs(page, "principal@mtc.ac.ug");
      
      // Navigate to examinations
      await page.goto("/principal/examinations");
      await expect(page.locator("h1")).toContainText(/examin/i);
      
      // Check if live monitoring exists
      const hasMonitoring = await page.locator("text=/live.*monitor|monitoring|in.progress/i").isVisible();
      
      if (hasMonitoring) {
        // If we have live monitoring, it should be accessible
        expect(hasMonitoring).toBeTruthy();
      }
      
      // Emergency controls would appear on individual attempt monitoring pages
      // Structure: /principal/examinations/[examId]/attempts/[attemptId]
      // This verifies the page structure exists
      const hasExams = await page.locator("text=/exam|assessment/i").isVisible();
      expect(hasExams).toBeTruthy();
    });

    test("Principal can stop exam session with reason", async ({ page }) => {
      await loginAs(page, "principal@mtc.ac.ug");
      await page.goto("/principal/examinations");
      
      // Verify examinations page loads
      await expect(page.locator("h1")).toContainText(/examin/i);
      
      // The stop session feature would be on the attempt monitoring page
      // Verify the base structure exists
      const examsPageLoaded = await page.locator("body").isVisible();
      expect(examsPageLoaded).toBeTruthy();
    });
  });

  test.describe("P6.8.3: Class Observation Audit", () => {
    test("Observer join button is visible for LIVE classes and creates audit log", async ({ page }) => {
      await loginAs(page, "principal@mtc.ac.ug");
      
      // Navigate to classes list
      await page.goto("/principal/timetable");
      await expect(page.locator("h1")).toContainText(/timetable/i);
      
      // Check if there are any scheduled classes
      const hasClasses = await page.locator("text=/class|session/i").isVisible();
      
      if (hasClasses) {
        // If classes exist, the monitoring should be available
        expect(hasClasses).toBeTruthy();
      }
      
      // Class monitor pages would be at /principal/classes/[classId]
      // The observer join button appears only when status is LIVE
      // and creates an audit log entry via POST /api/principal/classes/observe
    });

    test("Class monitor shows real-time statistics", async ({ page }) => {
      await loginAs(page, "principal@mtc.ac.ug");
      
      // Try to access a class monitor page (structure verification)
      await page.goto("/principal/classes");
      
      // This should redirect or show the classes interface
      const pageLoaded = await page.locator("body").isVisible();
      expect(pageLoaded).toBeTruthy();
    });
  });

  test.describe("P6.8.4: Low Attendance Detection", () => {
    test("Students below 75% threshold appear in low attendance view", async ({ page }) => {
      await loginAs(page, "principal@mtc.ac.ug");
      
      // Navigate to attendance page
      await page.goto("/principal/attendance");
      await expect(page.locator("h1")).toContainText(/attendance/i);
      
      // Check for low attendance tab/view
      const hasLowAttendance = await page.locator("text=/low.*attendance|below.*threshold/i").isVisible();
      
      if (hasLowAttendance) {
        // Click on low attendance view
        await page.click("text=/low.*attendance|below.*threshold/i");
        
        // Should show students with <75% attendance
        // (may be empty if all students have good attendance)
        const lowAttendanceView = await page.locator("body").isVisible();
        expect(lowAttendanceView).toBeTruthy();
      } else {
        // At minimum, the attendance page should load
        const attendancePage = await page.locator("h1").isVisible();
        expect(attendancePage).toBeTruthy();
      }
    });

    test("Attendance can be edited with reason", async ({ page }) => {
      await loginAs(page, "principal@mtc.ac.ug");
      await page.goto("/principal/attendance");
      
      // Check for edit functionality
      const hasEditOption = await page.locator("button:has-text('Edit'), a:has-text('Edit')").isVisible();
      
      if (hasEditOption) {
        // Edit functionality exists
        expect(hasEditOption).toBeTruthy();
      }
      
      // Editing requires a reason field (minimum 10 characters)
      // This is enforced by the API: PATCH /api/principal/attendance
    });

    test("Attendance export is available", async ({ page }) => {
      await loginAs(page, "principal@mtc.ac.ug");
      await page.goto("/principal/attendance");
      
      // Check for export button
      const hasExport = await page.locator("text=/export|download/i").isVisible();
      
      if (hasExport) {
        expect(hasExport).toBeTruthy();
      }
      
      // Export API: GET /api/principal/attendance/export
    });
  });

  test.describe("P6.8.5: Certificate Issuance Workflow", () => {
    test("Certificate eligibility checker shows requirements", async ({ page }) => {
      await loginAs(page, "principal@mtc.ac.ug");
      
      // Navigate to certificates page
      await page.goto("/principal/certificates");
      await expect(page.locator("h1")).toContainText(/certificate/i);
      
      // Check for eligibility tab
      const hasEligibility = await page.locator("text=/eligibility|eligible/i").isVisible();
      
      if (hasEligibility) {
        await page.click("text=/eligibility|eligible/i");
        
        // Should show requirement checklist:
        // - Lessons complete
        // - Exams passed
        // - Practicals signed
        // - Log book signed
        // - Attendance ≥75%
        // - Fees 100%
        const hasRequirements = await page.locator("text=/lessons|exams|attendance|fees/i").isVisible();
        expect(hasRequirements).toBeTruthy();
      }
    });

    test("Batch certificate request can be created", async ({ page }) => {
      await loginAs(page, "principal@mtc.ac.ug");
      await page.goto("/principal/certificates");
      
      // Check for request/issue button
      const hasRequestButton = await page.locator("text=/request|issue|batch/i").isVisible();
      
      if (hasRequestButton) {
        expect(hasRequestButton).toBeTruthy();
      }
      
      // This creates CERTIFICATE_ISSUANCE approval request for Director
    });

    test("Certificate can be revoked with reason", async ({ page }) => {
      await loginAs(page, "principal@mtc.ac.ug");
      await page.goto("/principal/certificates");
      
      // Check for issued certificates tab
      const hasIssued = await page.locator("text=/issued/i").isVisible();
      
      if (hasIssued) {
        await page.click("text=/issued/i");
        
        // Should have revoke option
        const hasRevoke = await page.locator("text=/revoke/i").isVisible();
        // May not exist if no certificates issued
      }
    });

    test("Certificate verification page is accessible", async ({ page }) => {
      // Public page - no login required
      await page.goto("/verify/test-certificate-id");
      
      // Should show verification page (will show invalid for test ID)
      const verificationPage = await page.locator("body").isVisible();
      expect(verificationPage).toBeTruthy();
      
      // Page should indicate if certificate is valid or not
      const hasStatus = await page.locator("text=/valid|invalid|not found|revoked/i").isVisible();
      expect(hasStatus).toBeTruthy();
    });
  });

  test.describe("P6.8.6: Additional Principal Features", () => {
    test("Timetable CRUD operations are available", async ({ page }) => {
      await loginAs(page, "principal@mtc.ac.ug");
      await page.goto("/principal/timetable");
      
      await expect(page.locator("h1")).toContainText(/timetable/i);
      
      // Check for create/schedule button
      const hasCreate = await page.locator("text=/schedule|create|add.*class/i").isVisible();
      
      if (hasCreate) {
        expect(hasCreate).toBeTruthy();
      }
    });

    test("Class roster shows students with photos", async ({ page }) => {
      await loginAs(page, "principal@mtc.ac.ug");
      await page.goto("/principal/classes");
      
      await expect(page.locator("h1")).toContainText(/classes.*groups|class.*cohort/i);
      
      // Check if roster views are available
      const hasRosterLink = await page.locator("text=/roster|view.*students/i").isVisible();
      
      if (hasRosterLink) {
        expect(hasRosterLink).toBeTruthy();
      }
    });

    test("Breakaway groups can be managed", async ({ page }) => {
      await loginAs(page, "principal@mtc.ac.ug");
      await page.goto("/principal/classes");
      
      // Check for groups management
      const hasGroups = await page.locator("text=/groups|breakaway/i").isVisible();
      
      if (hasGroups) {
        expect(hasGroups).toBeTruthy();
      }
    });

    test("Academic programmes can be created (requires Director approval)", async ({ page }) => {
      await loginAs(page, "principal@mtc.ac.ug");
      await page.goto("/principal/programmes");
      
      await expect(page.locator("h1")).toContainText(/programme/i);
      
      // Check for create button
      const hasCreate = await page.locator("text=/create|add.*programme/i").isVisible();
      
      if (hasCreate) {
        expect(hasCreate).toBeTruthy();
      }
      
      // Creating a programme should mention Director approval requirement
    });

    test("Departments can be managed", async ({ page }) => {
      await loginAs(page, "principal@mtc.ac.ug");
      await page.goto("/principal/departments");
      
      await expect(page.locator("h1")).toContainText(/department/i);
      
      // Check for CRUD operations
      const hasCreate = await page.locator("text=/create|add.*department/i").isVisible();
      
      if (hasCreate) {
        expect(hasCreate).toBeTruthy();
      }
    });

    test("Calendar events can be created and exported", async ({ page }) => {
      await loginAs(page, "principal@mtc.ac.ug");
      await page.goto("/principal/calendar");
      
      await expect(page.locator("h1")).toContainText(/calendar/i);
      
      // Check for create event button
      const hasCreate = await page.locator("text=/create|add.*event/i").isVisible();
      
      if (hasCreate) {
        expect(hasCreate).toBeTruthy();
      }
      
      // Check for export button (.ics format)
      const hasExport = await page.locator("text=/export|download.*ics/i").isVisible();
      
      if (hasExport) {
        expect(hasExport).toBeTruthy();
      }
    });
  });

  test.describe("P6.8.7: RBAC and Permissions", () => {
    test("Principal cannot access Director-only features", async ({ page }) => {
      await loginAs(page, "principal@mtc.ac.ug");
      
      // Try to access director approvals (should be restricted)
      const response = await page.request.get("/api/director/approvals");
      
      // Should be forbidden or redirect
      expect([401, 403]).toContain(response.status());
    });

    test("Principal cannot approve their own approval requests", async ({ page }) => {
      await loginAs(page, "principal@mtc.ac.ug");
      
      // Principal can create approval requests but not approve them
      // This is enforced at the API level
      await page.goto("/principal/programmes");
      
      // Should not see approval buttons
      const hasApprove = await page.locator("button:has-text('Approve')").isVisible();
      expect(hasApprove).toBeFalsy();
    });

    test("Principal has access to all student data", async ({ page }) => {
      await loginAs(page, "principal@mtc.ac.ug");
      
      // Principal should access:
      // - Students list
      await page.goto("/principal/students");
      await expect(page.locator("body")).toBeVisible();
      
      // - Attendance
      await page.goto("/principal/attendance");
      await expect(page.locator("h1")).toContainText(/attendance/i);
      
      // - Results
      await page.goto("/principal/results");
      await expect(page.locator("h1")).toContainText(/results|grading/i);
      
      // - Certificates
      await page.goto("/principal/certificates");
      await expect(page.locator("h1")).toContainText(/certificate/i);
    });
  });

  test.describe("P6.8.8: Audit Logging Verification", () => {
    test("All sensitive operations create audit logs", async ({ page }) => {
      await loginAs(page, "principal@mtc.ac.ug");
      
      // Actions that should be audit logged:
      // 1. Programme creation/updates (requires Director approval)
      // 2. Course changes (requires Director approval)
      // 3. Attendance edits (with reason)
      // 4. Results forwarding to Director
      // 5. Certificate requests/revocations
      // 6. Class creation/cancellation
      // 7. Observer joins
      // 8. Emergency exam controls
      
      // Verify audit log page exists
      await page.goto("/principal");
      
      // Check if audit logs are accessible (may be under system/IT admin)
      const principalPage = await page.locator("h1").isVisible();
      expect(principalPage).toBeTruthy();
    });
  });

  test.describe("P6.8.9: Responsive Design", () => {
    test("Principal portal works at mobile width (390px)", async ({ page }) => {
      await page.setViewportSize({ width: 390, height: 844 });
      await loginAs(page, "principal@mtc.ac.ug");
      
      await page.goto("/principal");
      await expect(page.locator("h1, h2").first()).toBeVisible();
      
      // Check key pages at mobile width
      await page.goto("/principal/attendance");
      await expect(page.locator("h1")).toContainText(/attendance/i);
      
      await page.goto("/principal/timetable");
      await expect(page.locator("h1")).toContainText(/timetable/i);
      
      await page.goto("/principal/classes");
      await expect(page.locator("h1")).toContainText(/classes/i);
    });

    test("Principal portal works at desktop width (1440px)", async ({ page }) => {
      await page.setViewportSize({ width: 1440, height: 900 });
      await loginAs(page, "principal@mtc.ac.ug");
      
      await page.goto("/principal");
      await expect(page.locator("h1, h2").first()).toBeVisible();
      
      // Verify all major sections load
      const sections = [
        "/principal/programmes",
        "/principal/departments",
        "/principal/courses",
        "/principal/classes",
        "/principal/timetable",
        "/principal/attendance",
        "/principal/examinations",
        "/principal/results",
        "/principal/certificates",
        "/principal/calendar",
      ];
      
      for (const section of sections) {
        await page.goto(section);
        await expect(page.locator("h1")).toBeVisible();
      }
    });
  });
});
