import { describe, expect, it } from "vitest";
import { formatStudentNumber } from "@/lib/students/number-format";

describe("student number format", () => {
  it("formats student numbers with the configured prefix, year, and sequence width", () => {
    expect(formatStudentNumber("{PREFIX}-{YYYY}-{SEQ:5}", "MTC", 2026, 1)).toBe(
      "MTC-2026-00001",
    );
    expect(
      formatStudentNumber("{PREFIX}-{YYYY}-{SEQ:4}", "BHC", 2027, 42),
    ).toBe("BHC-2027-0042");
  });
});
