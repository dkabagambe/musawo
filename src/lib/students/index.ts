/**
 * Student number generation.
 *
 * Pattern (from site setting `student.numberPattern`, default "{PREFIX}-{YYYY}-{SEQ:5}"):
 *   {PREFIX}  -> value of setting `student.numberPrefix` (default "MTC")
 *   {YYYY}    -> current year
 *   {SEQ:N}   -> zero-padded sequential number, N digits (default 5)
 *
 * The number is assigned when the Registrar creates the student record,
 * never at payment or login. It is unique, sequential per year, never reused,
 * and not editable after creation.
 */

import { db } from "@/lib/db";
import { getSetting } from "@/lib/settings";
import type { Prisma } from "@prisma/client";
import { formatStudentNumber } from "./number-format";

/** Assign the next number and create the account while holding a year-scoped DB lock. */
export async function createStudentWithNumber(
  data: Prisma.UserUncheckedCreateInput,
) {
  const [pattern, prefix] = await Promise.all([
    getSetting("student.numberPattern", "{PREFIX}-{YYYY}-{SEQ:5}"),
    getSetting("student.numberPrefix", "MTC"),
  ]);
  const year = new Date().getFullYear();
  const startOfYear = new Date(`${year}-01-01T00:00:00.000Z`);
  const endOfYear = new Date(`${year + 1}-01-01T00:00:00.000Z`);

  return db.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT pg_advisory_xact_lock(${year}, hashtext('musawo_student_numbers'))`;
    const count = await tx.user.count({
      where: {
        role: "STUDENT",
        studentNumber: { not: null },
        createdAt: { gte: startOfYear, lt: endOfYear },
      },
    });
    let sequence = count + 1;
    let studentNumber = formatStudentNumber(pattern, prefix, year, sequence);
    while (
      await tx.user.findUnique({
        where: { studentNumber },
        select: { id: true },
      })
    ) {
      sequence += 1;
      studentNumber = formatStudentNumber(pattern, prefix, year, sequence);
    }
    const user = await tx.user.create({ data: { ...data, studentNumber } });
    return { user, studentNumber };
  });
}

export async function generateStudentNumber(): Promise<string> {
  const [pattern, prefix] = await Promise.all([
    getSetting("student.numberPattern", "{PREFIX}-{YYYY}-{SEQ:5}"),
    getSetting("student.numberPrefix", "MTC"),
  ]);

  const year = new Date().getFullYear();

  // Count students created this year to get the next sequential number
  const startOfYear = new Date(`${year}-01-01T00:00:00.000Z`);
  const endOfYear = new Date(`${year + 1}-01-01T00:00:00.000Z`);
  const count = await db.user.count({
    where: {
      role: "STUDENT",
      studentNumber: { not: null },
      createdAt: { gte: startOfYear, lt: endOfYear },
    },
  });

  return formatStudentNumber(pattern, prefix, year, count + 1);
}
