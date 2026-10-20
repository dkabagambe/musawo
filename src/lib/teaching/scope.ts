import { db } from "@/lib/db";

/** Course assignment scope shared by instructor and supporting staff workflows. */
export function teachingCourseWhere(userId: string) {
  return {
    OR: [
      { tutorId: userId },
      { coTutors: { some: { tutorId: userId } } },
    ],
  };
}

export async function canAccessTeachingCourse(courseId: string, userId: string) {
  const course = await db.course.findFirst({
    where: { id: courseId, ...teachingCourseWhere(userId) },
    select: { id: true },
  });
  return Boolean(course);
}

export function teachingCourseRelationWhere(userId: string) {
  return teachingCourseWhere(userId);
}
