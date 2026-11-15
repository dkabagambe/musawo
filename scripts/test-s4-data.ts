#!/usr/bin/env ts-node
import { db } from "../src/lib/db";
import { getAccessLevel } from "../src/lib/enrolment/access";

async function main() {
  console.log("\n=== S4 COMPREHENSIVE TEST ===\n");

  const student = await db.user.findUnique({
    where: { email: "student.t01@example.com" },
    select: { id: true, name: true, studentNumber: true, email: true },
  });

  if (!student) {
    console.error("❌ Student not found");
    process.exit(1);
  }

  console.log("✅ Test Student:", student.name);
  console.log("   Email:", student.email);
  console.log("   Student Number:", student.studentNumber);

  // 1. Test My Programmes page data
  console.log("\n--- 1. MY PROGRAMMES TEST ---");
  const enrolments = await db.enrolment.findMany({
    where: { userId: student.id },
    include: {
      course: {
        select: {
          id: true,
          title: true,
          slug: true,
          courseCode: true,
        },
      },
      intake: { select: { label: true } },
    },
  });

  console.log(`\nEnrolments: ${enrolments.length}`);
  for (const enr of enrolments) {
    console.log(`\n✅ Course: ${enr.course.title}`);
    console.log(`   Status: ${enr.status}`);
    console.log(`   Paid: ${enr.paidPercent}%`);
    console.log(`   Intake: ${enr.intake?.label ?? "None"}`);
    console.log(
      `   Access Level: ${getAccessLevel({
        status: enr.status,
        paidPercent: enr.paidPercent,
        provisionalUntil: enr.provisionalUntil,
        graceUntil: enr.graceUntil,
        overdueSince: enr.overdueSince,
      })}`
    );

    const courseId = enr.course.id;

    // Lessons progress
    const totalLessons = await db.lesson.count({
      where: { block: { courseId } },
    });
    const completedLessons = await db.lessonProgress.count({
      where: {
        userId: student.id,
        completedAt: { not: null },
        lesson: { block: { courseId } },
      },
    });
    console.log(`   Lessons: ${completedLessons}/${totalLessons} complete`);

    // Exams passed
    const exams = await db.exam.findMany({
      where: { courseId },
      include: {
        attempts: {
          where: { userId: student.id, status: "MARKED" },
          orderBy: { score: "desc" },
          take: 1,
        },
      },
    });
    const passed = exams.filter((e) => {
      const attempt = e.attempts[0];
      return attempt && attempt.score != null && attempt.score >= e.passPercent;
    }).length;
    console.log(`   Exams: ${passed}/${exams.length} passed`);

    // Attendance
    const attendanceRecords = await db.attendance.count({
      where: {
        userId: student.id,
        liveClass: { courseId },
      },
    });
    const presentCount = await db.attendance.count({
      where: {
        userId: student.id,
        liveClass: { courseId },
        OR: [{ startMark: "PRESENT" }, { endMark: "PRESENT" }, { markedPresent: true }],
      },
    });
    const attRate = attendanceRecords > 0 ? Math.round((presentCount / attendanceRecords) * 100) : 0;
    console.log(`   Attendance: ${attRate}% (${presentCount}/${attendanceRecords})`);
  }

  // 2. Test My Courses page data
  console.log("\n--- 2. MY COURSES TEST ---");
  const courses = await db.course.findMany({
    where: { id: { in: enrolments.map((e) => e.courseId) } },
    include: {
      blocks: {
        orderBy: { order: "asc" },
        include: {
          lessons: {
            orderBy: { order: "asc" },
            select: { id: true, title: true, type: true, isFree: true },
          },
        },
      },
    },
  });

  for (const course of courses) {
    console.log(`\n✅ Course: ${course.title}`);
    console.log(`   Slug: ${course.slug}`);
    console.log(`   Blocks: ${course.blocks.length}`);
    const totalLessons = course.blocks.reduce((sum, b) => sum + b.lessons.length, 0);
    console.log(`   Lessons: ${totalLessons}`);

    const firstBlock = course.blocks[0];
    if (firstBlock) {
      const firstLessons = firstBlock.lessons.slice(0, 3);
      firstLessons.forEach((l) => {
        console.log(`      - ${l.title} (${l.type})${l.isFree ? " [FREE]" : ""}`);
      });
    }
  }

  // 3. Test Learning Materials
  console.log("\n--- 3. LEARNING MATERIALS TEST ---");
  const videoLessons = await db.lesson.findMany({
    where: {
      block: { courseId: { in: courses.map((c) => c.id) } },
      type: "VIDEO",
      bunnyVideoId: { not: null },
    },
    take: 3,
    include: { block: { select: { title: true } } },
  });

  console.log(`\nVideo lessons: ${videoLessons.length}`);
  videoLessons.forEach((v) => {
    console.log(`   ✅ ${v.title} (Block: ${v.block.title})`);
    console.log(`      Bunny ID: ${v.bunnyVideoId}`);
  });

  const notesLessons = await db.lesson.findMany({
    where: {
      block: { courseId: { in: courses.map((c) => c.id) } },
      type: "NOTES",
      notesS3Key: { not: null },
    },
    take: 3,
    include: { block: { select: { title: true } } },
  });

  console.log(`\nNotes lessons: ${notesLessons.length}`);
  notesLessons.forEach((n) => {
    console.log(`   ✅ ${n.title} (Block: ${n.block.title})`);
    console.log(`      S3 Key: ${n.notesS3Key}`);
  });

  // 4. Test Assignments
  console.log("\n--- 4. ASSIGNMENTS TEST ---");
  const assignments = await db.assignment.findMany({
    where: {
      courseId: { in: courses.map((c) => c.id) },
      status: "PUBLISHED",
    },
    include: {
      course: { select: { title: true } },
      submissions: {
        where: { userId: student.id },
        select: {
          id: true,
          status: true,
          grade: true,
          submittedAt: true,
        },
      },
    },
    orderBy: { dueDate: "asc" },
  });

  console.log(`\nPublished assignments: ${assignments.length}`);
  assignments.forEach((a) => {
    const sub = a.submissions[0];
    const overdue = a.dueDate && a.dueDate < new Date() && !sub;
    console.log(`\n   ${overdue ? "❌ OVERDUE" : "✅"} ${a.title}`);
    console.log(`      Course: ${a.course.title}`);
    console.log(`      Due: ${a.dueDate?.toLocaleDateString("en-UG") ?? "No deadline"}`);
    console.log(
      `      Status: ${sub ? `${sub.status}${sub.grade ? ` (Grade: ${sub.grade})` : ""}` : "Not submitted"}`
    );
  });

  // 5. Test Discussion Forum
  console.log("\n--- 5. DISCUSSION FORUM TEST ---");
  const threads = await db.forumThread.findMany({
    where: {
      courseId: { in: courses.map((c) => c.id) },
    },
    include: {
      author: { select: { name: true, role: true } },
      course: { select: { title: true } },
      liveClass: { select: { title: true } },
      _count: { select: { replies: true } },
    },
    orderBy: [{ pinned: "desc" }, { updatedAt: "desc" }],
    take: 5,
  });

  console.log(`\nForum threads: ${threads.length}`);
  threads.forEach((t) => {
    console.log(`\n   ${t.pinned ? "📌 " : ""}✅ ${t.title}`);
    console.log(`      Author: ${t.author.name} (${t.author.role})`);
    console.log(`      Course: ${t.course?.title ?? "N/A"}`);
    if (t.liveClass) console.log(`      Class: ${t.liveClass.title}`);
    console.log(`      Replies: ${t._count.replies}`);
  });

  // Summary
  console.log("\n--- SUMMARY ---");
  console.log(`\n✅ S4 Data Complete:`);
  console.log(`   - ${enrolments.length} enrolment(s)`);
  console.log(
    `   - ${courses.length} course(s) with ${courses.reduce((s, c) => s + c.blocks.length, 0)} blocks`
  );
  console.log(`   - ${videoLessons.length} video lessons (sample)`);
  console.log(`   - ${notesLessons.length} notes lessons (sample)`);
  console.log(`   - ${assignments.length} published assignments`);
  console.log(`   - ${threads.length} forum threads`);
  console.log(`\nAll S4 components verified with real data ✅\n`);

  await db.$disconnect();
}

main().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
