/**
 * Breakaway group tests (Section 9, remarks.md).
 *
 * Tests:
 *   1. Random mode: 30 students, group size 5 -> 6 groups of 5.
 *   2. Manual mode: create groups by name.
 *   3. Reshuffle: delete old groups and create new ones.
 *   4. Move a student from one group to another.
 *   5. One group work submission per group (upsert on unique groupId+liveClassId).
 *   6. Instructor grades a submission with a group mark.
 *   7. Group forum threads: create and list.
 *   8. Student sees only their own group (not other groups' members).
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Mock auth so we can inject different sessions per test ──────────────

let mockSession: { user: { id: string; role: string } } | null = null;

vi.mock("@/lib/auth/server", () => ({
  auth: vi.fn(async () => mockSession),
}));

// ── Mock DB ─────────────────────────────────────────────────────────────

vi.mock("@/lib/db", () => {
  const db = {
    liveClass: { findUnique: vi.fn(), findFirst: vi.fn() },
    enrolment: { findMany: vi.fn(), findFirst: vi.fn() },
    classGroup: {
      findMany: vi.fn(),
      create: vi.fn(),
      deleteMany: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
    },
    classGroupMember: {
      findFirst: vi.fn(),
      upsert: vi.fn(),
      deleteMany: vi.fn(),
      create: vi.fn(),
    },
    groupWorkSubmission: {
      findMany: vi.fn(),
      upsert: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
    },
    forumThread: {
      findMany: vi.fn(),
      create: vi.fn(),
    },
    user: { findFirst: vi.fn(), count: vi.fn() },
  };
  return { db };
});

vi.mock("@/lib/rbac", () => ({
  can: (role: string, permission: string) => {
    if (permission === "classes.manage") return role === "INSTRUCTOR" || role === "DIRECTOR" || role === "PRINCIPAL";
    if (permission === "classes.view") return role !== "STUDENT";
    if (permission === "classes.join") return role === "STUDENT";
    return false;
  },
}));

import { db } from "@/lib/db";
import { NextRequest } from "next/server";

// ── Fixtures ────────────────────────────────────────────────────────────

const TUTOR_ID = "cmw8tutor0000001";
const CLASS_ID = "cmw8class00000001";
const COURSE_ID = "cmw8course0000001";
const GRP1_ID = "cmw8group00000001";
const GRP2_ID = "cmw8group00000002";
const SUB1_ID = "cmw8subm100000001";
const THREAD1_ID = "cmw8thrd100000001";

// 30 students
const STUDENTS = Array.from({ length: 30 }, (_, i) => ({
  id: `s${i + 1}`,
  name: `Student ${i + 1}`,
}));

const ENROLMENTS = STUDENTS.map((s) => ({
  userId: s.id,
  user: { id: s.id, name: s.name },
}));

// ── Helpers ─────────────────────────────────────────────────────────────

function makeReq(url: string, method: string, body?: unknown): NextRequest {
  const init: { method: string; headers?: Record<string, string>; body?: string } = { method };
  if (body !== undefined) {
    init.headers = { "Content-Type": "application/json" };
    init.body = JSON.stringify(body);
  }
  return new NextRequest(new URL(url, "http://localhost:3000"), init);
}

function setSession(role: string, userId: string) {
  mockSession = { user: { id: userId, role } };
}

function mockLiveClass(tutorId: string = TUTOR_ID) {
  (db.liveClass.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
    id: CLASS_ID,
    courseId: COURSE_ID,
    tutorId,
    status: "SCHEDULED",
  });
}

function mockEnrolments(students = ENROLMENTS) {
  (db.enrolment.findMany as ReturnType<typeof vi.fn>).mockResolvedValue(students);
}

function mockClassGroupCreate() {
  let callCount = 0;
  (db.classGroup.create as ReturnType<typeof vi.fn>).mockImplementation(async (args: { data: { name: string; members: { create: { userId: string }[] } } }) => {
    callCount++;
    return {
      id: `grp-${callCount}`,
      liveClassId: CLASS_ID,
      name: args.data.name,
      members: args.data.members.create.map((m) => ({
        userId: m.userId,
        user: { id: m.userId, name: `Student`, studentNumber: null },
      })),
    };
  });
  return () => callCount;
}

// ── Tests ───────────────────────────────────────────────────────────────

describe("Breakaway groups (Section 9)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSession = null;
  });

  // 1. Random mode: 30 students, group size 5 -> 6 groups of 5
  it("random mode creates 6 groups of 5 from 30 students", async () => {
    setSession("INSTRUCTOR", TUTOR_ID);
    mockLiveClass();
    mockEnrolments();
    (db.classGroup.deleteMany as ReturnType<typeof vi.fn>).mockResolvedValue({ count: 6 });
    const getCallCount = mockClassGroupCreate();

    const { POST } = await import("@/app/api/groups/[classId]/route");
    const req = makeReq(`/api/groups/${CLASS_ID}`, "POST", { mode: "random", groupSize: 5 });
    const res = await POST(req, { params: { classId: CLASS_ID } });
    const data = await res.json();

    expect(res.status).toBe(201);
    expect(data.groups).toHaveLength(6);
    expect(getCallCount()).toBe(6);
    expect(db.classGroup.deleteMany).toHaveBeenCalledWith({ where: { liveClassId: CLASS_ID } });

    // Each group should have 5 members
    for (const g of data.groups) {
      expect(g.members).toHaveLength(5);
    }

    // All 30 students should be distributed
    const allMemberIds = data.groups.flatMap((g: { members: { userId: string }[] }) => g.members.map((m) => m.userId));
    expect(new Set(allMemberIds).size).toBe(30);
  });

  // 2. Manual mode: create groups by name
  it("manual mode creates named groups with specified members", async () => {
    setSession("INSTRUCTOR", TUTOR_ID);
    mockLiveClass();
    mockEnrolments();
    (db.classGroup.deleteMany as ReturnType<typeof vi.fn>).mockResolvedValue({ count: 0 });
    const getCallCount = mockClassGroupCreate();

    const { POST } = await import("@/app/api/groups/[classId]/route");
    const req = makeReq(`/api/groups/${CLASS_ID}`, "POST", {
      mode: "manual",
      groups: [
        { name: "Red Team", memberIds: ["s1", "s2", "s3"] },
        { name: "Blue Team", memberIds: ["s4", "s5", "s6"] },
      ],
    });
    const res = await POST(req, { params: { classId: CLASS_ID } });
    const data = await res.json();

    expect(res.status).toBe(201);
    expect(data.groups).toHaveLength(2);
    expect(getCallCount()).toBe(2);
    expect(data.groups[0].name).toBe("Red Team");
    expect(data.groups[1].name).toBe("Blue Team");
  });

  // 3. Reshuffle: calling POST random again deletes old groups and creates new ones
  it("reshuffle deletes existing groups then creates new ones", async () => {
    setSession("INSTRUCTOR", TUTOR_ID);
    mockLiveClass();
    mockEnrolments();
    (db.classGroup.deleteMany as ReturnType<typeof vi.fn>).mockResolvedValue({ count: 6 });
    const getCallCount = mockClassGroupCreate();

    const { POST } = await import("@/app/api/groups/[classId]/route");
    const req = makeReq(`/api/groups/${CLASS_ID}`, "POST", { mode: "random", groupSize: 5 });
    await POST(req, { params: { classId: CLASS_ID } });

    expect(db.classGroup.deleteMany).toHaveBeenCalledWith({ where: { liveClassId: CLASS_ID } });
    expect(getCallCount()).toBe(6);
  });

  // 4. Move a student from one group to another
  it("PATCH remove_member with targetGroupId moves student", async () => {
    setSession("INSTRUCTOR", TUTOR_ID);
    mockLiveClass();
    (db.classGroup.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({ id: GRP1_ID, liveClassId: CLASS_ID });
    (db.classGroupMember.deleteMany as ReturnType<typeof vi.fn>).mockResolvedValue({ count: 1 });
    (db.classGroupMember.upsert as ReturnType<typeof vi.fn>).mockResolvedValue({ groupId: GRP2_ID, userId: "s1" });

    const { PATCH } = await import("@/app/api/groups/[classId]/route");
    const req = makeReq(`/api/groups/${CLASS_ID}`, "PATCH", {
      groupId: GRP1_ID,
      action: "remove_member",
      userId: "s1",
      targetGroupId: GRP2_ID,
    });
    const res = await PATCH(req, { params: { classId: CLASS_ID } });
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.ok).toBe(true);
    expect(db.classGroupMember.deleteMany).toHaveBeenCalledWith({ where: { groupId: GRP1_ID, userId: "s1" } });
    expect(db.classGroupMember.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { groupId_userId: { groupId: GRP2_ID, userId: "s1" } },
        create: { groupId: GRP2_ID, userId: "s1" },
      })
    );
  });

  // 5. One group work submission per group (upsert on unique groupId+liveClassId)
  it("student submits group work (upsert on groupId+liveClassId)", async () => {
    setSession("STUDENT", "s1");
    (db.liveClass.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({ id: CLASS_ID, courseId: COURSE_ID });
    (db.classGroupMember.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({ groupId: GRP1_ID });
    (db.groupWorkSubmission.upsert as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: SUB1_ID,
      groupId: GRP1_ID,
      liveClassId: CLASS_ID,
      title: "Our Group Report",
    });

    const { POST: postWork } = await import("@/app/api/groups/[classId]/work/route");
    const req = makeReq(`/api/groups/${CLASS_ID}/work`, "POST", { title: "Our Group Report", body: "Findings here" });
    const res = await postWork(req, { params: { classId: CLASS_ID } });

    expect(res.status).toBe(201);
    expect(db.groupWorkSubmission.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { groupId_liveClassId: { groupId: GRP1_ID, liveClassId: CLASS_ID } },
      })
    );
  });

  // 6. Instructor grades a submission with a group mark
  it("instructor grades a group work submission", async () => {
    setSession("INSTRUCTOR", TUTOR_ID);
    mockLiveClass();
    (db.groupWorkSubmission.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: SUB1_ID,
      groupId: GRP1_ID,
      liveClassId: CLASS_ID,
      title: "Report",
    });
    (db.groupWorkSubmission.update as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: SUB1_ID,
      groupMark: 85,
      gradedAt: new Date(),
      gradedBy: TUTOR_ID,
    });

    const { PATCH: patchWork } = await import("@/app/api/groups/[classId]/work/route");
    const req = makeReq(`/api/groups/${CLASS_ID}/work`, "PATCH", {
      submissionId: SUB1_ID,
      groupMark: 85,
    });
    const res = await patchWork(req, { params: { classId: CLASS_ID } });
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.groupMark).toBe(85);
    expect(data.gradedBy).toBe(TUTOR_ID);
  });

  // 7. Group forum threads: create
  it("student creates a group-scoped forum thread", async () => {
    setSession("STUDENT", "s1");
    (db.enrolment.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({
      userId: "s1",
      courseId: COURSE_ID,
      status: "ACTIVE",
    });
    (db.classGroupMember.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({ groupId: GRP1_ID });
    (db.liveClass.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({ id: CLASS_ID, courseId: COURSE_ID });
    (db.forumThread.create as ReturnType<typeof vi.fn>).mockResolvedValue({ id: THREAD1_ID });

    const { POST: postThread } = await import("@/app/api/forum/route");
    const req = makeReq("/api/forum", "POST", {
      courseId: COURSE_ID,
      liveClassId: CLASS_ID,
      groupId: GRP1_ID,
      title: "Group A Discussion",
      body: "How should we split the work?",
    });
    const res = await postThread(req);
    const data = await res.json();

    expect(res.status).toBe(201);
    expect(data.id).toBe(THREAD1_ID);
    expect(db.forumThread.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          courseId: COURSE_ID,
          liveClassId: CLASS_ID,
          groupId: GRP1_ID,
          authorId: "s1",
          title: "Group A Discussion",
        }),
      })
    );
  });

  // 8. Student sees only their own group (not other groups)
  it("GET returns myGroupId for student and groups list", async () => {
    setSession("STUDENT", "s1");
    (db.liveClass.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({ id: CLASS_ID, courseId: COURSE_ID, tutorId: TUTOR_ID });
    (db.enrolment.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({ userId: "s1", courseId: COURSE_ID, status: "ACTIVE" });
    (db.classGroupMember.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({ groupId: GRP1_ID });
    (db.classGroup.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
      {
        id: GRP1_ID,
        name: "Group A",
        liveClassId: CLASS_ID,
        members: [{ userId: "s1", user: { id: "s1", name: "Student 1", studentNumber: null } }],
        submissions: [],
      },
      {
        id: GRP2_ID,
        name: "Group B",
        liveClassId: CLASS_ID,
        members: [{ userId: "s4", user: { id: "s4", name: "Student 4", studentNumber: null } }],
        submissions: [],
      },
    ]);

    const { GET } = await import("@/app/api/groups/[classId]/route");
    const req = makeReq(`/api/groups/${CLASS_ID}`, "GET");
    const res = await GET(req, { params: { classId: CLASS_ID } });
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.myGroupId).toBe(GRP1_ID);
    expect(data.groups).toHaveLength(2);
    expect(data.isInstructor).toBe(false);
  });

  // 9. Student not in a group cannot submit work
  it("student not in a group gets 403 when submitting work", async () => {
    setSession("STUDENT", "s99");
    (db.liveClass.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({ id: CLASS_ID, courseId: COURSE_ID });
    (db.classGroupMember.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    const { POST: postWork } = await import("@/app/api/groups/[classId]/work/route");
    const req = makeReq(`/api/groups/${CLASS_ID}/work`, "POST", { title: "Test" });
    const res = await postWork(req, { params: { classId: CLASS_ID } });

    expect(res.status).toBe(403);
  });

  // 10. Non-instructor cannot create groups
  it("student cannot create groups (403)", async () => {
    setSession("STUDENT", "s1");
    mockLiveClass();

    const { POST } = await import("@/app/api/groups/[classId]/route");
    const req = makeReq(`/api/groups/${CLASS_ID}`, "POST", { mode: "random", groupSize: 5 });
    const res = await POST(req, { params: { classId: CLASS_ID } });

    expect(res.status).toBe(403);
  });
});
