import { describe, expect, it } from "vitest";
import { teachingCourseWhere } from "@/lib/teaching/scope";

describe("teaching course scope", () => {
  it("includes a user's primary and co-instructor course assignments", () => {
    expect(teachingCourseWhere("staff_1")).toEqual({
      OR: [
        { tutorId: "staff_1" },
        { coTutors: { some: { tutorId: "staff_1" } } },
      ],
    });
  });

  it("never creates an unscoped course query", () => {
    const scope = teachingCourseWhere("staff_2");
    expect(scope.OR).toHaveLength(2);
    expect(JSON.stringify(scope)).not.toContain("OR: []");
  });
});
