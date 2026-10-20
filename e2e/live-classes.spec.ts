import { test, expect, type Page } from "@playwright/test";

async function demoLogin(page: Page, email: string, destination: RegExp) {
  await page.goto("/dev/login");
  const row = page.locator("tr").filter({ hasText: email });
  await row.getByRole("button", { name: /sign in/i }).click();
  await expect(page).toHaveURL(destination);
}

test.describe("Batch B teaching and live access", () => {
  test("instructor can open material upload and PDF is an accepted file type", async ({ page }) => {
    await demoLogin(page, "tutor@mtc.ac.ug", /\/tutor/);
    await page.goto("/tutor/materials");
    await expect(page.getByRole("heading", { name: "Materials" })).toBeVisible();
    await page.getByRole("button", { name: /upload material/i }).click();
    const file = page.getByLabel(/pdf, docx, pptx or image file/i);
    await expect(file).toBeVisible();
    expect(await file.getAttribute("accept")).toContain(".pdf");
  });

  test("a tutor account does not appear in another tutor's student roster", async ({ page }) => {
    await demoLogin(page, "tutor@mtc.ac.ug", /\/tutor/);
    await page.goto("/tutor/students");
    await expect(page.getByRole("heading", { name: "My Students" })).toBeVisible();
    await expect(page.getByText("Mirembe Joel", { exact: true })).toHaveCount(0);
  });

  test("a scheduled class does not reveal its meeting URL to students before class starts", async ({ page }) => {
    await demoLogin(page, "student.full@example.com", /\/dashboard/);
    const heartbeat = page.waitForResponse((response) => response.url().includes("/api/presence/heartbeat") && response.request().method() === "POST");
    await page.goto("/dashboard/timetable");
    expect((await heartbeat).status()).toBe(200);
    await expect(page.getByText("Link appears when class starts").first()).toBeVisible();
    await expect(page.getByRole("link", { name: "Join now" })).toHaveCount(0);
  });
});
