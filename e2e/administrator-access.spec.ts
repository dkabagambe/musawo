import { test, expect } from "@playwright/test";

const BASE = process.env.E2E_BASE_URL ?? "http://localhost:3000";

async function signInAs(page: import("@playwright/test").Page, email: string) {
  await page.goto(`${BASE}/dev/login`);
  // Use an exact-email cell match to avoid "admin@mtc.ac.ug" matching "itadmin@mtc.ac.ug"
  const emailPattern = new RegExp(`^${email.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`);
  const accountRow = page.locator("tr").filter({
    has: page.locator("td").filter({ hasText: emailPattern }),
  });
  await accountRow.getByRole("button", { name: /sign in/i }).click();
  await page.waitForURL(/\/admin/, { timeout: 15_000 });
}

test.describe("Administrator operations role", () => {
  test("can use the shared operations shell and permitted pages", async ({
    page,
  }) => {
    await signInAs(page, "admin@mtc.ac.ug");
    await expect(
      page.getByRole("heading", { name: /hello rahiima/i }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Student Lookup" }),
    ).toBeVisible();
    await expect(page.getByRole("link", { name: "Support" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Timetable" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Equipment" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Notices" })).toBeVisible();

    for (const path of [
      "/admin/support",
      "/admin/timetable",
      "/admin/equipment",
      "/admin/notices",
      "/admin/students",
      "/admin/invites",
    ]) {
      await page.goto(`${BASE}${path}`);
      await expect(page).not.toHaveURL(/\/403$/);
    }
  });

  test("cannot access academic, finance, audit, or staff administration", async ({
    page,
  }) => {
    await signInAs(page, "admin@mtc.ac.ug");
    for (const path of [
      "/admin/tutors",
      "/admin/intakes",
      "/admin/courses",
      "/admin/payments",
      "/admin/audit",
      "/admin/partner-pages",
    ]) {
      await page.goto(`${BASE}${path}`);
      await expect(page).toHaveURL(/\/403$/);
    }
  });
});
