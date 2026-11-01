/**
 * Student registration number generator.
 *
 * Format: {YYYY}/{COURSE_CODE}/{SEQ:3}
 * Example: 2026/MHC/005
 *
 * The sequence is per-course per-year, stored in the `student_number_sequences`
 * table and incremented atomically in the database.
 *
 * The old unified MTC-YYYY-NNNNN format has been cancelled by remarks.md section 1.
 */

/**
 * Formats a registration number from its components.
 *
 * @param courseCode  Short course code, e.g. "MHC". Max 4 chars, uppercase.
 * @param year        Academic year, e.g. 2026.
 * @param sequence    Sequence number within the course+year, e.g. 5 -> "005".
 */
export function formatStudentNumber(
  courseCode: string,
  year: number,
  sequence: number,
): string {
  return `${year}/${courseCode.toUpperCase()}/${String(sequence).padStart(3, "0")}`;
}

/**
 * Course codes for the 7 real flyer courses.
 * These codes are editable per course in the database (Course.courseCode).
 * This map is the canonical default; the database is the authoritative source.
 */
export const COURSE_CODES: Record<string, string> = {
  "medical-home-caregiver":         "MHC",
  "basic-home-caregiver":           "BHC",
  "babysitting-childcare-safety":   "BCS",
  "mental-health-support-advocacy": "MHA",
  "care-older-persons-disability":  "COP",
  "basic-life-support-first-aid":   "BLS",
  "advanced-life-support":          "ALS",
};
