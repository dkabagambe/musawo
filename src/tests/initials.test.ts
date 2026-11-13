import { describe, it, expect } from "vitest";
import { getInitials } from "@/lib/utils/initials";

describe("getInitials", () => {
  it("should strip Dr. title", () => {
    expect(getInitials("Dr. Esther Achen")).toBe("EA");
    expect(getInitials("Dr Esther Achen")).toBe("EA");
  });

  it("should strip Prof. title", () => {
    expect(getInitials("Prof. John Smith")).toBe("JS");
    expect(getInitials("Professor Alice Wonder")).toBe("AW");
  });

  it("should strip Eng. title", () => {
    expect(getInitials("Eng. Moses Kabaka")).toBe("MK");
    expect(getInitials("Engineer Sarah Lee")).toBe("SL");
  });

  it("should strip Hon. title", () => {
    expect(getInitials("Hon. David Okello")).toBe("DO");
    expect(getInitials("Honorable Jane Doe")).toBe("JD");
  });

  it("should strip multiple common titles", () => {
    expect(getInitials("Mr. Peter Pan")).toBe("PP");
    expect(getInitials("Mrs. Mary Jane")).toBe("MJ");
    expect(getInitials("Ms. Lisa Brown")).toBe("LB");
    expect(getInitials("Miss Emily White")).toBe("EW");
    expect(getInitials("Rev. Thomas Gray")).toBe("TG");
    expect(getInitials("Reverend Mark King")).toBe("MK");
  });

  it("should handle names without titles", () => {
    expect(getInitials("Joel Mirembe")).toBe("JM");
    expect(getInitials("Alice Smith")).toBe("AS");
  });

  it("should handle single names", () => {
    expect(getInitials("Madonna")).toBe("MA");
    expect(getInitials("Prince")).toBe("PR");
  });

  it("should handle three-part names", () => {
    expect(getInitials("John Paul Smith")).toBe("JS");
  });

  it("should handle empty or invalid input", () => {
    expect(getInitials("")).toBe("?");
    expect(getInitials("   ")).toBe("?");
  });

  it("should be case-insensitive for titles", () => {
    expect(getInitials("dr. esther achen")).toBe("EA");
    expect(getInitials("PROF. JOHN SMITH")).toBe("JS");
  });

  it("should handle title-only input", () => {
    // If someone is named just "Dr." with no space, treat it as a name
    expect(getInitials("Dr.")).toBe("DR");
    // But "Dr. " (with space and nothing after) should return ?
    expect(getInitials("Dr. ")).toBe("?");
  });
});
