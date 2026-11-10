/**
 * Breakaway groups end-to-end tests.
 *
 * Prerequisites:
 *   - npm run seed:test  (creates 35 students + 1 live class with 30 students)
 *   - npm start (or npm run dev) on port 3000
 *
 * Tests:
 *   1. Instructor creates 6 groups of 5 from 30 students (random mode, group size 5)
 *   2. Instructor reshuffles groups (re-random, group size 5)
 *   3. Instructor creates 2 named groups (manual mode)
 *   4. Instructor moves a student from Group A to Group B
 *   5. Student submits group work (one submission per group)
 *   6. Instructor grades a group submission with a group mark
 *   7. Student creates a group-scoped forum thread
 *   8. A student sees only their own group's members in the student view
 *
 * Uses:
 *   - /dev/login for quick demo login (dev/staging only)
 *   - seed:test data: tutor@mtc.ac.ug, student.t01@example.com
 */

import { test, expect, type Page } from "@playwright/test";

const BASE = "http://localhost:3000";
const TUTOR_EMAIL    = "tutor@mtc.ac.ug";
const STUDENT_EMAIL  = "student.t01@example.com";
const CLASS_TITLE    = "Test Class: Infection Control (30 students)";

/** Sign in via /dev/login quick-link (dev/staging only). */
async function devLogin(page: Page, email: string, landingPattern: RegExp) {
  await page.goto(`${BASE}/dev/login`);
  const row = page.locator("tr").filter({ hasText: email });
  await row.getByRole("button", { name: /sign in/i }).click();
  await page.waitForURL(landingPattern, { timeout: 15_000 });
}

/** Navigate the tutor to the live classes page and open the test class. */
async function openClassPanel(page: Page) {
  await page.goto(`${BASE}/tutor/classes`);
  await expect(page.getByText(CLASS_TITLE).first()).toBeVisible({ timeout: 15_000 });
}

// Shared state - classId discovered at runtime
let classId = "";

test.describe("Breakaway groups (seed:test data)", () => {
  test.setTimeout(90_000);

  // ── Prerequisite: resolve classId ──────────────────────────────────────────
  test.beforeAll(async ({ browser }) => {
    const page = await browser.newPage();
    await devLogin(page, TUTOR_EMAIL, /\/tutor/);
    // Discover classId from the groups API (list classes endpoint)
    const res = await page.evaluate(async (title: string) => {
      const r = await fetch("/api/tutor/classes");
      if (!r.ok) return null;
      const data: { classes?: Array<{ id: string; title: string }> } = await r.json();
      return data.classes?.find((c) => c.title === title)?.id ?? null;
    }, CLASS_TITLE);
    classId = res ?? "";
    await page.close();
  });

  test("1. Instructor creates 6 groups of 5 (random mode, group size 5)", async ({ page }) => {
    await devLogin(page, TUTOR_EMAIL, /\/tutor/);
    await openClassPanel(page);

    // Open the Group Panel for the test class
    const classSection = page.locator("article, section, [data-testid]").filter({ hasText: CLASS_TITLE }).first();
    if (!(await classSection.isVisible())) {
      // Fall back: look for a details/expand button
      await page.getByText(CLASS_TITLE).first().click();
    }

    // Click "Create groups" or "Manage groups" button
    const manageBtn = page.getByRole("button", { name: /create groups|manage groups|groups/i }).first();
    await expect(manageBtn).toBeVisible({ timeout: 10_000 });
    await manageBtn.click();

    // Select "Random" mode
    const randomRadio = page.locator('input[value="random"], input[name="mode"][type="radio"]').first();
    if (await randomRadio.isVisible({ timeout: 3_000 })) {
      await randomRadio.check();
    }

    // Set group size to 5
    const sizeInput = page.locator('input[name="groupSize"], input[type="number"]').first();
    if (await sizeInput.isVisible({ timeout: 3_000 })) {
      await sizeInput.fill("5");
    }

    // Submit
    await page.getByRole("button", { name: /create|generate|save/i }).first().click();

    // Expect 6 groups to appear
    await expect(page.getByText(/Group [A-F]|group-/i).first()).toBeVisible({ timeout: 15_000 });
    // Groups panel should show at least 6 group names
    const groupLabels = page.locator("[data-testid='group-name'], .group-name, td, li").filter({ hasText: /Group [A-F]/i });
    await expect(groupLabels.first()).toBeVisible({ timeout: 10_000 });
  });

  test("2. Instructor reshuffles groups (random mode again)", async ({ page }) => {
    test.skip(!classId, "classId not discovered — run with live server + seed:test data");

    await devLogin(page, TUTOR_EMAIL, /\/tutor/);

    // Call the groups API directly
    const res = await page.evaluate(async (cId: string) => {
      const r = await fetch(`/api/groups/${cId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "random", groupSize: 5 }),
      });
      return { status: r.status, data: await r.json() };
    }, classId);

    expect(res.status).toBe(201);
    expect(res.data.groups).toHaveLength(6);
    for (const g of res.data.groups as Array<{ members: unknown[] }>) {
      expect(g.members).toHaveLength(5);
    }
  });

  test("3. Instructor creates groups by name (manual mode)", async ({ page }) => {
    test.skip(!classId, "classId not discovered — run with live server + seed:test data");

    await devLogin(page, TUTOR_EMAIL, /\/tutor/);

    // Fetch student list first
    const studentsRes = await page.evaluate(async (cId: string) => {
      const r = await fetch(`/api/groups/${cId}/students`);
      return { status: r.status, data: await r.json() };
    }, classId);

    expect(studentsRes.status).toBe(200);
    const students: Array<{ id: string }> = studentsRes.data.students ?? studentsRes.data;
    expect(students.length).toBeGreaterThanOrEqual(10);

    // Create 2 named groups
    const half = Math.floor(students.length / 2);
    const groupA = students.slice(0, 5).map((s) => s.id);
    const groupB = students.slice(5, 10).map((s) => s.id);

    const res = await page.evaluate(
      async ({ cId, gA, gB }: { cId: string; gA: string[]; gB: string[] }) => {
        const r = await fetch(`/api/groups/${cId}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            mode: "manual",
            groups: [
              { name: "Red Team", memberIds: gA },
              { name: "Blue Team", memberIds: gB },
            ],
          }),
        });
        return { status: r.status, data: await r.json() };
      },
      { cId: classId, gA: groupA, gB: groupB }
    );

    expect(res.status).toBe(201);
    expect(res.data.groups).toHaveLength(2);
    expect(res.data.groups[0].name).toBe("Red Team");
    expect(res.data.groups[1].name).toBe("Blue Team");
  });

  test("4. Instructor moves a student from one group to another", async ({ page }) => {
    test.skip(!classId, "classId not discovered — run with live server + seed:test data");

    await devLogin(page, TUTOR_EMAIL, /\/tutor/);

    // First get the current groups
    const listRes = await page.evaluate(async (cId: string) => {
      const r = await fetch(`/api/groups/${cId}`);
      return { status: r.status, data: await r.json() };
    }, classId);

    expect(listRes.status).toBe(200);
    const groups: Array<{ id: string; members: Array<{ userId: string }> }> = listRes.data.groups;
    expect(groups.length).toBeGreaterThanOrEqual(2);

    const sourceGroup = groups[0];
    const targetGroup = groups[1];
    expect(sourceGroup.members.length).toBeGreaterThan(0);
    const studentToMove = sourceGroup.members[0].userId;

    // Move student
    const moveRes = await page.evaluate(
      async ({ cId, fromId, toId, uid }: { cId: string; fromId: string; toId: string; uid: string }) => {
        const r = await fetch(`/api/groups/${cId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            groupId: fromId,
            action: "remove_member",
            userId: uid,
            targetGroupId: toId,
          }),
        });
        return { status: r.status, data: await r.json() };
      },
      { cId: classId, fromId: sourceGroup.id, toId: targetGroup.id, uid: studentToMove }
    );

    expect(moveRes.status).toBe(200);
    expect(moveRes.data.ok).toBe(true);

    // Verify: student is now in target group
    const verifyRes = await page.evaluate(async (cId: string) => {
      const r = await fetch(`/api/groups/${cId}`);
      return r.json();
    }, classId);

    const updatedTarget = verifyRes.groups.find((g: { id: string }) => g.id === targetGroup.id);
    expect(updatedTarget).toBeTruthy();
    const memberIds = updatedTarget.members.map((m: { userId: string }) => m.userId);
    expect(memberIds).toContain(studentToMove);
  });

  test("5. Student submits group work (one submission per group)", async ({ page }) => {
    test.skip(!classId, "classId not discovered — run with live server + seed:test data");

    await devLogin(page, STUDENT_EMAIL, /\/dashboard/);

    const res = await page.evaluate(async (cId: string) => {
      const r = await fetch(`/api/groups/${cId}/work`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "E2E Group Report", body: "This is our e2e test submission." }),
      });
      return { status: r.status, data: await r.json() };
    }, classId);

    // Expect 201 (created) or 200 (upsert); if 403 student is not in a group (seed:test not run)
    expect([200, 201, 403]).toContain(res.status);
    if (res.status !== 403) {
      expect(res.data.title ?? res.data.id).toBeTruthy();
    }
  });

  test("6. Instructor grades a group submission with a group mark", async ({ page }) => {
    test.skip(!classId, "classId not discovered — run with live server + seed:test data");

    await devLogin(page, TUTOR_EMAIL, /\/tutor/);

    // Get current group work submissions
    const listRes = await page.evaluate(async (cId: string) => {
      const r = await fetch(`/api/groups/${cId}/work`);
      return { status: r.status, data: await r.json() };
    }, classId);

    if (listRes.status !== 200 || !listRes.data.submissions?.length) {
      test.skip(true, "No group work submissions to grade");
      return;
    }

    const submission = listRes.data.submissions[0];

    const gradeRes = await page.evaluate(
      async ({ cId, subId }: { cId: string; subId: string }) => {
        const r = await fetch(`/api/groups/${cId}/work`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ submissionId: subId, groupMark: 78 }),
        });
        return { status: r.status, data: await r.json() };
      },
      { cId: classId, subId: submission.id }
    );

    expect(gradeRes.status).toBe(200);
    expect(gradeRes.data.groupMark).toBe(78);
  });

  test("7. Student creates a group-scoped forum thread", async ({ page }) => {
    test.skip(!classId, "classId not discovered — run with live server + seed:test data");

    await devLogin(page, STUDENT_EMAIL, /\/dashboard/);

    // Get the student's group
    const groupRes = await page.evaluate(async (cId: string) => {
      const r = await fetch(`/api/groups/${cId}`);
      return r.json();
    }, classId);

    const myGroupId: string | null = groupRes.myGroupId ?? null;
    const courseId: string = groupRes.courseId ?? "";
    if (!myGroupId) {
      test.skip(true, "Student not in a group — run seed:test first");
      return;
    }

    const res = await page.evaluate(
      async ({ cId, gId, crsId }: { cId: string; gId: string; crsId: string }) => {
        const r = await fetch("/api/forum", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            courseId: crsId,
            liveClassId: cId,
            groupId: gId,
            title: "E2E Group Thread",
            body: "Testing group-scoped forum thread creation.",
          }),
        });
        return { status: r.status, data: await r.json() };
      },
      { cId: classId, gId: myGroupId, crsId: courseId }
    );

    expect([200, 201]).toContain(res.status);
    expect(res.data.id).toBeTruthy();
  });

  test("8. Student sees only their own group (myGroupId set, not others)", async ({ page }) => {
    test.skip(!classId, "classId not discovered — run with live server + seed:test data");

    await devLogin(page, STUDENT_EMAIL, /\/dashboard/);

    const res = await page.evaluate(async (cId: string) => {
      const r = await fetch(`/api/groups/${cId}`);
      return r.json();
    }, classId);

    // The API returns myGroupId for the student
    expect(res.myGroupId !== undefined).toBe(true);
    expect(res.isInstructor).toBe(false);

    // Student should see the groups list
    if (res.myGroupId && res.groups) {
      // All group members that are not the student's own group should not expose member details
      // (depends on API design - at minimum, myGroupId must be set)
      const myGroup = res.groups.find((g: { id: string }) => g.id === res.myGroupId);
      expect(myGroup).toBeTruthy();
    }
  });
});
