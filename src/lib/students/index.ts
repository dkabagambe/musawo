/**
 * Student number generation.
 *
 * Pattern: {YYYY}/{COURSECODE}/{SEQ:3}  (e.g. 2026/MHC/005)
 *
 * The sequence is per-course per-year, incremented atomically under a
 * PostgreSQL advisory lock so concurrent inserts cannot collide.
 * The number is assigned when the Admin creates the student record,
 * never at payment or login. It is unique, sequential, never reused,
 * and not editable after creation.
 *
 * COURSE CODES come from Course.courseCode in the database (authoritative source).
 * The COURSE_CODES map in number-format.ts is the canonical default for seeding.
 */

import { db } from "@/lib/db";
import type { Prisma } from "@prisma/client";
import { formatStudentNumber } from "./number-format";

/**
 * Assign the next registration number for the given course and create the
 * student account inside a single serialised transaction.
 *
 * @param data     Prisma UserUncheckedCreateInput (without studentNumber)
 * @param courseCode  Short course code, e.g. "MHC". Looked up from the course record.
 */
export async function createStudentWithNumber(
  data: Prisma.UserUncheckedCreateInput,
  courseCode: string,
) {
  const year = new Date().getFullYear();
  const lockKey = `${year}_${courseCode.toUpperCase()}`;

  return db.$transaction(async (tx) => {
    // Serialise concurrent inserts for the same course+year
    await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${lockKey}))`;

    // Count existing student numbers for this course+year to derive the next seq
    const existing = await tx.user.findMany({
      where: {
        role: "STUDENT",
        studentNumber: { startsWith: `${year}/${courseCode.toUpperCase()}/` },
      },
      select: { studentNumber: true },
    });

    // Parse the highest existing sequence to avoid gaps from deleted test records
    let maxSeq = existing.length;
    for (const row of existing) {
      const parts = row.studentNumber?.split("/");
      if (parts && parts.length === 3) {
        const seq = parseInt(parts[2], 10);
        if (!isNaN(seq) && seq > maxSeq) maxSeq = seq;
      }
    }

    let sequence = maxSeq + 1;
    let studentNumber = formatStudentNumber(courseCode, year, sequence);

    // Guard against any collision (e.g. manually-entered numbers)
    while (
      await tx.user.findUnique({
        where: { studentNumber },
        select: { id: true },
      })
    ) {
      sequence += 1;
      studentNumber = formatStudentNumber(courseCode, year, sequence);
    }

    const user = await tx.user.create({ data: { ...data, studentNumber } });
    return { user, studentNumber };
  });
}

/**
 * Generate the next registration number for a course without creating a user.
 * Used for previewing the number on the "Create Student" form.
 */
export async function generateStudentNumber(courseCode: string): Promise<string> {
  const year = new Date().getFullYear();

  const existing = await db.user.findMany({
    where: {
      role: "STUDENT",
      studentNumber: { startsWith: `${year}/${courseCode.toUpperCase()}/` },
    },
    select: { studentNumber: true },
  });

  let maxSeq = existing.length;
  for (const row of existing) {
    const parts = row.studentNumber?.split("/");
    if (parts && parts.length === 3) {
      const seq = parseInt(parts[2], 10);
      if (!isNaN(seq) && seq > maxSeq) maxSeq = seq;
    }
  }

  return formatStudentNumber(courseCode, year, maxSeq + 1);
}
