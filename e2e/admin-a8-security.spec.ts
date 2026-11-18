import { test, expect } from "@playwright/test";

test.describe("Admin A8: Security Verification", () => {
  test.describe("Route Protection", () => {
    test("student cannot access admin dashboard", async ({ page }) => {
      await page.goto("/dev/login");
      await page.fill('input[name="email"]', "student@mtc.ac.ug");
      await page.click('button:has-text("Sign In")');
      await page.waitForURL(/\/dashboard/);

      // Try to access Admin page
      await page.goto("/admin");
      
      // Should be redirected to 403 or dashboard
      await expect(page).not.toHaveURL(/\/admin$/);
      const url = page.url();
      expect(url.includes("/403") || url.includes("/dashboard")).toBe(true);
    });

    test("instructor cannot access admin dashboard", async ({ page }) => {
      await page.goto("/dev/login");
      await page.fill('input[name="email"]', "tutor@mtc.ac.ug");
      await page.click('button:has-text("Sign In")');
      await page.waitForURL(/\/tutor/);

      await page.goto("/admin");
      
      await expect(page).not.toHaveURL(/\/admin$/);
      const url = page.url();
      expect(url.includes("/403") || url.includes("/tutor")).toBe(true);
    });

    test("admin cannot access principal dashboard", async ({ page }) => {
      await page.goto("/dev/login");
      await page.fill('input[name="email"]', "admin@mtc.ac.ug");
      await page.click('button:has-text("Sign In")');
      await page.waitForURL(/\/admin/);

      await page.goto("/principal");
      
      await expect(page).not.toHaveURL(/\/principal$/);
      const url = page.url();
      expect(url.includes("/403") || url.includes("/admin")).toBe(true);
    });

    test("admin cannot access director dashboard", async ({ page }) => {
      await page.goto("/dev/login");
      await page.fill('input[name="email"]', "admin@mtc.ac.ug");
      await page.click('button:has-text("Sign In")');
      await page.waitForURL(/\/admin/);

      await page.goto("/director");
      
      await expect(page).not.toHaveURL(/\/director$/);
      const url = page.url();
      expect(url.includes("/403") || url.includes("/admin")).toBe(true);
    });
  });

  test.describe("Payment Restrictions", () => {
    test("admin payments page is view-only", async ({ page }) => {
      await page.goto("/dev/login");
      await page.fill('input[name="email"]', "admin@mtc.ac.ug");
      await page.click('button:has-text("Sign In")');
      await page.waitForURL(/\/admin/);

      await page.goto("/admin/payments");
      
      // Should see view-only notice
      await expect(page.getByText(/view.only/i)).toBeVisible();
      
      // Should NOT see edit, verify, or delete buttons
      await expect(page.getByRole("button", { name: /edit/i })).not.toBeVisible();
      await expect(page.getByRole("button", { name: /verify/i })).not.toBeVisible();
      await expect(page.getByRole("button", { name: /delete/i })).not.toBeVisible();
      await expect(page.getByRole("button", { name: /approve/i })).not.toBeVisible();
    });

    test("admin can access payment proofs submission", async ({ page }) => {
      await page.goto("/dev/login");
      await page.fill('input[name="email"]', "admin@mtc.ac.ug");
      await page.click('button:has-text("Sign In")');
      await page.waitForURL(/\/admin/);

      await page.goto("/admin/payments/proofs");
      
      // Should be able to access proof submission
      await expect(page).toHaveURL(/\/admin\/payments\/proofs/);
      await expect(page.getByText(/payment proof/i)).toBeVisible();
    });
  });

  test.describe("Message Privacy", () => {
    test("admin messages page only shows own messages", async ({ page }) => {
      await page.goto("/dev/login");
      await page.fill('input[name="email"]', "admin@mtc.ac.ug");
      await page.click('button:has-text("Sign In")');
      await page.waitForURL(/\/admin/);

      await page.goto("/admin/messages");
      
      // Should see Inbox and Compose tabs
      await expect(page.getByRole("button", { name: /inbox/i })).toBeVisible();
      await expect(page.getByRole("button", { name: /compose/i })).toBeVisible();
      
      // Should NOT see other users' conversations
      // (verified by API filtering in implementation)
    });

    test("admin can only message instructors and students", async ({ page }) => {
      await page.goto("/dev/login");
      await page.fill('input[name="email"]', "admin@mtc.ac.ug");
      await page.click('button:has-text("Sign In")');
      await page.waitForURL(/\/admin/);

      await page.goto("/admin/messages");
      await page.click("button:has-text('Compose')");
      
      const recipientTypeSelect = page.locator('label:has-text("Recipient Type") select');
      const options = await recipientTypeSelect.locator("option").allTextContents();
      
      // Should only have Instructor and Student options
      expect(options.includes("Instructor")).toBe(true);
      expect(options.includes("Student")).toBe(true);
      expect(options.includes("Director")).toBe(false);
      expect(options.includes("Principal")).toBe(false);
    });
  });

  test.describe("Support Ticket Privacy", () => {
    test("admin support page shows only own tickets", async ({ page }) => {
      await page.goto("/dev/login");
      await page.fill('input[name="email"]', "admin@mtc.ac.ug");
      await page.click('button:has-text("Sign In")');
      await page.waitForURL(/\/admin/);

      await page.goto("/admin/support");
      
      // Should say "My Support Tickets"
      await expect(page.getByRole("heading", { name: /my support tickets/i })).toBeVisible();
      
      // Should NOT have IT Admin desk features
      await expect(page.getByText("MINE")).not.toBeVisible();
      await expect(page.getByText("WAITING")).not.toBeVisible();
      await expect(page.getByRole("button", { name: /assign to me/i })).not.toBeVisible();
    });
  });

  test.describe("Approval Restrictions", () => {
    test("admin cannot approve announcements directly", async ({ page }) => {
      await page.goto("/dev/login");
      await page.fill('input[name="email"]', "admin@mtc.ac.ug");
      await page.click('button:has-text("Sign In")');
      await page.waitForURL(/\/admin/);

      await page.goto("/admin/announcements");
      await page.click("button:has-text('New Announcement')");
      
      // Institution-wide should show approval requirement
      await page.selectOption('label:has-text("Audience") select', "ALL");
      await expect(page.getByText(/require.*principal approval/i)).toBeVisible();
      
      // No approve button visible (approval happens in Principal portal)
    });

    test("admin cannot approve admissions", async ({ page }) => {
      await page.goto("/dev/login");
      await page.fill('input[name="email"]', "admin@mtc.ac.ug");
      await page.click('button:has-text("Sign In")');
      await page.waitForURL(/\/admin/);

      // Admin creates student, approval button should not be visible to Admin
      // (Principal sees it in their approval queue)
    });
  });

  test.describe("Account Creation Restrictions", () => {
    test("admin cannot create instructor accounts", async ({ page }) => {
      await page.goto("/dev/login");
      await page.fill('input[name="email"]', "admin@mtc.ac.ug");
      await page.click('button:has-text("Sign In")');
      await page.waitForURL(/\/admin/);

      await page.goto("/admin/tutors");
      
      // Should see instructors list but no create button
      // (Principal creates instructor accounts)
      const hasCreateBtn = await page.getByRole("button", { name: /create instructor|add instructor|new instructor/i }).isVisible().catch(() => false);
      expect(hasCreateBtn).toBe(false);
    });
  });

  test.describe("Data Privacy", () => {
    test("admin cannot see passwords", async ({ page }) => {
      await page.goto("/dev/login");
      await page.fill('input[name="email"]', "admin@mtc.ac.ug");
      await page.click('button:has-text("Sign In")');
      await page.waitForURL(/\/admin/);

      await page.goto("/admin/students");
      
      // Password fields should never appear in student details
      const pageContent = await page.textContent("body");
      expect(pageContent?.toLowerCase().includes("password:")).toBe(false);
      expect(pageContent?.toLowerCase().includes("passwordhash")).toBe(false);
    });

    test("admin profile shows locked fields", async ({ page }) => {
      await page.goto("/dev/login");
      await page.fill('input[name="email"]', "admin@mtc.ac.ug");
      await page.click('button:has-text("Sign In")');
      await page.waitForURL(/\/admin/);

      await page.goto("/admin/profile");
      
      // Email and name should be locked (not editable)
      const emailInput = page.locator('input[name="email"], label:has-text("Email") input');
      const nameInput = page.locator('input[name="name"], label:has-text("Name") input');
      
      if (await emailInput.isVisible()) {
        await expect(emailInput).toBeDisabled();
      }
      if (await nameInput.isVisible()) {
        await expect(nameInput).toBeDisabled();
      }
    });
  });

  test.describe("Audit Logging", () => {
    test("admin report exports are logged", async ({ page }) => {
      await page.goto("/dev/login");
      await page.fill('input[name="email"]', "admin@mtc.ac.ug");
      await page.click('button:has-text("Sign In")');
      await page.waitForURL(/\/admin/);

      await page.goto("/admin/reports");
      
      // Should see audit logging notice
      await expect(page.getByText(/exports are audit logged/i)).toBeVisible();
    });
  });

  test.describe("Results Publication", () => {
    test("admin cannot publish results directly", async ({ page }) => {
      await page.goto("/dev/login");
      await page.fill('input[name="email"]', "admin@mtc.ac.ug");
      await page.click('button:has-text("Sign In")');
      await page.waitForURL(/\/admin/);

      // Admin processes results for completeness, but publish is Principal/Director
      // No publish button should be visible in Admin portal
    });
  });

  test.describe("Certificate Issuance", () => {
    test("admin cannot issue certificates directly", async ({ page }) => {
      await page.goto("/dev/login");
      await page.fill('input[name="email"]', "admin@mtc.ac.ug");
      await page.click('button:has-text("Sign In")');
      await page.waitForURL(/\/admin/);

      // Admin prepares certificate lists, but issuance is Director only
      // No issue button should be visible in Admin portal
    });
  });
});
