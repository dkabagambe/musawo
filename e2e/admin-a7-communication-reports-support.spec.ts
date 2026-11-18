import { test, expect } from "@playwright/test";

test.describe("Admin A7: Communication, Reports, Support", () => {
  test.beforeEach(async ({ page }) => {
    // Dev login as Admin
    await page.goto("/dev/login");
    await page.fill('input[name="email"]', "admin@mtc.ac.ug");
    await page.click('button:has-text("Sign In")');
    await page.waitForURL(/\/admin/);
  });

  test.describe("A7.1: Announcements", () => {
    test("announcements page loads with create form", async ({ page }) => {
      await page.goto("/admin/announcements");
      await expect(page.getByRole("heading", { name: "Announcements" })).toBeVisible();
      await expect(page.getByText(/Create administrative announcements/i)).toBeVisible();
      
      // Should show info about approval workflow
      await expect(page.getByText(/Operational notices.*sent immediately/i)).toBeVisible();
      await expect(page.getByText(/Institution-wide.*require.*approval/i)).toBeVisible();
    });

    test("new announcement button shows form", async ({ page }) => {
      await page.goto("/admin/announcements");
      await page.click("button:has-text('New Announcement')");
      
      // Form fields visible
      await expect(page.locator('input[name="title"], label:has-text("Subject") input')).toBeVisible();
      await expect(page.locator('textarea[name="body"], label:has-text("Message") textarea')).toBeVisible();
      await expect(page.locator('select[name="audienceType"], label:has-text("Audience") select')).toBeVisible();
      await expect(page.locator('select[name="channel"], label:has-text("Delivery") select')).toBeVisible();
    });

    test("audience options include staff, students, course, intake, all", async ({ page }) => {
      await page.goto("/admin/announcements");
      await page.click("button:has-text('New Announcement')");
      
      const audienceSelect = page.locator('label:has-text("Audience") select');
      await expect(audienceSelect).toBeVisible();
      
      const options = await audienceSelect.locator("option").allTextContents();
      expect(options.some(o => o.includes("Staff"))).toBe(true);
      expect(options.some(o => o.includes("Students"))).toBe(true);
      expect(options.some(o => o.includes("Course"))).toBe(true);
      expect(options.some(o => o.includes("Intake"))).toBe(true);
      expect(options.some(o => o.includes("Institution-wide"))).toBe(true);
    });

    test("institution-wide shows approval warning", async ({ page }) => {
      await page.goto("/admin/announcements");
      await page.click("button:has-text('New Announcement')");
      
      await page.selectOption('label:has-text("Audience") select', "ALL");
      await expect(page.getByText(/require.*Principal approval/i)).toBeVisible();
    });
  });

  test.describe("A7.2: Messages", () => {
    test("messages page has inbox and compose tabs", async ({ page }) => {
      await page.goto("/admin/messages");
      await expect(page.getByRole("heading", { name: "Messages" })).toBeVisible();
      
      // Tabs visible
      await expect(page.getByRole("button", { name: /Inbox/i })).toBeVisible();
      await expect(page.getByRole("button", { name: /Compose/i })).toBeVisible();
    });

    test("compose tab shows message form with recipient types", async ({ page }) => {
      await page.goto("/admin/messages");
      await page.click("button:has-text('Compose')");
      
      // Form fields
      await expect(page.locator('label:has-text("Recipient Type") select')).toBeVisible();
      await expect(page.locator('label:has-text("Recipient") select')).toBeVisible();
      await expect(page.locator('label:has-text("Subject") input')).toBeVisible();
      await expect(page.locator('label:has-text("Message") textarea')).toBeVisible();
      
      // Recipient types
      const typeSelect = page.locator('label:has-text("Recipient Type") select');
      const options = await typeSelect.locator("option").allTextContents();
      expect(options.includes("Instructor")).toBe(true);
      expect(options.includes("Student")).toBe(true);
    });

    test("inbox tab shows received messages", async ({ page }) => {
      await page.goto("/admin/messages");
      // Default should be inbox
      await expect(page.getByText(/Received Messages/i)).toBeVisible();
    });
  });

  test.describe("A7.3: Notifications", () => {
    test("notifications page loads", async ({ page }) => {
      await page.goto("/admin/notifications");
      await expect(page.getByRole("heading", { name: "Notifications" })).toBeVisible();
    });

    test("notifications show unread count filter", async ({ page }) => {
      await page.goto("/admin/notifications");
      await expect(page.locator('a, button').filter({ hasText: /unread|show all/i })).toBeVisible();
    });
  });

  test.describe("A7.4: Reports", () => {
    test("reports page loads with report types", async ({ page }) => {
      await page.goto("/admin/reports");
      await expect(page.getByRole("heading", { name: "Reports" })).toBeVisible();
      
      // Report type selection
      await expect(page.getByText("Student Lists")).toBeVisible();
      await expect(page.getByText("Registration Reports")).toBeVisible();
      await expect(page.getByText("Class Lists")).toBeVisible();
      await expect(page.getByText("Attendance Summaries")).toBeVisible();
      await expect(page.getByText("Results Summaries")).toBeVisible();
      await expect(page.getByText("Applications Funnel")).toBeVisible();
      await expect(page.getByText("Missing Documents")).toBeVisible();
    });

    test("reports page has filters for course, intake, status", async ({ page }) => {
      await page.goto("/admin/reports");
      
      await expect(page.locator('label:has-text("Course") select')).toBeVisible();
      await expect(page.locator('label:has-text("Intake") select')).toBeVisible();
    });

    test("reports page has export buttons for CSV and PDF", async ({ page }) => {
      await page.goto("/admin/reports");
      
      await expect(page.getByRole("button", { name: /Export CSV/i })).toBeVisible();
      await expect(page.getByRole("button", { name: /Export PDF/i })).toBeVisible();
    });

    test("export audit notice is displayed", async ({ page }) => {
      await page.goto("/admin/reports");
      await expect(page.getByText(/exports are audit logged/i)).toBeVisible();
    });
  });

  test.describe("A7.5: Support", () => {
    test("support page shows my tickets only", async ({ page }) => {
      await page.goto("/admin/support");
      await expect(page.getByRole("heading", { name: /My Support Tickets/i })).toBeVisible();
      await expect(page.getByText(/Submit tickets to IT Admin/i)).toBeVisible();
    });

    test("new ticket button shows form", async ({ page }) => {
      await page.goto("/admin/support");
      await page.click("button:has-text('New Ticket')");
      
      // Form visible
      await expect(page.getByText("Submit New Ticket")).toBeVisible();
      await expect(page.locator('label:has-text("Category") select')).toBeVisible();
      await expect(page.locator('label:has-text("Subject") input')).toBeVisible();
      await expect(page.locator('label:has-text("Description") textarea')).toBeVisible();
    });

    test("ticket categories include general, technical, academic", async ({ page }) => {
      await page.goto("/admin/support");
      await page.click("button:has-text('New Ticket')");
      
      const categorySelect = page.locator('label:has-text("Category") select');
      const options = await categorySelect.locator("option").allTextContents();
      
      expect(options.some(o => o.toLowerCase().includes("general"))).toBe(true);
      expect(options.some(o => o.toLowerCase().includes("technical"))).toBe(true);
      expect(options.some(o => o.toLowerCase().includes("academic"))).toBe(true);
    });

    test("support page does not show desk management interface", async ({ page }) => {
      await page.goto("/admin/support");
      
      // Admin should NOT see filters like "MINE", "WAITING", "CLOSED" (IT Admin features)
      // Should only see her own tickets
      await expect(page.getByText("MINE")).not.toBeVisible();
      await expect(page.getByRole("button", { name: "Assign to me" })).not.toBeVisible();
    });
  });

  test.describe("A7.6: Navigation", () => {
    test("all A7 pages accessible from sidebar", async ({ page }) => {
      await page.goto("/admin");
      
      // Communication group
      await expect(page.getByRole("link", { name: "Announcements" })).toBeVisible();
      await expect(page.getByRole("link", { name: "Messages" })).toBeVisible();
      await expect(page.getByRole("link", { name: "Notifications" })).toBeVisible();
      
      // Reports
      await expect(page.getByRole("link", { name: "Reports" })).toBeVisible();
      
      // Support
      await expect(page.getByRole("link", { name: "Support" })).toBeVisible();
    });
  });

  test.describe("A7.7: Responsive Design", () => {
    test("announcements page works at mobile width", async ({ page }) => {
      await page.setViewportSize({ width: 390, height: 844 });
      await page.goto("/admin/announcements");
      await expect(page.getByRole("heading", { name: "Announcements" })).toBeVisible();
    });

    test("messages page works at mobile width", async ({ page }) => {
      await page.setViewportSize({ width: 390, height: 844 });
      await page.goto("/admin/messages");
      await expect(page.getByRole("heading", { name: "Messages" })).toBeVisible();
    });

    test("reports page works at mobile width", async ({ page }) => {
      await page.setViewportSize({ width: 390, height: 844 });
      await page.goto("/admin/reports");
      await expect(page.getByRole("heading", { name: "Reports" })).toBeVisible();
    });

    test("support page works at mobile width", async ({ page }) => {
      await page.setViewportSize({ width: 390, height: 844 });
      await page.goto("/admin/support");
      await expect(page.getByRole("heading", { name: /My Support Tickets/i })).toBeVisible();
    });

    test("all A7 pages work at desktop width", async ({ page }) => {
      await page.setViewportSize({ width: 1440, height: 900 });
      
      await page.goto("/admin/announcements");
      await expect(page.getByRole("heading", { name: "Announcements" })).toBeVisible();
      
      await page.goto("/admin/messages");
      await expect(page.getByRole("heading", { name: "Messages" })).toBeVisible();
      
      await page.goto("/admin/reports");
      await expect(page.getByRole("heading", { name: "Reports" })).toBeVisible();
      
      await page.goto("/admin/support");
      await expect(page.getByRole("heading", { name: /My Support Tickets/i })).toBeVisible();
    });
  });
});
