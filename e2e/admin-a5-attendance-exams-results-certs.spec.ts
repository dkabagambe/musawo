import { test, expect } from "@playwright/test";

/**
 * A5 tests: Admin - Attendance, Examinations, Results, Certificate Lists
 *
 * Run against a production build (npm run build && npm start) with seeded data.
 * Uses: npm run demo:reset && npm run seed:test
 */

const ADMIN_EMAIL = "admin1@mtc.ac.ug";

async function devLogin(page: any, email: string, expectedPath?: RegExp) {
  await page.goto("/dev/login");
  await page.fill('input[name="email"]', email);
  await page.click('button:has-text("Sign In")');
  if (expectedPath) {
    await page.waitForURL(expectedPath, { timeout: 10000 });
  }
}

test.describe("Admin A5: Attendance, Examinations, Results, Certificates", () => {
  
  // ── A5.1: ATTENDANCE ────────────────────────────────────────────────────────
  
  test.describe("A5.1: Attendance", () => {
    
    test("attendance page loads with recent classes", async ({ page }) => {
      await devLogin(page, ADMIN_EMAIL, /\/admin/);
      await page.goto("/admin/attendance");
      
      // Page title
      await expect(page.locator("h1")).toContainText("Attendance");
      
      // Description
      await expect(page.locator("text=/View attendance records/i")).toBeVisible();
      
      // Recent classes section heading
      await expect(page.locator("text=/Recent Classes/i")).toBeVisible();
      
      // Should show either classes or "No classes" message
      const noClasses = page.locator("text=/No classes with attendance yet/i");
      const classList = page.locator('a[href*="/admin/attendance?classId="]');
      
      const hasNoClasses = await noClasses.isVisible({ timeout: 2000 }).catch(() => false);
      const hasClasses = await classList.first().isVisible({ timeout: 2000 }).catch(() => false);
      
      expect(hasNoClasses || hasClasses).toBeTruthy();
    });
    
    test("can select a class and view attendance records", async ({ page }) => {
      await devLogin(page, ADMIN_EMAIL);
      await page.goto("/admin/attendance");
      
      // Wait for page load
      await page.waitForSelector("h1", { timeout: 10000 });
      
      // Check if there are any classes
      const classList = page.locator('a[href*="/admin/attendance?classId="]').first();
      const hasClasses = await classList.isVisible({ timeout: 2000 }).catch(() => false);
      
      if (hasClasses) {
        // Click on first class
        await classList.click();
        await page.waitForTimeout(1000);
        
        // Should show attendance details or "No attendance records"
        const hasRecords = await page.locator("table").isVisible({ timeout: 2000 }).catch(() => false);
        const noRecords = await page.locator("text=/No attendance records/i").isVisible({ timeout: 2000 }).catch(() => false);
        
        expect(hasRecords || noRecords).toBeTruthy();
        
        // If has records, check table structure
        if (hasRecords) {
          await expect(page.locator("th:has-text('Student')")).toBeVisible();
          await expect(page.locator("th:has-text('Student No.')")).toBeVisible();
          await expect(page.locator("th:has-text('Status')")).toBeVisible();
          
          // Should show present/absent counts
          const presentText = page.locator("text=/\\d+ present/i");
          const absentText = page.locator("text=/\\d+ absent/i");
          
          await expect(presentText).toBeVisible();
          await expect(absentText).toBeVisible();
        }
      }
    });
    
    test("attendance displays correct badge colors for status", async ({ page }) => {
      await devLogin(page, ADMIN_EMAIL);
      await page.goto("/admin/attendance");
      
      // Select first class if available
      const classList = page.locator('a[href*="/admin/attendance?classId="]').first();
      const hasClasses = await classList.isVisible({ timeout: 2000 }).catch(() => false);
      
      if (hasClasses) {
        await classList.click();
        await page.waitForTimeout(1000);
        
        const hasTable = await page.locator("table").isVisible({ timeout: 2000 }).catch(() => false);
        
        if (hasTable) {
          // Check for status badges
          const badges = page.locator(".badge");
          const badgeCount = await badges.count();
          
          if (badgeCount > 0) {
            // Should have at least one of: badge-success, badge-warning, or badge-danger
            const hasStatusBadge = await page.locator(".badge-success, .badge-warning, .badge-danger").first().isVisible({ timeout: 1000 }).catch(() => false);
            expect(hasStatusBadge).toBeTruthy();
          }
        }
      }
    });
  });
  
  // ── A5.2: EXAMINATIONS ──────────────────────────────────────────────────────
  
  test.describe("A5.2: Examinations", () => {
    
    test("examinations page loads with exam list", async ({ page }) => {
      await devLogin(page, ADMIN_EMAIL);
      await page.goto("/admin/examinations");
      
      // Page title
      await expect(page.locator("h1")).toContainText("Examinations");
      
      // Description with link to Results
      await expect(page.locator("text=/All exams across programmes/i")).toBeVisible();
      await expect(page.locator('a[href="/admin/results"]')).toBeVisible();
    });
    
    test("exam list shows exam details", async ({ page }) => {
      await devLogin(page, ADMIN_EMAIL);
      await page.goto("/admin/examinations");
      
      await page.waitForSelector("h1", { timeout: 10000 });
      
      // Check for exams or no exams message
      const noExams = page.locator("text=/No exams created yet/i");
      const examCard = page.locator(".card").nth(1); // Skip page card
      
      const hasNoExams = await noExams.isVisible({ timeout: 2000 }).catch(() => false);
      const hasExams = await examCard.isVisible({ timeout: 2000 }).catch(() => false);
      
      expect(hasNoExams || hasExams).toBeTruthy();
      
      if (hasExams) {
        // Check exam details are shown
        const examTitle = examCard.locator("h2");
        await expect(examTitle).toBeVisible();
        
        // Should show status badge
        await expect(examCard.locator(".badge")).toBeVisible();
        
        // Should show pass mark and attempts info
        await expect(examCard.locator("text=/Pass mark:/i")).toBeVisible();
        await expect(examCard.locator("text=/attempts/i")).toBeVisible();
      }
    });
    
    test("exam status badges display correctly", async ({ page }) => {
      await devLogin(page, ADMIN_EMAIL);
      await page.goto("/admin/examinations");
      
      await page.waitForSelector("h1", { timeout: 10000 });
      
      const examCard = page.locator(".card").nth(1);
      const hasExams = await examCard.isVisible({ timeout: 2000 }).catch(() => false);
      
      if (hasExams) {
        const badge = examCard.locator(".badge").first();
        const badgeText = await badge.textContent();
        
        // Should be one of: DRAFT, PUBLISHED, ARCHIVED
        expect(["DRAFT", "PUBLISHED", "ARCHIVED"]).toContain(badgeText);
      }
    });
  });
  
  // ── A5.3: RESULTS AND GRADING ───────────────────────────────────────────────
  
  test.describe("A5.3: Results and Grading", () => {
    
    test("results page loads with tabs", async ({ page }) => {
      await devLogin(page, ADMIN_EMAIL);
      await page.goto("/admin/results");
      
      // Page title
      await expect(page.locator("h1")).toContainText("Results & Grading");
      
      // Description
      await expect(page.locator("text=/Process submitted exam results/i")).toBeVisible();
      
      // Export button
      await expect(page.locator('a[href="/api/results/export"]')).toBeVisible();
      
      // Tabs
      await expect(page.locator("text=/Pending Results/i")).toBeVisible();
      await expect(page.locator("text=/Publication Requests/i")).toBeVisible();
      await expect(page.locator("text=/Submit for Publication/i")).toBeVisible();
    });
    
    test("pending results tab shows submitted attempts", async ({ page }) => {
      await devLogin(page, ADMIN_EMAIL);
      await page.goto("/admin/results?tab=pending");
      
      await page.waitForSelector("h1", { timeout: 10000 });
      
      // Check for pending results or no results message
      const noPending = page.locator("text=/No exam results pending processing/i");
      const resultsTable = page.locator("table");
      
      const hasNoPending = await noPending.isVisible({ timeout: 2000 }).catch(() => false);
      const hasTable = await resultsTable.isVisible({ timeout: 2000 }).catch(() => false);
      
      expect(hasNoPending || hasTable).toBeTruthy();
      
      if (hasTable) {
        // Check table headers
        await expect(page.locator("th:has-text('Student')")).toBeVisible();
        await expect(page.locator("th:has-text('Exam')")).toBeVisible();
        await expect(page.locator("th:has-text('Course')")).toBeVisible();
        await expect(page.locator("th:has-text('Score')")).toBeVisible();
        await expect(page.locator("th:has-text('Submitted')")).toBeVisible();
      }
    });
    
    test("publication requests tab shows approval requests", async ({ page }) => {
      await devLogin(page, ADMIN_EMAIL);
      await page.goto("/admin/results?tab=approvals");
      
      await page.waitForSelector("h1", { timeout: 10000 });
      
      // Check for requests or no requests message
      const noRequests = page.locator("text=/No publication requests pending/i");
      const requestCard = page.locator(".card").nth(1); // Skip page wrapper
      
      const hasNoRequests = await noRequests.isVisible({ timeout: 2000 }).catch(() => false);
      const hasRequests = await requestCard.locator(".badge-warning").isVisible({ timeout: 2000 }).catch(() => false);
      
      expect(hasNoRequests || hasRequests).toBeTruthy();
    });
    
    test("submit for publication tab shows form", async ({ page }) => {
      await devLogin(page, ADMIN_EMAIL);
      await page.goto("/admin/results?tab=submit");
      
      await page.waitForSelector("h1", { timeout: 10000 });
      
      // Form heading
      await expect(page.locator("text=/Request Results Publication/i")).toBeVisible();
      
      // Form description
      await expect(page.locator("text=/Submit a request for exam results/i")).toBeVisible();
      
      // Check for form or no exams message
      const noExams = page.locator("text=/No exams with pending results found/i");
      const examSelect = page.locator("select");
      
      const hasNoExams = await noExams.isVisible({ timeout: 2000 }).catch(() => false);
      const hasForm = await examSelect.isVisible({ timeout: 2000 }).catch(() => false);
      
      expect(hasNoExams || hasForm).toBeTruthy();
      
      if (hasForm) {
        // Check form fields
        await expect(page.locator("label:has-text('Exam')")).toBeVisible();
        await expect(page.locator("label:has-text('Notes')")).toBeVisible();
        await expect(page.locator("button:has-text('Submit for approval')")).toBeVisible();
      }
    });
    
    test("tabs maintain selected state via URL", async ({ page }) => {
      await devLogin(page, ADMIN_EMAIL);
      
      // Navigate to each tab
      await page.goto("/admin/results?tab=pending");
      await expect(page.locator(".bg-primary.text-white:has-text('Pending Results')")).toBeVisible();
      
      await page.goto("/admin/results?tab=approvals");
      await expect(page.locator(".bg-primary.text-white:has-text('Publication Requests')")).toBeVisible();
      
      await page.goto("/admin/results?tab=submit");
      await expect(page.locator(".bg-primary.text-white:has-text('Submit for Publication')")).toBeVisible();
    });
    
    test("export link has download attribute", async ({ page }) => {
      await devLogin(page, ADMIN_EMAIL);
      await page.goto("/admin/results");
      
      const exportLink = page.locator('a[href="/api/results/export"]');
      await expect(exportLink).toHaveAttribute("download");
    });
  });
  
  // ── A5.4: CERTIFICATE LISTS ─────────────────────────────────────────────────
  
  test.describe("A5.4: Certificate Lists", () => {
    
    test("certificate lists page loads", async ({ page }) => {
      await devLogin(page, ADMIN_EMAIL);
      await page.goto("/admin/certificates");
      
      // Page title
      await expect(page.locator("h1")).toContainText("Certificate Lists");
      
      // Description
      await expect(page.locator("text=/Students who meet all requirements/i")).toBeVisible();
    });
    
    test("certificate page has correct RBAC check", async ({ page }) => {
      await devLogin(page, ADMIN_EMAIL);
      await page.goto("/admin/certificates");
      
      // Should not be 403 or 404
      await expect(page.locator("h1")).toBeVisible({ timeout: 10000 });
      
      // Should not show error page
      const is403 = page.url().includes("/403");
      expect(is403).toBeFalsy();
    });
    
    test("certificate page describes requirements", async ({ page }) => {
      await devLogin(page, ADMIN_EMAIL);
      await page.goto("/admin/certificates");
      
      // Should mention the requirements
      await expect(page.locator("text=/lessons complete/i")).toBeVisible();
      await expect(page.locator("text=/exams passed/i")).toBeVisible();
      await expect(page.locator("text=/attendance met/i")).toBeVisible();
      await expect(page.locator("text=/fees at 100 percent/i")).toBeVisible();
    });
  });
  
  // ── A5.5: NAVIGATION AND ACCESS ────────────────────────────────────────────
  
  test.describe("A5.5: Navigation and Access", () => {
    
    test("all A5 pages are accessible from sidebar", async ({ page }) => {
      await devLogin(page, ADMIN_EMAIL);
      await page.goto("/admin");
      
      // Check for Teaching group links
      await expect(page.getByRole("link", { name: "Attendance" })).toBeVisible();
      await expect(page.getByRole("link", { name: "Examinations" })).toBeVisible();
      await expect(page.getByRole("link", { name: "Results and Grading" })).toBeVisible();
      
      // Certificate Lists should be visible
      const certLink = page.locator('a[href="/admin/certificates"]');
      await expect(certLink).toBeVisible();
    });
    
    test("attendance link navigates correctly", async ({ page }) => {
      await devLogin(page, ADMIN_EMAIL);
      await page.goto("/admin");
      
      await page.getByRole("link", { name: "Attendance" }).click();
      await page.waitForURL(/\/admin\/attendance/, { timeout: 10000 });
      await expect(page.locator("h1")).toContainText("Attendance");
    });
    
    test("examinations link navigates correctly", async ({ page }) => {
      await devLogin(page, ADMIN_EMAIL);
      await page.goto("/admin");
      
      await page.getByRole("link", { name: "Examinations" }).click();
      await page.waitForURL(/\/admin\/examinations/, { timeout: 10000 });
      await expect(page.locator("h1")).toContainText("Examinations");
    });
    
    test("results link navigates correctly", async ({ page }) => {
      await devLogin(page, ADMIN_EMAIL);
      await page.goto("/admin");
      
      await page.getByRole("link", { name: "Results and Grading" }).click();
      await page.waitForURL(/\/admin\/results/, { timeout: 10000 });
      await expect(page.locator("h1")).toContainText("Results");
    });
  });
  
  // ── A5.6: RESPONSIVE DESIGN ─────────────────────────────────────────────────
  
  test.describe("A5.6: Responsive Design", () => {
    
    test("attendance page works at mobile width", async ({ page }) => {
      await page.setViewportSize({ width: 390, height: 844 });
      await devLogin(page, ADMIN_EMAIL);
      await page.goto("/admin/attendance");
      
      await expect(page.locator("h1")).toBeVisible();
      await expect(page.locator("text=/Recent Classes/i")).toBeVisible();
    });
    
    test("examinations page works at mobile width", async ({ page }) => {
      await page.setViewportSize({ width: 390, height: 844 });
      await devLogin(page, ADMIN_EMAIL);
      await page.goto("/admin/examinations");
      
      await expect(page.locator("h1")).toBeVisible();
    });
    
    test("results page works at mobile width", async ({ page }) => {
      await page.setViewportSize({ width: 390, height: 844 });
      await devLogin(page, ADMIN_EMAIL);
      await page.goto("/admin/results");
      
      await expect(page.locator("h1")).toBeVisible();
      
      // Tabs should wrap or scroll
      await expect(page.locator("text=/Pending Results/i")).toBeVisible();
    });
    
    test("certificates page works at mobile width", async ({ page }) => {
      await page.setViewportSize({ width: 390, height: 844 });
      await devLogin(page, ADMIN_EMAIL);
      await page.goto("/admin/certificates");
      
      await expect(page.locator("h1")).toBeVisible();
    });
    
    test("attendance page works at desktop width", async ({ page }) => {
      await page.setViewportSize({ width: 1440, height: 900 });
      await devLogin(page, ADMIN_EMAIL);
      await page.goto("/admin/attendance");
      
      await expect(page.locator("h1")).toBeVisible();
      
      // Should show side-by-side layout
      await expect(page.locator("text=/Recent Classes/i")).toBeVisible();
    });
  });
});
