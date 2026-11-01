/**
 * Student registration number tests.
 *
 * Format: {YYYY}/{COURSECODE}/{SEQ:3}  (e.g. 2026/MHC/005)
 * The old MTC-YYYY-NNNNN pattern has been cancelled by remarks.md section 1.
 */

import { describe, expect, it } from "vitest";
import { formatStudentNumber, COURSE_CODES } from "@/lib/students/number-format";

describe("student number format", () => {
  it("formats a registration number in the per-course per-year format", () => {
    expect(formatStudentNumber("MHC", 2026, 5)).toBe("2026/MHC/005");
    expect(formatStudentNumber("BHC", 2026, 1)).toBe("2026/BHC/001");
    expect(formatStudentNumber("ALS", 2027, 42)).toBe("2027/ALS/042");
    expect(formatStudentNumber("COP", 2026, 100)).toBe("2026/COP/100");
  });

  it("uppercases the course code", () => {
    expect(formatStudentNumber("mhc", 2026, 3)).toBe("2026/MHC/003");
  });

  it("pads the sequence to 3 digits", () => {
    expect(formatStudentNumber("BLS", 2026, 1)).toBe("2026/BLS/001");
    expect(formatStudentNumber("BLS", 2026, 99)).toBe("2026/BLS/099");
    // Sequences above 999 are allowed (no truncation)
    expect(formatStudentNumber("BLS", 2026, 1000)).toBe("2026/BLS/1000");
  });

  it("has course codes for all 7 flyer courses", () => {
    expect(COURSE_CODES["medical-home-caregiver"]).toBe("MHC");
    expect(COURSE_CODES["basic-home-caregiver"]).toBe("BHC");
    expect(COURSE_CODES["babysitting-childcare-safety"]).toBe("BCS");
    expect(COURSE_CODES["mental-health-support-advocacy"]).toBe("MHA");
    expect(COURSE_CODES["care-older-persons-disability"]).toBe("COP");
    expect(COURSE_CODES["basic-life-support-first-aid"]).toBe("BLS");
    expect(COURSE_CODES["advanced-life-support"]).toBe("ALS");
    expect(Object.keys(COURSE_CODES)).toHaveLength(7);
  });

  it("formats registration numbers using each course code", () => {
    for (const code of Object.values(COURSE_CODES)) {
      const result = formatStudentNumber(code, 2026, 1);
      expect(result).toMatch(/^2026\/[A-Z]{2,4}\/001$/);
    }
  });
});
