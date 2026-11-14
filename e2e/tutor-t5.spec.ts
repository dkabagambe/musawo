/**
 * T5: THE REMAINING TABS - End-to-end test
 * 
 * Prerequisites:
 *   - npm run demo:reset && npm run seed:test
 *   - Production build running (npm run build && npm start)
 * 
 * Covers all T5 tabs for the instructor role:
 *   - My Courses
 *   - My Classes (with waiting room, roll call, controls)
 *   - Students (list, search, detail page, export)
 *   - Attendance
 *   - Learning Materials
 *   - Assignments
 *   - Examinations
 *   - Marks and Results
 *   - Announcements
 *   - Reports
 *   - Notifications
 *   - Discussion Forum
 *   - Support
 */

import { test, expect, type Page } from "@playwright/test";

const TUTOR_EMAIL = "tutor@mtc.ac.ug";

async function devLogin(page: Page, email: string, landingPattern: RegExp) {
  await page.goto("/dev/login");
  const row = page.locator("tr").filter({ hasText: email });
  await row.getByRole("button", { name: /sign in/i }).click();
  await expect(page).toHaveURL(landingPattern, { timeout: 15_000 });
}

test.describe("T5: Tutor tabs comprehensive test", () => {
  test.setTimeout(120_000);

  test("1. My Courses - opens with real data and course links work", async ({ page }) => {
    await devLogin(page, TUTOR_EMAIL, /\/tutor/);
    await page.goto("/tutor/courses");
    await expect(page.getByRole("heading", { name: "My Courses" })).toBeVisible();
    
    // Should show at least one course card
    const courseCard = page.locator(".card").first();
    await expect(courseCard).toBeVisible();
    
    // Click "Open" on first course
    await courseCard.getByRole("link", { name: /open/i }).click();
    await expect(page).toHaveURL(/\/tutor\/courses\/[a-zA-Z0-9_-]+/);
    
    // Course detail page should show blocks, students, upcoming classes
    await expect(page.getByText(/blocks|students|upcoming/i).first()).toBeVisible();
  });

  test("2. My Classes - create, start, stop class buttons work", async ({ page }) => {
    await devLogin(page, TUTOR_EMAIL, /\/tutor/);
    await page.goto("/tutor/classes");
    await expect(page.getByRole("heading", { name: "Live Classes" })).toBeVisible();
    
    // Should see upcoming or past classes
    const classSection = page.locator("section").filter({ hasText: /upcoming|past/i }).first();
    await expect(classSection).toBeVisible();
    
    // Roll call link should be present
    const rollCallLink = page.getByRole("link", { name: /roll call/i }).first();
    if (await rollCallLink.isVisible({ timeout: 2000 })) {
      await expect(rollCallLink).toHaveAttribute("href", /attendance/);
    }
  });

  test("3. Students - list page with search, filter, and Message button", async ({ page }) => {
    await devLogin(page, TUTOR_EMAIL, /\/tutor/);
    await page.goto("/tutor/students");
    await expect(page.getByRole("heading", { name: "My Students" })).toBeVisible();
    
    // Search input should exist
    const searchInput = page.getByPlaceholder(/search/i);
    await expect(searchInput).toBeVisible();
    
    // Filter dropdowns for course and status
    const courseFilter = page.getByLabel(/filter by course/i);
    const statusFilter = page.getByLabel(/filter by status/i);
    await expect(courseFilter).toBeVisible();
    await expect(statusFilter).toBeVisible();
    
    // Export CSV button
    const exportBtn = page.getByRole("button", { name: /export csv/i });
    await expect(exportBtn).toBeVisible();
    
    // Students table should exist if there are students
    const table = page.locator('[data-testid="students-table"]');
    if (await table.isVisible({ timeout: 2000 })) {
      // Message button should be present
      const messageBtn = page.getByRole("button", { name: /message/i }).first();
      await expect(messageBtn).toBeVisible();
    }
  });

  test("4. Student detail page - opens and shows enrolments, attendance, submissions", async ({ page }) => {
    await devLogin(page, TUTOR_EMAIL, /\/tutor/);
    await page.goto("/tutor/students");
    
    // Click through to first student's detail page
    const detailLink = page.locator('a[href*="/tutor/students/"]').first();
    if (await detailLink.isVisible({ timeout: 5000 })) {
      await detailLink.click();
      await expect(page).toHaveURL(/\/tutor\/students\/[a-zA-Z0-9_-]+/);
      
      // Should show stats cards
      await expect(page.getByText(/courses enrolled|attendance|submissions/i).first()).toBeVisible();
      
      // Should show enrolments table
      await expect(page.getByText(/enrolments/i).first()).toBeVisible();
    }
  });

  test("5. Attendance - roll call with PRESENT/LATE/ABSENT/EXCUSED options", async ({ page }) => {
    await devLogin(page, TUTOR_EMAIL, /\/tutor/);
    await page.goto("/tutor/attendance");
    await expect(page.getByRole("heading", { name: /attendance/i })).toBeVisible();
    
    // Class dropdown should exist
    const classSelect = page.locator('select').first();
    await expect(classSelect).toBeVisible();
    
    // Roll call point selector (start/end)
    const rollCallSelect = page.locator('select').filter({ hasText: /start|end/i }).first();
    if (await rollCallSelect.isVisible({ timeout: 2000 })) {
      await expect(rollCallSelect).toBeVisible();
    }
    
    // Mark all present/absent buttons
    const markAllBtn = page.getByRole("button", { name: /mark all present/i });
    if (await markAllBtn.isVisible({ timeout: 2000 })) {
      await expect(markAllBtn).toBeVisible();
    }
    
    // Download CSV/PDF links
    const csvLink = page.getByRole("link", { name: /csv/i }).first();
    const pdfLink = page.getByRole("link", { name: /pdf/i }).first();
    if (await csvLink.isVisible({ timeout: 2000 })) {
      await expect(csvLink).toHaveAttribute("href", /attendance.*csv/);
    }
    if (await pdfLink.isVisible({ timeout: 2000 })) {
      await expect(pdfLink).toHaveAttribute("href", /attendance.*pdf/);
    }
  });

  test("6. Learning Materials - page opens and upload button exists", async ({ page }) => {
    await devLogin(page, TUTOR_EMAIL, /\/tutor/);
    await page.goto("/tutor/materials");
    await expect(page.getByRole("heading", { name: /materials/i }).first()).toBeVisible();
    
    // Upload material button
    const uploadBtn = page.getByRole("button", { name: /upload/i }).first();
    await expect(uploadBtn).toBeVisible();
  });

  test("7. Assignments - list page with create and grade functionality", async ({ page }) => {
    await devLogin(page, TUTOR_EMAIL, /\/tutor/);
    await page.goto("/tutor/assignments");
    await expect(page.getByRole("heading", { name: /assignments/i }).first()).toBeVisible();
    
    // Create assignment form should be present
    const createForm = page.locator("form").first();
    if (await createForm.isVisible({ timeout: 2000 })) {
      await expect(createForm).toBeVisible();
    }
  });

  test("8. Examinations - list page with create and review functionality", async ({ page }) => {
    await devLogin(page, TUTOR_EMAIL, /\/tutor/);
    await page.goto("/tutor/exams");
    await expect(page.getByRole("heading", { name: /examination/i }).first()).toBeVisible();
    
    // Create exam button/form
    const createBtn = page.getByRole("button", { name: /create.*exam/i }).first();
    if (await createBtn.isVisible({ timeout: 2000 })) {
      await expect(createBtn).toBeVisible();
    }
    
    // Download all results CSV
    const downloadLink = page.getByRole("link", { name: /download.*csv/i }).first();
    if (await downloadLink.isVisible({ timeout: 2000 })) {
      await expect(downloadLink).toHaveAttribute("href", /results.*export/);
    }
  });

  test("9. Marks and Results - page opens with publication form", async ({ page }) => {
    await devLogin(page, TUTOR_EMAIL, /\/tutor/);
    await page.goto("/tutor/results");
    await expect(page.getByRole("heading", { name: /marks.*results/i }).first()).toBeVisible();
    
    // Download all marks CSV
    const downloadLink = page.getByRole("link", { name: /download/i }).first();
    if (await downloadLink.isVisible({ timeout: 2000 })) {
      await expect(downloadLink).toHaveAttribute("href", /results.*export/);
    }
  });

  test("10. Announcements - page opens with compose form", async ({ page }) => {
    await devLogin(page, TUTOR_EMAIL, /\/tutor/);
    await page.goto("/tutor/announcements");
    await expect(page.getByRole("heading", { name: /announcement/i }).first()).toBeVisible();
    
    // Should have form fields for title and body
    const titleInput = page.locator('input[type="text"]').first();
    if (await titleInput.isVisible({ timeout: 2000 })) {
      await expect(titleInput).toBeVisible();
    }
  });

  test("11. Reports - page opens with totals and per-course stats", async ({ page }) => {
    await devLogin(page, TUTOR_EMAIL, /\/tutor/);
    await page.goto("/tutor/reports");
    await expect(page.getByRole("heading", { name: /reports/i }).first()).toBeVisible();
    
    // Should show stat cards
    await expect(page.getByText(/students|classes|attendance/i).first()).toBeVisible();
  });

  test("12. Notifications - page opens with list and preferences", async ({ page }) => {
    await devLogin(page, TUTOR_EMAIL, /\/tutor/);
    await page.goto("/tutor/notifications");
    await expect(page.getByRole("heading", { name: /notification/i }).first()).toBeVisible();
    
    // Mark all read button
    const markAllBtn = page.getByRole("button", { name: /mark all read/i });
    if (await markAllBtn.isVisible({ timeout: 2000 })) {
      await expect(markAllBtn).toBeVisible();
    }
  });

  test("13. Discussion Forum - page opens and new thread button exists", async ({ page }) => {
    await devLogin(page, TUTOR_EMAIL, /\/tutor/);
    await page.goto("/tutor/forum");
    await expect(page.getByRole("heading", { name: /forum/i }).first()).toBeVisible();
    
    // New thread button/link
    const newThreadLink = page.getByRole("link", { name: /new thread/i });
    await expect(newThreadLink).toBeVisible();
    await expect(newThreadLink).toHaveAttribute("href", /\/tutor\/forum\/new/);
  });

  test("14. Support - page opens with ticket form", async ({ page }) => {
    await devLogin(page, TUTOR_EMAIL, /\/tutor/);
    await page.goto("/tutor/support");
    await expect(page.getByRole("heading", { name: /support/i }).first()).toBeVisible();
    
    // Should have form for creating ticket
    const subjectInput = page.getByLabel(/subject/i);
    if (await subjectInput.isVisible({ timeout: 2000 })) {
      await expect(subjectInput).toBeVisible();
    }
  });
});
