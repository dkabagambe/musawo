/**
 * Test-only seed: 35 students including one live class of 30.
 *
 * Refuses to run when APP_ENV=production.
 * Production (bootstrap:prod) never calls this.
 *
 * Usage:
 *   npm run seed:test
 *
 * Creates:
 *   - 35 students (student.t01@example.com .. student.t35@example.com)
 *   - Enrolments for all 35 in the first course found
 *   - One live class with 30 of the 35 students enrolled
 *   - 6 breakaway groups of 5 in that class (for the group demo)
 */

import { PrismaClient, UserRole, EnrolmentStatus, LiveClassStatus } from "@prisma/client";
import { hash } from "argon2";
import { formatStudentNumber } from "../src/lib/students/number-format";

const prisma = new PrismaClient();

const TEST_PASSWORD = "Demo1234!";
const COURSE_CODE = "MHC";
const STUDENT_COUNT = 35;
const CLASS_SIZE = 30;

async function main() {
  // Guard: refuse in production
  if (process.env.APP_ENV === "production") {
    console.error("\n[seed:test] REFUSED: APP_ENV=production. Test seed is for development/staging only.\n");
    process.exit(1);
  }

  console.log("\n[seed:test] Creating test seed data (35 students, 1 class of 30)...\n");

  const hashedPw = await hash(TEST_PASSWORD);
  const year = new Date().getFullYear();

  // Find or create a course to enroll students in
  let course = await prisma.course.findFirst({
    where: { courseCode: COURSE_CODE },
  });
  if (!course) {
    course = await prisma.course.findFirst();
  }
  if (!course) {
    console.error("[seed:test] No course found. Run npm run db:seed first.\n");
    process.exit(1);
  }

  // Find or create an intake
  let intake = await prisma.intake.findFirst();
  if (!intake) {
    intake = await prisma.intake.create({
      data: {
        courseId: course.id,
        label: `Test Intake ${year}`,
        startDate: new Date(year, 10, 1),
        endDate: new Date(year + 1, 0, 28),
        seats: 50,
        isOpen: true,
      },
    });
  }

  // Find a tutor
  const tutor = await prisma.user.findFirst({
    where: { role: UserRole.INSTRUCTOR },
  });
  if (!tutor) {
    console.error("[seed:test] No instructor found. Run npm run db:seed first.\n");
    process.exit(1);
  }

  // Create 35 students
  const students: { id: string; name: string; email: string }[] = [];
  for (let i = 1; i <= STUDENT_COUNT; i++) {
    const padded = String(i).padStart(2, "0");
    const email = `student.t${padded}@example.com`;
    const name = `Test Student ${i}`;
    const sn = formatStudentNumber(COURSE_CODE, year, 100 + i);

    // Clear conflicting student number
    const snConflict = await prisma.user.findUnique({ where: { studentNumber: sn } });
    if (snConflict && snConflict.email !== email) {
      await prisma.user.update({ where: { id: snConflict.id }, data: { studentNumber: null } });
    }

    const user = await prisma.user.upsert({
      where: { email },
      update: { name, passwordHash: hashedPw, studentNumber: sn, role: UserRole.STUDENT, status: "ACTIVE" },
      create: {
        name,
        email,
        passwordHash: hashedPw,
        studentNumber: sn,
        role: UserRole.STUDENT,
        status: "ACTIVE",
        emailVerified: new Date(),
        dataConsentAt: new Date(),
      },
    });
    students.push({ id: user.id, name: user.name ?? name, email });

    // Enrolment (ACTIVE, fully paid for simplicity)
    const existingEnr = await prisma.enrolment.findFirst({
      where: { userId: user.id, courseId: course.id },
    });
    if (!existingEnr) {
      await prisma.enrolment.create({
        data: {
          userId: user.id,
          courseId: course.id,
          intakeId: intake.id,
          status: EnrolmentStatus.ACTIVE,
          planType: "FULL",
          totalAmountUgx: course.fullFeeUgx || 2300000,
          paidAmountUgx: course.fullFeeUgx || 2300000,
          paidPercent: 100,
          unlockedBlockOrder: 5,
        },
      });
    }
  }
  console.log(`  -> ${STUDENT_COUNT} students created/enrolled in ${course.title}`);

  // Create one live class with 30 students
  const classTitle = "Test Class: Infection Control (30 students)";
  let liveClass = await prisma.liveClass.findFirst({
    where: { title: classTitle },
  });
  if (!liveClass) {
    liveClass = await prisma.liveClass.create({
      data: {
        courseId: course.id,
        tutorId: tutor.id,
        title: classTitle,
        description: "Test class for group demo and load testing",
        scheduledAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
        durationMin: 90,
        joinUrl: "https://meet.google.com/test-class-30",
        status: LiveClassStatus.SCHEDULED,
        recordingEnabled: true,
        recordingStatus: "PENDING",
      },
    });
    console.log(`  -> Live class created: ${classTitle}`);
  } else {
    console.log(`  -> Live class already exists: ${classTitle}`);
  }

  // Create 6 breakaway groups of 5 students each (30 students)
  const classStudents = students.slice(0, CLASS_SIZE);
  const groupNames = ["Group A", "Group B", "Group C", "Group D", "Group E", "Group F"];

  for (let g = 0; g < 6; g++) {
    const groupName = groupNames[g];
    let group = await prisma.classGroup.findFirst({
      where: { liveClassId: liveClass.id, name: groupName },
    });
    if (!group) {
      group = await prisma.classGroup.create({
        data: { liveClassId: liveClass.id, name: groupName },
      });
    }

    // Add 5 students to this group
    for (let s = 0; s < 5; s++) {
      const studentIdx = g * 5 + s;
      const student = classStudents[studentIdx];
      if (!student) continue;

      const existingMember = await prisma.classGroupMember.findFirst({
        where: { groupId: group.id, userId: student.id },
      });
      if (!existingMember) {
        await prisma.classGroupMember.create({
          data: { groupId: group.id, userId: student.id },
        });
      }
    }
  }
  console.log(`  -> 6 breakaway groups of 5 created in the class`);

  // Summary
  console.log("\n[seed:test] Summary:");
  console.log(`  Students: ${STUDENT_COUNT} (student.t01@example.com .. student.t${String(STUDENT_COUNT).padStart(2, "0")}@example.com)`);
  console.log(`  Password: ${TEST_PASSWORD}`);
  console.log(`  Course: ${course.title} (${course.courseCode})`);
  console.log(`  Live class: ${classTitle} (${CLASS_SIZE} students)`);
  console.log(`  Groups: 6 groups of 5 (for breakaway group demo)`);
  console.log(`  First 30 students are in the class; remaining 5 are enrolled only.\n`);
}

main()
  .then(() => prisma.$disconnect())
  .catch((err) => {
    console.error("[seed:test] Error:", err);
    prisma.$disconnect();
    process.exit(1);
  });
