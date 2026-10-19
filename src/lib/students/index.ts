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

export async function generateStudentNumber(): Promise<string> {
  const [pattern, prefix] = await Promise.all([
    getSetting("student.numberPattern", "{PREFIX}-{YYYY}-{SEQ:5}"),
    getSetting("student.numberPrefix", "MTC"),
  ]);

  const year = new Date().getFullYear();

  // Count students created this year to get the next sequential number
  const startOfYear = new Date(`${year}-01-01T00:00:00.000Z`);
  const endOfYear   = new Date(`${year + 1}-01-01T00:00:00.000Z`);
  const count = await db.user.count({
    where: {
      role: "STUDENT",
      studentNumber: { not: null },
      createdAt: { gte: startOfYear, lt: endOfYear },
    },
  });

  // Parse padding from pattern e.g. {SEQ:5}
  const seqMatch = pattern.match(/\{SEQ:(\d+)\}/);
  const padLen   = seqMatch ? parseInt(seqMatch[1], 10) : 5;
  const seq      = String(count + 1).padStart(padLen, "0");

  return pattern
    .replace("{PREFIX}", prefix)
    .replace("{YYYY}",   String(year))
    .replace(/\{SEQ:\d+\}/, seq);
}
